"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { type Address } from 'viem';
import { Identity, Name } from '@coinbase/onchainkit/identity';

// Schemat EAS dla umiejętności
const SKILLS_SCHEMA_UID = "0x7889a09fb295b0a0c63a3d7903c4f00f7896cca4fa64d2c1313f8547390b7d39";
const EAS_GRAPHQL_URL = "https://base.easscan.org/graphql";

// Typy danych
export type SkillAttestation = {
  attestationUid: string;
  transactionHash: string;
  attester: Address;
  recipient: Address;
  skillName: string;
  category: string;
  level: string;
  timestamp: string;
  endorsements: number;
};

export type SkillStats = {
  skillName: string;
  category: string;
  totalEndorsements: number;
  topUsers: {
    address: Address;
    level: string;
    endorsements: number;
  }[];
};

// Context dla tablicy umiejętności
type SkillBoardContextType = {
  topSkills: SkillStats[];
  userSkills: SkillAttestation[];
  isLoading: boolean;
  refreshSkills: () => Promise<void>;
  getSkillsByUser: (address: Address) => Promise<SkillAttestation[]>;
  getTopSkillsInCategory: (category: string) => SkillStats[];
};

const emptySkillBoardContext = {} as SkillBoardContextType;
export const SkillBoardContext = createContext<SkillBoardContextType>(emptySkillBoardContext);

export function useSkillBoard() {
  const context = useContext(SkillBoardContext);
  if (context === emptySkillBoardContext) {
    throw new Error('useSkillBoard must be used within a SkillBoardProvider');
  }
  return context;
}

// Funkcja pobierająca dane z API
async function fetchSkillAttestations() {
  try {
    // Pobieranie popularnych umiejętności z API
    const response = await fetch('/api/skills?popular=true&limit=100');
    
    if (!response.ok) {
      throw new Error(`Error fetching skills: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }
    
    // Konwersja z formatu API na format SkillAttestation
    const attestations: SkillAttestation[] = data.skills.map((skill: any) => ({
      attestationUid: skill.attestationUid || `skill-${skill.name}`,
      transactionHash: skill.txid || '',
      attester: skill.attester || '0x0000000000000000000000000000000000000000',
      recipient: skill.recipient || '0x0000000000000000000000000000000000000000',
      skillName: skill.name,
      category: skill.category,
      level: skill.level || 'Intermediate',
      timestamp: skill.timestamp || new Date().toISOString(),
      endorsements: skill.endorsements
    }));
    
    return attestations;
  } catch (error) {
    console.error("Error fetching attestations:", error);
    return [];
  }
}

// Agregacja umiejętności po nazwach i kategoriach
function aggregateSkillStats(attestations: SkillAttestation[]): SkillStats[] {
  const skillsMap = new Map<string, SkillStats>();
  
  // Jawnie typujemy, aby upewnić się, że TypeScript rozumie typ atestacji
  const typedAttestations: SkillAttestation[] = attestations;

  typedAttestations.forEach((att) => {
    const key = `${att.skillName}-${att.category}`;
    
    if (!skillsMap.has(key)) {
      skillsMap.set(key, {
        skillName: att.skillName,
        category: att.category,
        totalEndorsements: 0,
        topUsers: []
      });
    }

    const skillStat = skillsMap.get(key)!;
    skillStat.totalEndorsements += 1;

    // Aktualizuj topUsers
    const userIndex = skillStat.topUsers.findIndex(user => user.address === att.recipient);
    if (userIndex >= 0) {
      skillStat.topUsers[userIndex].endorsements += 1;
    } else {
      skillStat.topUsers.push({
        address: att.recipient,
        level: att.level,
        endorsements: 1
      });
    }

    // Sortuj topUsers po liczbie endorsements
    skillStat.topUsers.sort((a, b) => b.endorsements - a.endorsements);
    
    // Ogranicz listę do top 5
    if (skillStat.topUsers.length > 5) {
      skillStat.topUsers = skillStat.topUsers.slice(0, 5);
    }
  });

  // Konwersja mapy na tablicę i sortowanie po całkowitej liczbie endorsements
  return Array.from(skillsMap.values())
    .sort((a, b) => b.totalEndorsements - a.totalEndorsements);
}

// Provider dla tablicy umiejętności
export function SkillBoardProvider({ children }: { children: React.ReactNode }) {
  const [topSkills, setTopSkills] = useState<SkillStats[]>([]);
  const [userSkills, setUserSkills] = useState<SkillAttestation[]>([]);
  const [allAttestations, setAllAttestations] = useState<SkillAttestation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();

  // Pobieranie umiejętności dla konkretnego użytkownika
  const getSkillsByUser = useCallback(async (userAddress: Address): Promise<SkillAttestation[]> => {
    try {
      const response = await fetch(`/api/skills?address=${userAddress}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching user skills: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      // Konwersja z formatu API na format SkillAttestation
      return data.skills.map((skill: any) => ({
        attestationUid: skill.attestationUid || `skill-${skill.name}`,
        transactionHash: skill.txid || '',
        attester: skill.attester || '0x0000000000000000000000000000000000000000',
        recipient: userAddress,
        skillName: skill.name,
        category: skill.category,
        level: skill.level || 'Intermediate',
        timestamp: skill.timestamp || new Date().toISOString(),
        endorsements: skill.endorsements
      }));
    } catch (error) {
      console.error("Error fetching user skills:", error);
      return [];
    }
  }, []);

  // Pobieranie danych
  const refreshSkills = useCallback(async () => {
    setIsLoading(true);
    try {
      // Pobierz wszystkie umiejętności
      const attestations = await fetchSkillAttestations();
      setAllAttestations(attestations);
      
      // Agreguj statystyki umiejętności
      const aggregatedSkills = aggregateSkillStats(attestations);
      setTopSkills(aggregatedSkills);
      
      // Jeśli użytkownik jest zalogowany, pobierz jego umiejętności
      if (address) {
        const skills = await getSkillsByUser(address);
        setUserSkills(skills);
      }
    } catch (error) {
      console.error("Error refreshing skills:", error);
    } finally {
      setIsLoading(false);
    }
  }, [address, getSkillsByUser]);

  // Pobieranie najlepszych umiejętności w danej kategorii
  const getTopSkillsInCategory = useCallback((category: string): SkillStats[] => {
    return topSkills.filter(skill => 
      skill.category.toLowerCase() === category.toLowerCase()
    );
  }, [topSkills]);

  // Pobieranie danych przy pierwszym renderze
  useEffect(() => {
    refreshSkills();
  }, [refreshSkills]);

  // Wartość context
  const value = {
    topSkills,
    userSkills,
    isLoading,
    refreshSkills,
    getSkillsByUser,
    getTopSkillsInCategory
  };

  return (
    <SkillBoardContext.Provider value={value}>
      {children}
    </SkillBoardContext.Provider>
  );
}

// Komponent tablicy najlepszych umiejętności
export function TopSkillsLeaderboard() {
  const { topSkills, isLoading } = useSkillBoard();
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <h3 className="text-lg font-bold mb-3" style={{ fontFamily: "monospace" }}>Top Skills</h3>
        <div className="flex justify-center py-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold" style={{ fontFamily: "monospace" }}>Top Skills</h3>
        <div className="text-xs text-gray-500 flex items-center">
          <span className="mr-1">Endorsements:</span>
          <span className="text-blue-600 font-medium">Blue</span>
        </div>
      </div>
      
      {topSkills.length === 0 ? (
        <p className="text-gray-500 text-center py-4 text-sm">No skills attestations found</p>
      ) : (
        <div className="space-y-3">
          {topSkills.slice(0, 5).map((skill, index) => (
            <div key={index} className="border border-gray-100 rounded p-3 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm" style={{ fontFamily: "monospace" }}>{skill.skillName}</h4>
                  <p className="text-xs text-gray-500">{skill.category}</p>
                </div>
                <div className="text-blue-600 font-mono font-medium">
                  {skill.totalEndorsements}
                </div>
              </div>
              
              {skill.topUsers.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Top users:</p>
                  <div className="space-y-1">
                    {skill.topUsers.slice(0, 3).map((user, userIndex) => (
                      <div key={userIndex} className="flex justify-between text-xs">
                        <Identity address={user.address} className="!bg-inherit truncate max-w-[150px]">
                          <Name className="text-xs font-medium" />
                        </Identity>
                        <span className="text-blue-600">{user.endorsements}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Komponent umiejętności użytkownika
export function UserSkillsList() {
  const { userSkills, isLoading, refreshSkills } = useSkillBoard();
  const { address } = useAccount();
  
  if (!address) {
    return (
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <h3 className="text-lg font-bold mb-3" style={{ fontFamily: "monospace" }}>My Skills</h3>
        <p className="text-gray-500 text-center py-4 text-sm">Connect your wallet to view your skills</p>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <h3 className="text-lg font-bold mb-3" style={{ fontFamily: "monospace" }}>My Skills</h3>
        <div className="flex justify-center py-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold" style={{ fontFamily: "monospace" }}>My Skills</h3>
        <button 
          onClick={() => refreshSkills()}
          className="bg-blue-50 text-blue-600 p-1.5 rounded-full text-xs"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      {userSkills.length === 0 ? (
        <p className="text-gray-500 text-center py-4 text-sm">You have no skills attestations yet</p>
      ) : (
        <div className="space-y-2">
          {userSkills.map((skill, index) => (
            <div key={index} className="border border-gray-100 rounded p-2 bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-sm" style={{ fontFamily: "monospace" }}>{skill.skillName}</h4>
                  <p className="text-xs text-gray-500">{skill.category} • {skill.level}</p>
                </div>
                <div className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-xs font-mono font-medium">
                  {skill.endorsements}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SkillBoardProvider; 
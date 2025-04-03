"use client";

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Identity, Name, Address, Avatar } from '@coinbase/onchainkit/identity';
import { useOpenUrl, useNotification } from '@coinbase/onchainkit/minikit';
import { CertifySkillMilestone } from './skill-attestation';
import { useSkills } from './skill-board-provider';
import { UserSkill } from '@/lib/skills';

// Typy danych
type Skill = {
  name: string;
  category: string;
  level: string;
  attestationUid: string;
  endorsements: number;
};

type UserStats = {
  totalSkills: number;
  totalEndorsements: number;
  topSkill: {
    name: string;
    endorsements: number;
    category: string;
  } | null;
  skillsByCategory: Record<string, number>;
  expertiseLevel: number;
};

type User = {
  address: string;
  name?: string;
  totalEndorsements: number;
};

// Przykładowe dane użytkownika - zastępują fetchowane dane
const MOCK_SKILLS: Skill[] = [
  { name: "JavaScript", category: "Programming", level: "Expert", attestationUid: "0x123", endorsements: 12 },
  { name: "React", category: "Programming", level: "Advanced", attestationUid: "0x456", endorsements: 8 },
  { name: "Solidity", category: "Blockchain", level: "Intermediate", attestationUid: "0x789", endorsements: 5 },
  { name: "UI/UX Design", category: "Design", level: "Beginner", attestationUid: "0xabc", endorsements: 2 },
];

const MOCK_STATS: UserStats = {
  totalSkills: 4,
  totalEndorsements: 27,
  topSkill: {
    name: "JavaScript",
    endorsements: 12,
    category: "Programming"
  },
  skillsByCategory: {
    "Programming": 2,
    "Blockchain": 1,
    "Design": 1
  },
  expertiseLevel: 75
};

// Przykładowi użytkownicy dla wyszukiwarki
const MOCK_USERS: User[] = [
  { address: "0xbB68Fc6d7469899dC8eb79Ad2895B16Ec36dF5Fe", name: "dev.eth", totalEndorsements: 42 },
  { address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", name: "builder.eth", totalEndorsements: 38 },
  { address: "0x5Bc4D192A0A72f953f5cf9A1E43B686296835636", name: "coder.eth", totalEndorsements: 31 },
  { address: "0xA742D48B5Cd0e344CC3AB3E5E0F9C53eC188F17f", name: "web3dev.eth", totalEndorsements: 27 },
];

interface UserProfileProps {
  onAddSkillClick?: () => void;
}

export default function UserProfile({ onAddSkillClick }: UserProfileProps) {
  const { address } = useAccount();
  const openUrl = useOpenUrl();
  const sendNotification = useNotification();
  const { userSkills, allSkills, loading } = useSkills();
  
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Pobieranie umiejętności i statystyk użytkownika - symulacja
  useEffect(() => {    
    setIsLoading(true);
    setError('');
    
    // Symulacja opóźnienia sieciowego
    const timer = setTimeout(() => {
      // Ustawiamy przykładowe dane
      setSkills(MOCK_SKILLS);
      setStats(MOCK_STATS);
      setIsLoading(false);
    }, 600);
    
    return () => clearTimeout(timer);
  }, [address]);

  // Wyszukiwanie użytkowników - będzie używać GraphQL
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    // Symulacja wywołania GraphQL
    setTimeout(() => {
      const results = MOCK_USERS.filter(user => 
        user.address.toLowerCase().includes(query.toLowerCase()) || 
        (user.name && user.name.toLowerCase().includes(query.toLowerCase()))
      );
      setSearchResults(results);
      setIsSearching(false);
      setShowSearchResults(true);
    }, 300);
    
    // Prawdziwe wywołanie GraphQL będzie wyglądać podobnie:
    /*
    try {
      const result = await client.query({
        query: gql`
          query SearchUsers($query: String!) {
            users(where: { 
              or: [
                { address_contains_nocase: $query },
                { name_contains_nocase: $query }
              ]
            }) {
              address
              name
              totalEndorsements
            }
          }
        `,
        variables: { query }
      });
      
      setSearchResults(result.data.users);
    } catch (err) {
      console.error("Error searching users:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
    */
  };

  // Obsługa zmiany w polu wyszukiwania
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  // Funkcja do udostępniania profilu
  const shareProfile = async () => {
    if (!address) return;
    
    // Tworzenie URL profilu
    const profileUrl = `${window.location.origin}/profile/${address}`;
    
    // Kopiowanie do schowka
    await navigator.clipboard.writeText(profileUrl);
    
    // Powiadomienie o skopiowaniu
    await sendNotification({
      title: "Profile Shared",
      body: "Profile URL copied to clipboard"
    });
  };

  // Obliczanie statystyk
  const totalSkills = userSkills.length;
  const totalEndorsements = userSkills.reduce((sum, skill) => sum + skill.endorsements, 0);
  
  // Znajdź umiejętność z największą liczbą endorsementów
  const topSkill = userSkills.length > 0 
    ? userSkills.reduce((prev, current) => (prev.endorsements > current.endorsements) ? prev : current) 
    : null;
  
  // Pobierz pełną informację o najlepszej umiejętności
  const topSkillInfo = topSkill 
    ? allSkills.find(s => s.id === topSkill.skillId) 
    : null;

  if (!address) {
    return (
      <div className="rounded-lg bg-blue-50 p-6 text-center">
        <div className="mb-4 text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-gray-600 mb-4">
          Connect your wallet to view your profile and manage your skills.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-4 text-center">Loading profile...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Nagłówek profilu */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 rounded-full overflow-hidden" style={{ width: '60px', height: '60px' }}>
            <Avatar address={address} />
          </div>
          <div className="flex-grow">
            <Identity address={address} className="!bg-inherit p-0" hasCopyAddressOnClick>
              <Name className="text-2xl font-bold block mb-1" />
            </Identity>
            <Address address={address} className="text-sm text-gray-500" />
          </div>
        </div>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">Skills</p>
            <p className="text-2xl font-bold">{totalSkills}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">Endorsements</p>
            <p className="text-2xl font-bold">{totalEndorsements}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <p className="text-gray-500 text-sm">Top Skill</p>
            <p className="text-2xl font-bold">{topSkillInfo?.name || 'None'}</p>
          </div>
        </div>
      </div>

      {/* Przycisk dodawania umiejętności */}
      {userSkills.length === 0 ? (
        <div className="rounded-lg bg-blue-50 p-6 text-center">
          <div className="mb-4 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">No Skills Yet</h2>
          <p className="text-gray-600 mb-4">
            Add your first skill to start building your profile.
          </p>
          <button
            onClick={onAddSkillClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Your First Skill
          </button>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={onAddSkillClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Another Skill
          </button>
        </div>
      )}
    </div>
  );
}

export function UserSkillsList({ profileId, showEndorse = false }: { profileId?: string, showEndorse?: boolean }) {
  const { address } = useAccount();
  const { userSkills, allSkills, endorseSkill, loading } = useSkills();
  const skills = userSkills.filter(skill => !profileId || skill.skillId === profileId);

  const handleEndorse = async (skillId: string) => {
    await endorseSkill(skillId, profileId || '');
  };

  if (loading) {
    return <div className="py-4">Loading skills...</div>;
  }

  if (skills.length === 0) {
    return <div className="py-4 text-gray-500">No skills added yet.</div>;
  }

  return (
    <div className="space-y-4">
      {skills.map(userSkill => {
        const skill = allSkills.find(s => s.id === userSkill.skillId);
        if (!skill) return null;
        
        return (
          <div key={userSkill.skillId} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900">{skill.name}</h3>
                <p className="text-sm text-gray-500">{skill.description}</p>
                <div className="mt-2 flex items-center space-x-1">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {userSkill.endorsements} endorsements
                  </span>
                </div>
              </div>
              {showEndorse && address && profileId && address !== profileId && (
                <button
                  onClick={() => handleEndorse(userSkill.skillId)}
                  className="bg-blue-600 text-white text-xs px-3 py-1 rounded-md hover:bg-blue-700"
                >
                  Endorse
                </button>
              )}
            </div>
            
            {/* Dodaj możliwość certyfikacji umiejętności po osiągnięciu 10 endorsementów */}
            {address === profileId && userSkill.endorsements >= 10 && (
              <CertifySkillMilestone 
                skillName={skill.name}
                endorsementCount={userSkill.endorsements}
                skillId={userSkill.skillId}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
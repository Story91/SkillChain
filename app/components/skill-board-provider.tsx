import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { Skill, UserSkill } from '@/lib/skills';

// Definicja typów dla kontekstu
interface SkillContextType {
  // Wszystkie umiejętności
  allSkills: Skill[];
  // Umiejętności użytkownika
  userSkills: UserSkill[];
  // Najlepsze umiejętności (ranking)
  topSkills: {skill: Skill, score: number}[];
  // Ładowanie
  loading: boolean;
  // Funkcje
  createSkill: (name: string, description: string) => Promise<Skill | null>;
  addSkillToUser: (skillId: string) => Promise<boolean>;
  endorseSkill: (skillId: string, skilledAddress: string) => Promise<boolean>;
  refreshSkills: () => Promise<void>;
}

// Utworzenie kontekstu
const SkillContext = createContext<SkillContextType | undefined>(undefined);

// Hook do korzystania z kontekstu
export function useSkills() {
  const context = useContext(SkillContext);
  if (context === undefined) {
    throw new Error('useSkills must be used within a SkillProvider');
  }
  return context;
}

// Dostawca kontekstu
export default function SkillProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [topSkills, setTopSkills] = useState<{skill: Skill, score: number}[]>([]);
  const [loading, setLoading] = useState(true);

  // Pobieranie danych
  const fetchAllSkills = async () => {
    try {
      const response = await fetch('/api/skills');
      const data = await response.json();
      if (data.skills) {
        setAllSkills(data.skills);
      }
    } catch (error) {
      console.error('Error fetching all skills:', error);
    }
  };

  const fetchUserSkills = async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/skills?address=${address}`);
      const data = await response.json();
      if (data.skills) {
        setUserSkills(data.skills);
      }
    } catch (error) {
      console.error('Error fetching user skills:', error);
    }
  };

  const fetchTopSkills = async () => {
    try {
      const response = await fetch('/api/skills?top=10');
      const data = await response.json();
      if (data.skills) {
        setTopSkills(data.skills);
      }
    } catch (error) {
      console.error('Error fetching top skills:', error);
    }
  };

  // Odświeżanie wszystkich danych
  const refreshSkills = async () => {
    setLoading(true);
    await Promise.all([
      fetchAllSkills(),
      fetchUserSkills(),
      fetchTopSkills()
    ]);
    setLoading(false);
  };

  // Inicjalizacja przy montowaniu
  useEffect(() => {
    refreshSkills();
  }, []);

  // Odświeżanie po zmianie adresu
  useEffect(() => {
    fetchUserSkills();
  }, [address]);

  // Tworzenie umiejętności
  const createSkill = async (name: string, description: string): Promise<Skill | null> => {
    if (!address) return null;

    try {
      console.log(`[createSkill] Próba utworzenia: ${name}`);
      
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description,
          createdBy: address
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[createSkill] Błąd odpowiedzi:', response.status, errorData);
        throw new Error(`Server responded with ${response.status}: ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('[createSkill] Odpowiedź:', data);
      
      if (data.skill) {
        await refreshSkills();
        return data.skill;
      }
      
      console.error('[createSkill] Brak obiektu skill w odpowiedzi');
      return null;
    } catch (error) {
      console.error('[createSkill] Błąd:', error);
      throw error;
    }
  };

  // Dodawanie umiejętności do użytkownika
  const addSkillToUser = async (skillId: string): Promise<boolean> => {
    if (!address) return false;

    try {
      const response = await fetch('/api/skills', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'add',
          address,
          skillId
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchUserSkills();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding skill to user:', error);
      return false;
    }
  };

  // Endorsowanie umiejętności
  const endorseSkill = async (skillId: string, skilledAddress: string): Promise<boolean> => {
    if (!address) return false;

    try {
      const response = await fetch('/api/skills', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'endorse',
          address,
          skillId,
          skilledAddress
        })
      });

      const data = await response.json();
      if (data.success) {
        await refreshSkills();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error endorsing skill:', error);
      return false;
    }
  };

  const value = {
    allSkills,
    userSkills,
    topSkills,
    loading,
    createSkill,
    addSkillToUser,
    endorseSkill,
    refreshSkills
  };

  return (
    <SkillContext.Provider value={value}>
      {children}
    </SkillContext.Provider>
  );
}

// Komponent do wyświetlania listy umiejętności użytkownika
export function UserSkillsList() {
  const { userSkills, allSkills, loading } = useSkills();
  const { address } = useAccount();

  if (!address) {
    return (
      <div className="rounded-lg bg-gray-100 p-4 text-gray-500">
        Connect your wallet to view your skills
      </div>
    );
  }

  if (loading) {
    return <div className="p-4 text-center">Loading skills...</div>;
  }

  if (userSkills.length === 0) {
    return (
      <div className="rounded-lg bg-gray-100 p-4 text-gray-500">
        No skills found. Add some skills to get started!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Your Skills</h2>
      <div className="space-y-2">
        {userSkills.map((userSkill) => {
          const skill = allSkills.find(s => s.id === userSkill.skillId);
          return (
            <div 
              key={userSkill.skillId} 
              className="rounded-lg bg-white p-4 shadow-sm border border-gray-200"
            >
              <div className="flex justify-between">
                <div>
                  <h3 className="font-medium">{skill?.name || 'Unknown Skill'}</h3>
                  <p className="text-sm text-gray-500">{skill?.description || ''}</p>
                </div>
                <div className="text-blue-600 font-medium">
                  {userSkill.endorsements} endorsements
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Komponent do wyświetlania najlepszych umiejętności
export function TopSkillsLeaderboard() {
  const { topSkills, loading } = useSkills();

  if (loading) {
    return <div className="p-4 text-center">Loading leaderboard...</div>;
  }

  if (topSkills.length === 0) {
    return (
      <div className="rounded-lg bg-gray-100 p-4 text-gray-500">
        No skills found in the leaderboard.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Top Skills Leaderboard</h2>
      <div className="space-y-2">
        {topSkills.map(({ skill, score }, index) => (
          <div 
            key={skill.id} 
            className="rounded-lg bg-white p-4 shadow-sm border border-gray-200"
          >
            <div className="flex justify-between">
              <div>
                <h3 className="font-medium">
                  <span className="text-blue-600 mr-2">#{index + 1}</span>
                  {skill.name}
                </h3>
                <p className="text-sm text-gray-500">{skill.description}</p>
              </div>
              <div className="text-blue-600 font-medium">
                {score} endorsements
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
"use client";

import React, { useState } from 'react';
import { useSkills } from './skill-board-provider';
import { useAccount } from 'wagmi';

interface ExploreSkillsProps {
  onAddSkillClick?: () => void;
}

export default function ExploreSkills({ onAddSkillClick }: ExploreSkillsProps) {
  const { allSkills, endorseSkill, loading } = useSkills();
  const { address } = useAccount();
  const [searchQuery, setSearchQuery] = useState('');
  const [endorsingSkill, setEndorsingSkill] = useState<string | null>(null);
  
  // Filtrowanie umiejętności
  const filteredSkills = allSkills.filter(skill => 
    skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Obsługa endorsowania
  const handleEndorse = async (skillId: string, createdBy: string) => {
    if (!address) return;
    
    setEndorsingSkill(skillId);
    try {
      await endorseSkill(skillId, createdBy);
    } catch (error) {
      console.error('Error endorsing skill:', error);
    } finally {
      setEndorsingSkill(null);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading skills...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Explore Skills</h2>
        <button
          onClick={onAddSkillClick}
          className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
        >
          + Add Skill
        </button>
      </div>

      {/* Wyszukiwarka */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search skills..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 absolute right-3 top-2.5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Lista umiejętności */}
      {filteredSkills.length === 0 ? (
        <div className="text-gray-500 text-center py-4">
          No skills found. Try a different search or add a new skill!
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSkills.map((skill) => (
            <div
              key={skill.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{skill.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{skill.description}</p>
                </div>
                {address && address !== skill.createdBy && (
                  <button
                    onClick={() => handleEndorse(skill.id, skill.createdBy)}
                    disabled={endorsingSkill === skill.id}
                    className={`px-3 py-1 text-sm rounded-md ${
                      endorsingSkill === skill.id
                        ? 'bg-gray-300 text-gray-600'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    } transition-colors`}
                  >
                    {endorsingSkill === skill.id ? 'Endorsing...' : 'Endorse'}
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span className="truncate">Added by: {formatAddress(skill.createdBy)}</span>
                <span className="mx-2">•</span>
                <span>{new Date(skill.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper do formatowania adresu
function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
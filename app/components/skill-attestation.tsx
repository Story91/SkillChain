"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Transaction, TransactionButton, TransactionToast, TransactionToastAction, TransactionToastIcon, TransactionToastLabel } from '@coinbase/onchainkit/transaction';
import { useNotification } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';
import { encodeAbiParameters, type Address } from 'viem';
import { useSkills } from './skill-board-provider';
import { EAS_CONTRACT, SKILLS_SCHEMA_UID, hasSkillMilestoneAttestation } from '@/lib/skill-attestation';

// ABI dla kontraktu EAS
const easABI = [
  {
    name: "attest",
    type: "function" as const,
    stateMutability: "payable" as const,
    inputs: [
      {
        name: "request",
        type: "tuple",
        components: [
          { name: "schema", type: "bytes32" },
          {
            name: "data",
            type: "tuple",
            components: [
              { name: "recipient", type: "address" },
              { name: "expirationTime", type: "uint64" },
              { name: "revocable", type: "bool" },
              { name: "refUID", type: "bytes32" },
              { name: "data", type: "bytes" },
              { name: "value", type: "uint256" },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
];

// Typy dla umiejętności
type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

interface SkillData {
  name: string;
  category: string;
  level: SkillLevel;
}

interface AddSkillProps {
  onSuccess?: () => void;
}

export function AddSkill({ onSuccess }: AddSkillProps) {
  const { createSkill, allSkills, addSkillToUser } = useSkills();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<'create' | 'existing'>('create');

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) {
      setError('Name and description are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await createSkill(name, description);
      if (result) {
        setSuccess(true);
        setName('');
        setDescription('');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError('Failed to create skill');
      }
    } catch (error) {
      setError('An error occurred while creating the skill');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExistingSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Please select a skill');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await addSkillToUser(name);
      if (result) {
        setSuccess(true);
        setName('');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError('Failed to add skill');
      }
    } catch (error) {
      setError('An error occurred while adding the skill');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`px-4 py-2 rounded-lg ${
            mode === 'create'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          Create New Skill
        </button>
        <button
          type="button"
          onClick={() => setMode('existing')}
          className={`px-4 py-2 rounded-lg ${
            mode === 'existing'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          Add Existing Skill
        </button>
      </div>

      {mode === 'create' ? (
        <form onSubmit={handleCreateSkill} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Skill Name
            </label>
            <input
              type="text"
              id="name"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            ></textarea>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && (
            <p className="text-green-600 text-sm">Skill created successfully!</p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Skill'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleAddExistingSkill} className="space-y-4">
          <div>
            <label
              htmlFor="existingSkill"
              className="block text-sm font-medium text-gray-700"
            >
              Select Skill
            </label>
            <select
              id="existingSkill"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Select a skill --</option>
              {allSkills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && (
            <p className="text-green-600 text-sm">Skill added successfully!</p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Skill'}
          </button>
        </form>
      )}
    </div>
  );
}

// Komponent do zapisywania osiągnięcia na blockchain po osiągnięciu 10 endorsementów
export function CertifySkillMilestone({ 
  skillName, 
  endorsementCount, 
  skillId 
}: { 
  skillName: string;
  endorsementCount: number;
  skillId: string;
}) {
  const { address } = useAccount();
  const sendNotification = useNotification();
  const [certified, setCertified] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sprawdzanie, czy osiągnięcie zostało już zapisane
  useEffect(() => {
    async function checkExistingAttestation() {
      if (!address) return;
      
      setLoading(true);
      try {
        const hasAttestation = await hasSkillMilestoneAttestation(
          address as Address,
          skillName,
          endorsementCount
        );
        setCertified(hasAttestation);
      } catch (error) {
        console.error("Error checking attestation:", error);
      } finally {
        setLoading(false);
      }
    }
    
    checkExistingAttestation();
  }, [address, skillName, endorsementCount]);

  // Funkcja obsługująca sukces zapisania osiągnięcia
  const handleAttestationSuccess = useCallback(async () => {
    if (!address) return;

    // Wysyłanie powiadomienia do użytkownika
    await sendNotification({
      title: "Skill Milestone Achieved!",
      body: `Your ${skillName} skill has reached ${endorsementCount} endorsements!`,
    });

    setCertified(true);
  }, [address, sendNotification, skillName, endorsementCount]);

  // Jeśli osiągnięcie zostało już zapisane lub liczba endorsementów jest mniejsza niż 10, nie pokazuj przycisku
  if (loading) {
    return <div className="mt-4 p-4 bg-gray-100 rounded-lg text-gray-600 text-center">Checking attestation status...</div>;
  }
  
  if (certified || endorsementCount < 10) {
    return null;
  }

  return (
    <Transaction
      calls={[{
        address: EAS_CONTRACT as `0x${string}`,
        abi: easABI,
        functionName: "attest",
        args: [
          {
            schema: SKILLS_SCHEMA_UID,
            data: {
              recipient: address as `0x${string}`,
              expirationTime: BigInt(0), // Brak wygaśnięcia
              revocable: false, // Nie można odwołać
              refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
              data: encodeAbiParameters(
                [{ type: "string" }],
                [`${address} achieved ${endorsementCount} endorsements for ${skillName}`]
              ),
              value: BigInt(0),
            },
          },
        ]
      }]}
      onSuccess={handleAttestationSuccess}
      onError={(error) => console.error("Attestation failed:", error)}
    >
      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-medium text-blue-800">Achievement Unlocked!</h3>
        <p className="text-sm text-blue-700 mt-1">
          Congratulations! Your skill "{skillName}" has reached {endorsementCount} endorsements. 
          Record this achievement on-chain!
        </p>
        <TransactionButton 
          text="Record Achievement" 
          className="mt-3 bg-blue-600 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-700 transition-colors w-full"
          successOverride={{
            text: "Achievement Recorded",
            onClick: () => {}
          }}
        />
        <TransactionToast className="mb-4">
          <TransactionToastIcon />
          <TransactionToastLabel />
          <TransactionToastAction />
        </TransactionToast>
      </div>
    </Transaction>
  );
}
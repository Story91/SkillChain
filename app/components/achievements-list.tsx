import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { fetchSkillMilestoneAttestations, type SkillMilestoneAttestation } from '@/lib/skill-attestation';
import { useOpenUrl } from '@coinbase/onchainkit/minikit';

export default function AchievementsList() {
  const { address } = useAccount();
  const [achievements, setAchievements] = useState<SkillMilestoneAttestation[]>([]);
  const [loading, setLoading] = useState(true);
  const openUrl = useOpenUrl();

  useEffect(() => {
    async function loadAchievements() {
      if (!address) {
        setAchievements([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const attestations = await fetchSkillMilestoneAttestations(address);
        setAchievements(attestations);
      } catch (error) {
        console.error("Error fetching achievements:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadAchievements();
  }, [address]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewOnEAS = (txHash: string) => {
    openUrl(`https://base.easscan.org/attestation/tx/${txHash}`);
  };

  if (!address) {
    return (
      <div className="rounded-lg bg-gray-100 p-4 text-gray-500">
        Connect your wallet to view your achievements
      </div>
    );
  }

  if (loading) {
    return <div className="p-4 text-center">Loading achievements...</div>;
  }

  if (achievements.length === 0) {
    return (
      <div className="rounded-lg bg-gray-100 p-4 text-gray-500">
        No achievements found. Reach 10 endorsements in a skill to earn achievements!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Your Blockchain Achievements</h2>
      <div className="space-y-3">
        {achievements.map((achievement) => (
          <div 
            key={achievement.attestationUid} 
            className="rounded-lg bg-white p-4 shadow-sm border border-blue-200"
          >
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div>
                <h3 className="font-medium text-lg">{achievement.skillName}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {achievement.endorsementCount} endorsements on {formatDate(achievement.timestamp)}
                </p>
              </div>
              <button
                onClick={() => handleViewOnEAS(achievement.transactionHash)}
                className="mt-2 md:mt-0 text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on EAS
              </button>
            </div>
            <div className="mt-3 bg-blue-50 rounded-md p-3 text-blue-700 text-sm">
              <span role="img" aria-label="trophy" className="mr-2">🏆</span>
              Achievement: Reached {achievement.endorsementCount} endorsements for {achievement.skillName}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 
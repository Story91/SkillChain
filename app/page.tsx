"use client";

import React, {
  useEffect,
  useState,
  useCallback,
} from "react";
import { useOpenUrl } from "@coinbase/onchainkit/minikit";
import {
  ConnectWallet,
  ConnectWalletText,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Name,
  Identity,
  Avatar,
} from "@coinbase/onchainkit/identity";
import { useAccount } from "wagmi";

import ExploreSkills from './components/explore-skills';
import UserProfile from './components/user-profile';
import { AddSkill } from './components/skill-attestation';
import SkillProvider, { TopSkillsLeaderboard, UserSkillsList } from './components/skill-board-provider';
import AchievementsList from './components/achievements-list';

// Logo aplikacji - styl pixelowy
const SkillchainLogo: React.FC = () => (
  <div className="text-blue-600 text-4xl font-bold tracking-tight">
    <span className="inline-block" style={{ fontFamily: "monospace" }}>SKILL<span className="text-blue-800">CHAIN</span></span>
  </div>
);

// Komponent dla przycisku logowania
function WalletControl() {
  return (
    <Wallet className="[&>div:nth-child(2)]:!opacity-20 md:[&>div:nth-child(2)]:!opacity-100 relative">
      <ConnectWallet className="w-12 h-12 bg-[#0052FF] rounded-full hover:bg-[#0052FF] focus:bg-[#0052FF] cursor-pointer select-none transition-all duration-150 border-[1px] border-[#0052FF] min-w-12 [box-shadow:0_5px_0_0_#002299,0_8px_0_0_#0033cc33]">
        <ConnectWalletText>{""}</ConnectWalletText>
      </ConnectWallet>
      <WalletDropdown className="!z-[100]">
        <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
          <Avatar />
          <Name />
        </Identity>
        <WalletDropdownDisconnect />
      </WalletDropdown>
    </Wallet>
  );
}

// Przyciski nawigacji w stopce
function FooterNavigation({ activeTab, handleTabChange }: { activeTab: string; handleTabChange: (tab: string) => void }) {
  return (
    <div className="w-full flex justify-between items-center px-4 py-3">
      <button
        onClick={() => handleTabChange('explore')}
        className={`flex flex-col items-center flex-1 ${activeTab === 'explore' ? 'text-blue-600' : 'text-gray-500'} hover:text-blue-500 transition-colors`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-xs font-medium">EXPLORE</span>
      </button>
      
      <button
        onClick={() => handleTabChange('profile')}
        className={`flex flex-col items-center flex-1 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-500'} hover:text-blue-500 transition-colors`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-xs font-medium">PROFILE</span>
      </button>
      
      <button
        onClick={() => handleTabChange('achievements')}
        className={`flex flex-col items-center flex-1 ${activeTab === 'achievements' ? 'text-blue-600' : 'text-gray-500'} hover:text-blue-500 transition-colors`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        <span className="text-xs font-medium">ACHIEVEMENTS</span>
      </button>
      
      <button
        onClick={() => handleTabChange('add')}
        className={`flex flex-col items-center flex-1 ${activeTab === 'add' ? 'text-blue-600' : 'text-gray-500'} hover:text-blue-500 transition-colors`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-xs font-medium">ADD</span>
      </button>
    </div>
  );
}

// Komponent ExploreWithLeaderboard rozszerza ExploreSkills o tablicę najlepszych
function ExploreWithLeaderboard({ onAddSkillClick }: { onAddSkillClick?: () => void }) {
  return (
    <div className="space-y-5">
      <ExploreSkills onAddSkillClick={onAddSkillClick} />
      <TopSkillsLeaderboard />
    </div>
  );
}

// Komponent ProfileWithSkills rozszerza UserProfile o listę umiejętności z kontraktu
function ProfileWithSkills({ onAddSkillClick }: { onAddSkillClick?: () => void }) {
  return (
    <div className="space-y-5">
      <UserProfile onAddSkillClick={onAddSkillClick} />
      <UserSkillsList />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('explore');
  const { address } = useAccount();
  const openUrl = useOpenUrl();

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleAddSkillClick = useCallback(() => {
    setActiveTab('add');
  }, []);

  return (
    <SkillProvider>
      <div className="flex flex-col min-h-screen max-h-screen bg-white">
        {/* Header - stały na górze */}
        <header className="w-full bg-white border-b border-gray-200 py-3 px-4 sticky top-0 left-0 right-0 z-30">
          <div className="flex justify-between items-center">
            <SkillchainLogo />
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-500 mr-2">
                {address ? 'LOGOUT' : 'LOGIN'}
              </div>
              <WalletControl />
            </div>
          </div>
        </header>
        
        {/* Główna zawartość - z przewijaniem */}
        <main className="flex-grow w-full overflow-y-auto py-3 px-4 relative">
          {activeTab === 'explore' && <ExploreWithLeaderboard onAddSkillClick={handleAddSkillClick} />}
          {activeTab === 'profile' && <ProfileWithSkills onAddSkillClick={handleAddSkillClick} />}
          {activeTab === 'achievements' && <AchievementsList />}
          {activeTab === 'add' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Add New Skill</h2>
              <AddSkill 
                onSuccess={() => setActiveTab('profile')}
              />
            </div>
          )}
        </main>
        
        {/* Footer - stały na dole */}
        <footer className="w-full bg-white border-t border-gray-200 sticky bottom-0 left-0 right-0 z-20">
          {/* Przyciski nawigacyjne */}
          <FooterNavigation activeTab={activeTab} handleTabChange={handleTabChange} />
          
          {/* Stopka */}
          <div className="w-full flex justify-center pb-2 pt-1">
            <button
              type="button"
              className="px-3 py-1 text-xs text-gray-500 border border-gray-300 rounded-full font-medium hover:bg-gray-50 transition-colors"
              onClick={() => openUrl("https://base.org/builders/minikit")}
            >
              BUILT ON BASE WITH MINIKIT
            </button>
          </div>
        </footer>

      </div>
    </SkillProvider>
  );
}
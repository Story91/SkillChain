"use client";

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { createOrUpdateUser } from '@/lib/users';

export default function WalletListener() {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    // When wallet is connected, store user data in Redis
    if (isConnected && address) {
      const storeUserData = async () => {
        try {
          await createOrUpdateUser(address);
          console.log("User data stored in Redis");
        } catch (error) {
          console.error("Failed to store user data:", error);
        }
      };

      storeUserData();
    }
  }, [address, isConnected]);

  // This is a utility component that doesn't render anything
  return null;
} 
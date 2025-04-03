"use client";

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';

interface User {
  address: string;
  fid?: number;
  lastSeen: number;
  firstSeen: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (data.success) {
          setUsers(data.users);
        } else {
          setError(data.error || 'Failed to fetch users');
        }
      } catch (error) {
        setError('Error fetching users');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUsers();
  }, []);

  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
          <p>Please connect your wallet to access the admin area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
          Back to App
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">User Statistics</h2>
        <p className="text-gray-700">Total Users: <span className="font-bold">{users.length}</span></p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Registered Users</h2>
        
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="ml-2">Loading users...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
            <p>{error}</p>
          </div>
        ) : users.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="w-full h-16 border-b border-gray-200 bg-gray-50">
                  <th className="text-left pl-4 pr-2 py-3 font-semibold text-gray-600">Address</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-600">FID</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-600">First Seen</th>
                  <th className="text-left px-2 py-3 font-semibold text-gray-600">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.address} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="text-left pl-4 pr-2 py-3 text-blue-600">{formatAddress(user.address)}</td>
                    <td className="text-left px-2 py-3">{user.fid || '-'}</td>
                    <td className="text-left px-2 py-3">{formatDate(user.firstSeen)}</td>
                    <td className="text-left px-2 py-3">{formatDate(user.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 
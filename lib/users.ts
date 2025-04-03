import { redis } from "./redis";

// Types
export interface User {
  address: string;
  fid?: number;
  lastSeen: number;
  firstSeen: number;
  notificationsEnabled: boolean;
}

// Redis keys
const USER_KEY = (address: string) => `user:${address}`;
const USERS_LIST_KEY = "users:all";

// User functions
export async function createOrUpdateUser(address: string, fid?: number): Promise<User | null> {
  if (!redis) return null;

  try {
    const now = Date.now();
    const userKey = USER_KEY(address);
    
    // Check if user exists
    const existingUser = await redis.get(userKey);
    
    const user: User = existingUser 
      ? { 
          ...JSON.parse(existingUser as string), 
          lastSeen: now,
          fid: fid || JSON.parse(existingUser as string).fid 
        } 
      : { 
          address, 
          fid, 
          lastSeen: now, 
          firstSeen: now,
          notificationsEnabled: false
        };
    
    // Store user data
    await redis.set(userKey, JSON.stringify(user));
    
    // Add to the users list if it's a new user
    if (!existingUser) {
      await redis.sadd(USERS_LIST_KEY, address);
    }
    
    return user;
  } catch (error) {
    console.error("Error in createOrUpdateUser:", error);
    return null;
  }
}

export async function getUser(address: string): Promise<User | null> {
  if (!redis) return null;
  
  try {
    const userData = await redis.get(USER_KEY(address));
    if (!userData) return null;
    
    return JSON.parse(userData as string);
  } catch (error) {
    console.error("Error in getUser:", error);
    return null;
  }
}

export async function getAllUsers(): Promise<User[]> {
  if (!redis) return [];
  
  try {
    const userAddresses = await redis.smembers(USERS_LIST_KEY);
    if (!userAddresses || userAddresses.length === 0) return [];
    
    const users: User[] = [];
    
    for (const address of userAddresses) {
      const user = await getUser(address as string);
      if (user) {
        users.push(user);
      }
    }
    
    return users;
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return [];
  }
}

export async function setUserNotificationsEnabled(address: string, enabled: boolean): Promise<boolean> {
  if (!redis) return false;
  
  try {
    const user = await getUser(address);
    if (!user) return false;
    
    user.notificationsEnabled = enabled;
    await redis.set(USER_KEY(address), JSON.stringify(user));
    
    return true;
  } catch (error) {
    console.error("Error in setUserNotificationsEnabled:", error);
    return false;
  }
}

export async function getUserByFid(fid: number): Promise<User | null> {
  if (!redis || !fid) return null;
  
  try {
    const userAddresses = await redis.smembers(USERS_LIST_KEY);
    
    for (const address of userAddresses) {
      const user = await getUser(address as string);
      if (user && user.fid === fid) {
        return user;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error in getUserByFid:", error);
    return null;
  }
} 
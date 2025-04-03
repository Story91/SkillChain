import { redis } from "./redis";
import { createOrUpdateUser } from "./users";

// Typy danych
export interface Skill {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: number;
}

export interface UserSkill {
  skillId: string;
  endorsements: number;
  endorsedBy: string[];
}

// Klucze Redis
const SKILLS_KEY = "skills:all";
const USER_SKILLS_KEY = (address: string) => `user:${address}:skills`;
const LEADERBOARD_KEY = "skills:leaderboard";

// Funkcje zarządzania umiejętnościami
export async function getAllSkills(): Promise<Skill[]> {
  if (!redis) return [];
  
  try {
    // Pobierz wszystkie umiejętności jako hash
    const skillsData = await redis.hgetall(SKILLS_KEY);
    if (!skillsData) return [];
    
    // Przekształć obiekt na tablicę umiejętności
    return Object.values(skillsData as Record<string, string>).map(skill => JSON.parse(skill));
  } catch (error) {
    console.error("Error in getAllSkills:", error);
    return [];
  }
}

export async function getSkillById(skillId: string): Promise<Skill | null> {
  if (!redis) return null;
  
  try {
    // Pobierz pojedynczą umiejętność z hasha
    const skillData = await redis.hget(SKILLS_KEY, skillId);
    if (!skillData) return null;
    
    return JSON.parse(skillData as string);
  } catch (error) {
    console.error("Error in getSkillById:", error);
    return null;
  }
}

export async function createSkill(skill: Omit<Skill, "id" | "createdAt">): Promise<Skill | null> {
  console.log("[skills.ts/createSkill] Start", skill.name);
  
  if (!redis) {
    console.error("[skills.ts/createSkill] Redis not initialized");
    return null;
  }
  
  try {
    // Generuj unikalny identyfikator
    const skillId = `skill_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newSkill: Skill = {
      ...skill,
      id: skillId,
      createdAt: Date.now(),
    };
    
    console.log(`[skills.ts/createSkill] Saving skill to Redis: ${skillId}`);
    
    // Sprawdź, czy Redis jest dostępny
    try {
      const pingResult = await redis.ping();
      console.log(`[skills.ts/createSkill] Redis ping: ${pingResult}`);
    } catch (pingError) {
      console.error("[skills.ts/createSkill] Redis ping failed:", pingError);
      return null;
    }
    
    // Zapisz umiejętność jako element hasha
    console.log("[skills.ts/createSkill] Setting hash...");
    await redis.hset(SKILLS_KEY, { [skillId]: JSON.stringify(newSkill) });
    
    // Dodaj umiejętność do użytkownika, który ją stworzył
    console.log(`[skills.ts/createSkill] Adding skill to user: ${skill.createdBy}`);
    await addSkillToUser(skill.createdBy, skillId);
    
    // Aktualizuj rekord użytkownika
    console.log(`[skills.ts/createSkill] Updating user: ${skill.createdBy}`);
    await createOrUpdateUser(skill.createdBy);
    
    // Dodaj umiejętność do rankingu z początkowym wynikiem 0
    console.log(`[skills.ts/createSkill] Adding to leaderboard: ${skillId}`);
    await redis.zadd(LEADERBOARD_KEY, { score: 0, member: skillId });
    
    console.log(`[skills.ts/createSkill] Skill created successfully: ${skillId}`);
    return newSkill;
  } catch (error) {
    console.error("[skills.ts/createSkill] Error:", error);
    return null;
  }
}

// Funkcje zarządzania umiejętnościami użytkownika
export async function getUserSkills(address: string): Promise<UserSkill[]> {
  if (!redis) return [];
  
  try {
    // Pobierz umiejętności użytkownika jako hash
    const userSkillsData = await redis.hgetall(USER_SKILLS_KEY(address));
    if (!userSkillsData) return [];
    
    // Przekształć obiekt na tablicę umiejętności użytkownika
    return Object.values(userSkillsData as Record<string, string>).map(skill => JSON.parse(skill));
  } catch (error) {
    console.error("Error in getUserSkills:", error);
    return [];
  }
}

export async function addSkillToUser(address: string, skillId: string): Promise<boolean> {
  if (!redis) return false;

  try {
    // Sprawdź, czy umiejętność istnieje
    const skill = await getSkillById(skillId);
    if (!skill) return false;
    
    // Sprawdź, czy użytkownik już ma tę umiejętność
    const userSkills = await getUserSkills(address);
    if (userSkills.some(s => s.skillId === skillId)) {
      return true; // Użytkownik już ma tę umiejętność
    }
    
    // Utwórz nowy obiekt umiejętności użytkownika
    const userSkill: UserSkill = {
      skillId,
      endorsements: 0,
      endorsedBy: []
    };
    
    // Zapisz umiejętność użytkownika jako element hasha
    await redis.hset(USER_SKILLS_KEY(address), { [skillId]: JSON.stringify(userSkill) });
    
    // Aktualizuj rekord użytkownika
    await createOrUpdateUser(address);
    
    return true;
  } catch (error) {
    console.error("Error in addSkillToUser:", error);
    return false;
  }
}

// Funkcje endorsowania umiejętności
export async function endorseSkill(address: string, skilledAddress: string, skillId: string): Promise<boolean> {
  if (!redis) return false;
  
  try {
    // Nie można endorsować własnych umiejętności
    if (address === skilledAddress) return false;
    
    // Sprawdź, czy użytkownik ma tę umiejętność
    const userSkillData = await redis.hget(USER_SKILLS_KEY(skilledAddress), skillId);
    if (!userSkillData) return false;
    
    const userSkill: UserSkill = JSON.parse(userSkillData as string);
    
    // Sprawdź, czy użytkownik już endorsował tę umiejętność
    if (userSkill.endorsedBy.includes(address)) return false;
    
    // Dodaj endorsement
    userSkill.endorsements += 1;
    userSkill.endorsedBy.push(address);
    
    // Aktualizuj umiejętność użytkownika
    await redis.hset(USER_SKILLS_KEY(skilledAddress), { [skillId]: JSON.stringify(userSkill) });
    
    // Zwiększ wynik w rankingu o 1
    await redis.zincrby(LEADERBOARD_KEY, 1, skillId);
    
    // Aktualizuj rekordy użytkowników
    await createOrUpdateUser(address);
    await createOrUpdateUser(skilledAddress);
    
    return true;
  } catch (error) {
    console.error("Error in endorseSkill:", error);
    return false;
  }
}

// Funkcje rankingu umiejętności
export async function getTopSkills(limit: number = 10): Promise<{skill: Skill, score: number}[]> {
  if (!redis) return [];
  
  try {
    // Pobierz top umiejętności z posortowanego zbioru
    const topSkillsData = await redis.zrange(LEADERBOARD_KEY, 0, limit - 1, {
      rev: true,
      withScores: true
    });
    
    if (!topSkillsData || topSkillsData.length === 0) return [];
    
    const results: {skill: Skill, score: number}[] = [];
    
    // Przetwórz wyniki (element, wynik, element, wynik, ...)
    for (let i = 0; i < topSkillsData.length; i += 2) {
      const skillId = topSkillsData[i] as string;
      const score = parseFloat(topSkillsData[i+1] as string);
      const skill = await getSkillById(skillId);
      
      if (skill) {
        results.push({ skill, score });
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error in getTopSkills:", error);
    return [];
  }
} 
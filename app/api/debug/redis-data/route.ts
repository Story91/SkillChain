import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// Klucze Redis używane w aplikacji
const SKILLS_KEY = "skills:all";
const LEADERBOARD_KEY = "skills:leaderboard";

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      error: "Ten endpoint jest dostępny tylko w trybie deweloperskim"
    }, { status: 403 });
  }

  try {
    if (!redis) {
      return NextResponse.json({
        success: false,
        error: "Klient Redis nie jest zainicjalizowany",
        environment: {
          REDIS_URL: process.env.REDIS_URL ? "Ustawiony" : "Nie ustawiony",
          REDIS_TOKEN: process.env.REDIS_TOKEN ? "Ustawiony" : "Nie ustawiony"
        }
      }, { status: 500 });
    }

    // Pobierz wszystkie umiejętności z hasha
    const skills = await redis.hgetall(SKILLS_KEY);
    
    // Pobierz wszystkie klucze w Redis
    const allKeys = await redis.keys("*");
    
    // Pozyskaj dane z rankingu
    const leaderboard = await redis.zrange(LEADERBOARD_KEY, 0, -1, {
      rev: true,
      withScores: true
    });
    
    // Sprawdź strukturę klucza userSkills dla pierwszego znalezionego użytkownika
    let userSkillsExample = null;
    const userSkillsKeys = allKeys.filter(key => key.includes(":skills"));
    if (userSkillsKeys.length > 0) {
      userSkillsExample = {
        key: userSkillsKeys[0],
        data: await redis.hgetall(userSkillsKeys[0])
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        skills,
        leaderboard,
        userSkillsExample,
        allKeys
      },
      debug: {
        SKILLS_KEY,
        LEADERBOARD_KEY
      }
    });
  } catch (error) {
    console.error("Test danych Redis nie powiódł się:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Nieznany błąd Redis",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 
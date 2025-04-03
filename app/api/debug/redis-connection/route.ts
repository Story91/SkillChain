import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export async function GET() {
  try {
    const envVars = {
      REDIS_URL: process.env.REDIS_URL,
      REDIS_TOKEN: process.env.REDIS_TOKEN,
    };

    // Sprawdź zmienne środowiskowe
    if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) {
      return NextResponse.json({
        success: false,
        error: "Brak zmiennych środowiskowych REDIS_URL lub REDIS_TOKEN",
        envVars: {
          REDIS_URL: envVars.REDIS_URL ? "✅ Ustawiony" : "❌ Brak",
          REDIS_TOKEN: envVars.REDIS_TOKEN ? "✅ Ustawiony" : "❌ Brak",
        }
      }, { status: 500 });
    }

    // Próba utworzenia nowego klienta Redis
    const testRedis = new Redis({
      url: process.env.REDIS_URL,
      token: process.env.REDIS_TOKEN,
    });

    // Test połączenia
    const pingResult = await testRedis.ping();
    
    // Test podstawowych operacji
    const testKey = "connection_test_" + Date.now();
    await testRedis.set(testKey, "working");
    const testValue = await testRedis.get(testKey);
    await testRedis.del(testKey);

    return NextResponse.json({
      success: true,
      message: "Połączenie z Redis działa prawidłowo",
      testResults: {
        ping: pingResult,
        testValue,
      },
      envVars: {
        REDIS_URL: envVars.REDIS_URL ? "✅ Ustawiony" : "❌ Brak",
        REDIS_TOKEN: envVars.REDIS_TOKEN ? "✅ Ustawiony" : "❌ Brak",
      }
    });
  } catch (error) {
    console.error("Test połączenia do Redis nie powiódł się:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Nieznany błąd Redis",
      stack: error instanceof Error ? error.stack : undefined,
      envVars: {
        REDIS_URL: process.env.REDIS_URL ? "✅ Ustawiony" : "❌ Brak",
        REDIS_TOKEN: process.env.REDIS_TOKEN ? "✅ Ustawiony" : "❌ Brak",
      }
    }, { status: 500 });
  }
} 
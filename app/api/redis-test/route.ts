import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(request: NextRequest) {
  try {
    // Test if Redis connection works
    if (!redis) {
      return NextResponse.json({
        success: false,
        error: "Redis client not initialized. Check your REDIS_URL and REDIS_TOKEN environment variables."
      }, { status: 500 });
    }

    // Try to set and get a test value
    const testKey = "test_connection";
    const testValue = "Connected at " + new Date().toISOString();
    
    await redis.set(testKey, testValue);
    const retrievedValue = await redis.get(testKey);
    
    return NextResponse.json({
      success: true,
      message: "Redis connection successful",
      value: retrievedValue,
      environment: {
        hasRedisUrl: !!process.env.REDIS_URL,
        hasRedisToken: !!process.env.REDIS_TOKEN
      }
    });
  } catch (error) {
    console.error("Redis test failed:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown Redis error"
    }, { status: 500 });
  }
} 
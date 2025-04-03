import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      error: "This endpoint is only available in development mode"
    }, { status: 403 });
  }

  try {
    // Check if Redis client is initialized
    if (!redis) {
      return NextResponse.json({
        success: false,
        error: "Redis client not initialized",
        environment: {
          REDIS_URL: process.env.REDIS_URL ? "Set" : "Not set",
          REDIS_TOKEN: process.env.REDIS_TOKEN ? "Set" : "Not set"
        }
      }, { status: 500 });
    }

    // Run multiple Redis operations to test the connection
    const testKey = "debug_test_" + Date.now();
    const testValue = "test_value_" + Date.now();
    
    // Test string operations
    await redis.set(testKey, testValue);
    const getValue = await redis.get(testKey);
    
    // Test hash operations
    const hashKey = `${testKey}_hash`;
    await redis.hset(hashKey, { field1: "value1", field2: "value2" });
    const hashValue = await redis.hgetall(hashKey);
    
    // Test set operations
    const setKey = `${testKey}_set`;
    await redis.sadd(setKey, "member1", "member2");
    const setMembers = await redis.smembers(setKey);
    
    // Test sorted set operations
    const zsetKey = `${testKey}_zset`;
    await redis.zadd(zsetKey, { score: 1, member: "member1" });
    await redis.zadd(zsetKey, { score: 2, member: "member2" });
    const zsetMembers = await redis.zrange(zsetKey, 0, -1, { withScores: true });
    
    // Clean up test keys
    await redis.del(testKey, hashKey, setKey, zsetKey);
    
    return NextResponse.json({
      success: true,
      message: "Redis connection tested successfully",
      tests: {
        string: {
          set: testValue,
          get: getValue,
          success: getValue === testValue
        },
        hash: {
          set: { field1: "value1", field2: "value2" },
          get: hashValue,
          success: hashValue && hashValue.field1 === "value1"
        },
        set: {
          add: ["member1", "member2"],
          members: setMembers,
          success: setMembers && setMembers.includes("member1")
        },
        zset: {
          add: [
            { score: 1, member: "member1" },
            { score: 2, member: "member2" }
          ],
          range: zsetMembers,
          success: zsetMembers && zsetMembers.length === 4
        }
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        REDIS_URL: process.env.REDIS_URL ? "Set" : "Not set",
        REDIS_TOKEN: process.env.REDIS_TOKEN ? "Set" : "Not set"
      }
    });
  } catch (error) {
    console.error("Redis debug test failed:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown Redis error",
      stack: error instanceof Error ? error.stack : undefined,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        REDIS_URL: process.env.REDIS_URL ? "Set" : "Not set",
        REDIS_TOKEN: process.env.REDIS_TOKEN ? "Set" : "Not set"
      }
    }, { status: 500 });
  }
} 
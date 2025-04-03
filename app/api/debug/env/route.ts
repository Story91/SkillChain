import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      error: "This endpoint is only available in development mode"
    }, { status: 403 });
  }

  try {
    // Check if Redis environment variables are properly set
    const envVars = {
      REDIS_URL: process.env.REDIS_URL ? "Set" : "Not set",
      REDIS_TOKEN: process.env.REDIS_TOKEN ? "Set" : "Not set",
      NODE_ENV: process.env.NODE_ENV
    };

    return NextResponse.json({
      success: true,
      environment: envVars
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 
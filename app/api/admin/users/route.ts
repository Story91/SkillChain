import { NextRequest, NextResponse } from "next/server";
import { getAllUsers } from "@/lib/users";

// GET /api/admin/users - get all users
export async function GET(request: NextRequest) {
  try {
    // In a production app, you'd want to add authentication here
    const users = await getAllUsers();
    
    return NextResponse.json({ 
      success: true, 
      users: users.map(user => ({
        ...user,
        // Don't expose sensitive data
        notificationsEnabled: undefined 
      }))
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
} 
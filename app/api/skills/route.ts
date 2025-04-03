// app/api/skills/route.ts
import { NextRequest, NextResponse } from "next/server";
import { 
  getAllSkills, 
  createSkill, 
  getSkillById,
  getUserSkills,
  addSkillToUser,
  endorseSkill,
  getTopSkills
} from "@/lib/skills";
import { sendFrameNotification } from "@/lib/notification-client";
import { getUserNotificationDetails } from "@/lib/notification";
import { redis } from "@/lib/redis";

// GET /api/skills - pobierz wszystkie umiejętności
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const skillId = searchParams.get('skillId');
    const topSkills = searchParams.get('top');

    // Jeśli podano address, pobierz umiejętności użytkownika
    if (address) {
      const skills = await getUserSkills(address);
      return NextResponse.json({ skills });
    }

    // Jeśli podano skillId, pobierz konkretną umiejętność
    if (skillId) {
      const skill = await getSkillById(skillId);
      if (!skill) {
        return NextResponse.json({ error: "Skill not found" }, { status: 404 });
      }
      return NextResponse.json({ skill });
    }

    // Jeśli podano top, pobierz najlepsze umiejętności
    if (topSkills) {
      const limit = parseInt(topSkills) || 10;
      const skills = await getTopSkills(limit);
      return NextResponse.json({ skills });
    }

    // Domyślnie pobierz wszystkie umiejętności
    const skills = await getAllSkills();
    return NextResponse.json({ skills });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

// POST /api/skills - dodaj nową umiejętność
export async function POST(request: NextRequest) {
  try {
    // Check Redis connection first
    if (!redis) {
      return NextResponse.json({ 
        error: "Redis is not connected. Please check your Redis configuration." 
      }, { status: 500 });
    }

    const body = await request.json();
    const { name, description, createdBy } = body;

    // Walidacja danych
    if (!name || !description || !createdBy) {
      return NextResponse.json({ 
        error: "Name, description and createdBy are required" 
      }, { status: 400 });
    }

    const newSkill = await createSkill({ name, description, createdBy });
    if (!newSkill) {
      return NextResponse.json({ 
        error: "Failed to create skill. Check server logs for details." 
      }, { status: 500 });
    }

    return NextResponse.json({ skill: newSkill }, { status: 201 });
  } catch (error) {
    console.error("Error creating skill:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error",
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 });
  }
}

// PUT /api/skills - endorsuj umiejętność lub dodaj istniejącą umiejętność do użytkownika
export async function PUT(request: NextRequest) {
  try {
    // Check Redis connection first
    if (!redis) {
      return NextResponse.json({ 
        error: "Redis is not connected. Please check your Redis configuration." 
      }, { status: 500 });
    }

    const body = await request.json();
    const { type, address, skillId, skilledAddress } = body;

    // Jeśli typ to add, dodaj umiejętność do użytkownika
    if (type === "add") {
      if (!address || !skillId) {
        return NextResponse.json({ 
          error: "Address and skillId are required" 
        }, { status: 400 });
      }

      const result = await addSkillToUser(address, skillId);
      if (!result) {
        return NextResponse.json({ 
          error: "Failed to add skill to user" 
        }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Jeśli typ to endorse, endorsuj umiejętność
    if (type === "endorse") {
      if (!address || !skillId || !skilledAddress) {
        return NextResponse.json({ 
          error: "Address, skillId and skilledAddress are required" 
        }, { status: 400 });
      }

      const result = await endorseSkill(address, skilledAddress, skillId);
      if (!result) {
        return NextResponse.json({ 
          error: "Failed to endorse skill" 
        }, { status: 500 });
      }

      // Wyślij powiadomienie do użytkownika, który otrzymał endorsement
      try {
        const notificationDetails = await getUserNotificationDetails(parseInt(skilledAddress, 16));
        if (notificationDetails) {
          await sendFrameNotification({
            fid: parseInt(skilledAddress, 16),
            title: "New Endorsement!",
            body: `You received an endorsement for your skill!`,
          });
        }
      } catch (error) {
        console.error("Failed to send notification", error);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ 
      error: "Invalid type. Must be 'add' or 'endorse'" 
    }, { status: 400 });
  } catch (error) {
    console.error("Error in skills PUT endpoint:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error",
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 });
  }
}
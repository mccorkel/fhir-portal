import { NextRequest, NextResponse } from "next/server";
import { getUser, upsertUser } from "@/lib/cosmos-db";

// GET /api/users/[userId]
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getUser(params.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("Error in GET /api/users/[userId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/users/[userId]
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const body = await request.json();
    const user = {
      id: params.userId,
      username: body.username,
      avatarUri: body.avatarUri,
    };
    
    const updatedUser = await upsertUser(user);
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error in PUT /api/users/[userId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 
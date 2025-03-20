import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/cosmos-db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user exists
    const user = await getUser(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate Fasten Connect URL with state parameter for security
    const state = Buffer.from(JSON.stringify({ 
      userId: session.user.id, 
      timestamp: Date.now() 
    })).toString('base64');
    
    const fastenUrl = new URL('https://connect.fastenhealth.com/v1/connect');
    fastenUrl.searchParams.set('public_id', process.env.FASTEN_PUBLIC_KEY || '');
    fastenUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/fasten/callback`);
    fastenUrl.searchParams.set('state', state);

    return NextResponse.json({ url: fastenUrl.toString() });
  } catch (error) {
    console.error("Error in POST /api/fasten/initiate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 
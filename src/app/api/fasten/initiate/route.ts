import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/cosmos-db";
import { headers } from "next/headers";
import { validateToken } from "@/lib/auth-utils";

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate the token and get the user ID
    const token = authHeader.split(' ')[1];
    const userId = await validateToken(token);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Verify user exists
    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate Fasten Connect URL with state parameter for security
    const state = Buffer.from(JSON.stringify({ 
      userId, 
      timestamp: Date.now() 
    })).toString('base64');
    
    // Get the host from the request headers
    const host = headers().get("host") || "";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const baseUrl = process.env.NODE_ENV === "production" 
      ? "https://z.tigerpanda.tv"
      : `${protocol}://${host}`;
    
    const fastenUrl = new URL('https://connect.fastenhealth.com/v1/connect');
    fastenUrl.searchParams.set('public_id', process.env.FASTEN_PUBLIC_KEY || '');
    fastenUrl.searchParams.set('redirect_uri', `${baseUrl}/api/fasten/callback`);
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
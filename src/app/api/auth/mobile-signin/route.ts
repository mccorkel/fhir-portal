import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID);

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Create a session cookie
    const sessionToken = await createSessionToken(payload);
    
    // Set the session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 1 week
    });

    return response;
  } catch (error) {
    console.error('Mobile sign-in error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

async function createSessionToken(payload: any) {
  // Here you would:
  // 1. Create or update the user in your database
  // 2. Generate a session token (JWT or other format)
  // 3. Store the session information if needed
  
  // For now, we'll return a simple JWT
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1w' }
  );
} 
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token');

    if (!sessionToken) {
      return NextResponse.json({ isAuthenticated: false });
    }

    // Verify the session token
    try {
      const payload = jwt.verify(
        sessionToken.value,
        process.env.JWT_SECRET || 'your-secret-key'
      );
      return NextResponse.json({ isAuthenticated: true, user: payload });
    } catch (error) {
      // Token is invalid or expired
      return NextResponse.json({ isAuthenticated: false });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Failed to check authentication' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL));
    
    // Clear the session cookie
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
    });

    return response;
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    );
  }
} 
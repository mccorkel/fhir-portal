import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback'
);

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/auth/error?error=missing_code', process.env.NEXT_PUBLIC_APP_URL));
    }

    // Exchange code for tokens
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return NextResponse.redirect(new URL('/auth/error?error=invalid_token', process.env.NEXT_PUBLIC_APP_URL));
    }

    // Create a session token
    const jwt = require('jsonwebtoken');
    const sessionToken = jwt.sign(
      {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1w' }
    );

    // Set the session cookie and redirect to home
    const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL));
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 1 week
    });

    return response;
  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(new URL('/auth/error?error=callback_failed', process.env.NEXT_PUBLIC_APP_URL));
  }
} 
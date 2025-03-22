import { NextResponse } from 'next/server';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUri = searchParams.get('redirect_uri');

  if (!redirectUri) {
    return NextResponse.json({ error: 'Missing redirect_uri' }, { status: 400 });
  }

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    state: Math.random().toString(36).substring(7), // Simple state token
  });

  return NextResponse.redirect(new URL(`${GOOGLE_AUTH_URL}?${params.toString()}`));
} 
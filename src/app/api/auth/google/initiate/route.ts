import { NextResponse } from 'next/server';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('Google OAuth Initiation - Request received:', {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries())
  });

  const { searchParams } = new URL(request.url);
  const redirectUri = searchParams.get('redirect_uri');

  console.log('Parsed redirect URI:', {
    redirectUri,
    allParams: Object.fromEntries(searchParams.entries())
  });

  if (!redirectUri) {
    console.warn('Missing redirect_uri parameter');
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

  const googleAuthUrl = new URL(`${GOOGLE_AUTH_URL}?${params.toString()}`);

  console.log('Google OAuth configuration:', {
    clientIdPresent: !!process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    scope: 'openid email profile',
    state: params.get('state'),
    finalUrl: googleAuthUrl.toString().replace(process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID || '', '[CLIENT_ID]')
  });

  return NextResponse.json({ url: googleAuthUrl.toString() });
} 
import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXT_PUBLIC_APP_URL + '/api/auth/mobile/callback'
);

async function exchangeCodeForTokens(code: string) {
  console.log('Exchanging code for tokens:', {
    codeLength: code.length,
    clientIdPresent: !!process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    clientSecretPresent: !!process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.NEXT_PUBLIC_APP_URL + '/api/auth/mobile/callback'
  });

  try {
    const { tokens } = await client.getToken(code);
    console.log('Token exchange successful:', {
      hasAccessToken: !!tokens.access_token,
      hasIdToken: !!tokens.id_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expiry_date,
      tokenTypes: Object.keys(tokens)
    });

    if (!tokens.id_token) {
      throw new Error('No ID token received');
    }
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : 'Unknown type',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to exchange code for tokens');
  }
}

async function createUserSession(tokens: any) {
  console.log('Creating user session from tokens:', {
    hasIdToken: !!tokens.id_token,
    tokenLength: tokens.id_token?.length
  });

  try {
    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log('ID token verified successfully:', {
      hasPayload: !!payload,
      fields: payload ? Object.keys(payload) : [],
      sub: payload?.sub ? `${payload.sub.substring(0, 5)}...` : undefined
    });

    if (!payload) {
      throw new Error('Invalid token payload');
    }

    // Create a JWT session token
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

    console.log('Session token created:', {
      tokenLength: sessionToken.length,
      hasJwtSecret: !!process.env.JWT_SECRET,
      expiresIn: '1w'
    });

    return sessionToken;
  } catch (error) {
    console.error('Error creating user session:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : 'Unknown type',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error('Failed to create user session');
  }
}

export async function GET(request: Request) {
  console.log('Mobile callback - Request received:', {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries())
  });

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  console.log('Parsed callback parameters:', {
    hasCode: !!code,
    codeLength: code?.length,
    state,
    allParams: Object.fromEntries(searchParams.entries())
  });

  if (!code) {
    console.warn('Missing authorization code');
    return NextResponse.redirect(
      `exp://vwanoos-nicopip-8081.exp.direct?error=missing_code`
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    // Create user session
    const sessionToken = await createUserSession(tokens);

    const redirectUrl = `exp://vwanoos-nicopip-8081.exp.direct?token=${sessionToken}`;
    console.log('Redirecting to Expo app:', {
      baseUrl: 'exp://vwanoos-nicopip-8081.exp.direct',
      hasToken: !!sessionToken,
      tokenLength: sessionToken.length,
      fullUrl: redirectUrl.replace(sessionToken, '[TOKEN]')
    });

    // Redirect back to Expo app with the session token
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Mobile callback error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : 'Unknown type',
      stack: error instanceof Error ? error.stack : undefined
    });

    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.redirect(
      `exp://vwanoos-nicopip-8081.exp.direct?error=${encodeURIComponent(errorMessage)}`
    );
  }
} 

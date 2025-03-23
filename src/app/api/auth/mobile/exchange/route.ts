import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_token, refresh_token } = body;

    if (!id_token && !refresh_token) {
      return NextResponse.json(
        { error: 'Either id_token or refresh_token is required' },
        { status: 400 }
      );
    }

    // If refresh token is provided, use it to get new tokens
    if (refresh_token) {
      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: refresh_token,
            grant_type: 'refresh_token',
          }).toString(),
        });

        const tokens = await response.json();
        
        if (!response.ok) {
          throw new Error(tokens.error || 'Failed to refresh token');
        }

        return NextResponse.json({
          access_token: tokens.access_token,
          id_token: tokens.id_token,
          expires_in: tokens.expires_in
        });
      } catch (error) {
        console.error('Error refreshing token:', error);
        return NextResponse.json(
          { error: 'Failed to refresh token' },
          { status: 401 }
        );
      }
    }

    // If ID token is provided, verify it and create a session
    if (id_token) {
      try {
        // Verify the ID token
        const ticket = await client.verifyIdToken({
          idToken: id_token,
          audience: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        });

        const payload = ticket.getPayload();
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
            picture: payload.picture,
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '1w' }
        );

        return NextResponse.json({
          session_token: sessionToken,
          user: {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture
          }
        });
      } catch (error) {
        console.error('Error verifying ID token:', error);
        return NextResponse.json(
          { error: 'Invalid ID token' },
          { status: 401 }
        );
      }
    }
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: 'Failed to process token exchange' },
      { status: 500 }
    );
  }
} 
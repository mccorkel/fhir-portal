import { jwtVerify } from 'jose';

const GOOGLE_ISSUER = 'https://accounts.google.com';
const GOOGLE_AUDIENCE = process.env.GOOGLE_CLIENT_ID;

export async function validateToken(token: string): Promise<string | null> {
  try {
    // Verify the token
    const { payload } = await jwtVerify(
      token,
      // Google uses JWKS for token validation
      async () => {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
        return response.json();
      },
      {
        issuer: GOOGLE_ISSUER,
        audience: GOOGLE_AUDIENCE,
      }
    );

    // Return the user ID from the token
    return payload.sub as string || null;
  } catch (error) {
    console.error('Token validation failed:', error);
    return null;
  }
} 
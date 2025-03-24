import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Define protected paths
const PROTECTED_PATHS = [
  '/api/ai/chat',
  '/patients',
  '/upload'
]

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const cookies = request.cookies;
  const sessionTokens = cookies.getAll('session_token');

  console.log('Middleware check:', {
    path,
    isProtected: PROTECTED_PATHS.some(p => path.startsWith(p)),
    sessionTokenCount: sessionTokens.length,
    cookies: Object.fromEntries(cookies.getAll().map(c => [c.name, c.value])),
    headers: Object.fromEntries(request.headers.entries())
  });

  // Check if the path is protected
  if (!PROTECTED_PATHS.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }

  // No session token
  if (sessionTokens.length === 0) {
    console.log('No session token found, redirecting to /', { path });
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Use the most recent session token (last one in the list)
  const sessionToken = sessionTokens[sessionTokens.length - 1];

  try {
    // Verify the JWT token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not set');
      return NextResponse.redirect(new URL('/auth/error?error=configuration_error', request.url));
    }

    console.log('Attempting to verify token with secret:', { 
      secretLength: secret.length,
      tokenLength: sessionToken.value.length 
    });

    const verified = await jwtVerify(
      sessionToken.value,
      new TextEncoder().encode(secret)
    );

    console.log('Session token verified:', {
      path,
      sub: verified.payload.sub,
      email: verified.payload.email,
      iat: verified.payload.iat,
      exp: verified.payload.exp
    });

    // Clean up duplicate cookies in the response
    const response = NextResponse.next();
    if (sessionTokens.length > 1) {
      console.log('Cleaning up duplicate session tokens');
      // Delete all tokens
      sessionTokens.forEach(() => response.cookies.delete('session_token'));
      // Set the most recent one
      response.cookies.set('session_token', sessionToken.value, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        domain: request.headers.get('host')?.includes('localhost') 
          ? undefined 
          : request.headers.get('x-forwarded-host')?.split(':')[0]
      });
    }
    return response;

  } catch (error) {
    console.error('Token verification failed:', {
      path,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : 'Unknown error',
      token: sessionToken.value
    });
    
    // Clear all session tokens and redirect
    const response = NextResponse.redirect(new URL('/', request.url));
    sessionTokens.forEach(() => response.cookies.delete('session_token'));
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
} 
import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { SignJWT } from 'jose';

const client = new OAuth2Client(
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    console.log('Google callback received:', {
      url: request.url,
      headers: Object.fromEntries(request.headers.entries())
    });

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      console.error('Missing authorization code');
      return NextResponse.redirect(new URL('/auth/error?error=missing_code', process.env.NEXT_PUBLIC_APP_URL));
    }

    // Exchange code for tokens
    const { tokens } = await client.getToken({
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    });

    console.log('Tokens received:', {
      hasIdToken: !!tokens.id_token,
      hasAccessToken: !!tokens.access_token
    });

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      console.error('Invalid token payload');
      return NextResponse.redirect(new URL('/auth/error?error=invalid_token', process.env.NEXT_PUBLIC_APP_URL));
    }

    console.log('Token payload verified:', {
      sub: payload.sub,
      email: payload.email
    });

    // Create a session token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not set');
      return NextResponse.redirect(new URL('/auth/error?error=configuration_error', process.env.NEXT_PUBLIC_APP_URL));
    }

    const sessionToken = await new SignJWT({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(secret));

    // Set the session cookie and redirect to home
    const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL));
    
    // Get the domain from the forwarded host or fallback to direct host
    const forwardedHost = request.headers.get('x-forwarded-host');
    const directHost = request.headers.get('host');
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const host = forwardedHost || directHost || '';
    
    // For localhost or IP addresses, don't set domain
    const isLocalhost = host.includes('localhost') || /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(host);
    // Only set domain for production domains
    const domain = isLocalhost ? undefined : host.split(':')[0];
    // Check if we should use secure cookies
    const isSecure = forwardedProto === 'https' || process.env.NODE_ENV === 'production';

    // Create user data object
    const userData = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };

    console.log('Setting cookies with:', { 
      domain,
      host,
      forwardedHost,
      directHost,
      isLocalhost,
      forwardedProto,
      isSecure,
      tokenLength: sessionToken.length,
      userData
    });

    // Set both cookies with the same settings
    const cookieSettings = {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60, // 1 week
      domain: domain,
      path: '/'
    };

    response.cookies.set('session_token', sessionToken, {
      ...cookieSettings,
      httpOnly: true // Keep session token httpOnly
    });

    response.cookies.set('user', JSON.stringify(userData), {
      ...cookieSettings,
      httpOnly: false // Allow JavaScript to read user data
    });

    return response;
  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.redirect(new URL('/auth/error?error=callback_failed', process.env.NEXT_PUBLIC_APP_URL));
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUser, updateUser, FastenConnection } from '@/lib/cosmos-db';
import { verifyWebhookSignature } from '@/lib/fasten-api';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

// Helper function to construct URLs safely
function getBaseUrl(request: NextRequest): string {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  
  try {
    // Get the session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin', baseUrl));
    }

    // Get the user
    const user = await getUser(session.user.id);
    if (!user) {
      return NextResponse.redirect(new URL('/auth/signin', baseUrl));
    }

    // Get the state from the URL
    const state = request.nextUrl.searchParams.get('state');
    if (!state) {
      return NextResponse.redirect(new URL('/health-records?error=missing_parameters', baseUrl));
    }

    // Verify the state matches what we stored
    const storedState = user.fastenConnections?.find(
      conn => conn.state === state
    );

    if (!storedState) {
      return NextResponse.redirect(new URL('/health-records?error=invalid_state', baseUrl));
    }

    // Check if the connection is expired (30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (new Date(storedState.createdAt) < thirtyMinutesAgo) {
      return NextResponse.redirect(new URL('/health-records?error=expired_state', baseUrl));
    }

    // Get the connection ID from the URL
    const connectionId = request.nextUrl.searchParams.get('connection_id');
    if (!connectionId) {
      return NextResponse.redirect(new URL('/health-records?error=missing_parameters', baseUrl));
    }

    // Update the connection with the connection ID
    const updatedConnections = user.fastenConnections.map(conn => {
      if (conn.state === state) {
        return {
          ...conn,
          orgConnectionId: connectionId,
          status: 'connected' as const,
          updatedAt: new Date().toISOString(),
        };
      }
      return conn;
    });

    // Update the user
    await updateUser({
      ...user,
      fastenConnections: updatedConnections,
    });

    // Redirect to the health records page with success
    return NextResponse.redirect(new URL('/health-records?connection=success', baseUrl));
  } catch (error) {
    console.error('Error in GET /api/fasten/callback:', error);
    return NextResponse.redirect(new URL('/health-records?error=internal_error', baseUrl));
  }
} 
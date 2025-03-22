import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUser, updateUser, FastenConnection } from '@/lib/cosmos-db';
import { verifyWebhookSignature } from '@/lib/fasten-api';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get the session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Get the user
    const user = await getUser(session.user.id);
    if (!user) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Get the state from the URL
    const state = request.nextUrl.searchParams.get('state');
    if (!state) {
      return NextResponse.redirect(new URL('/health-records?error=missing_parameters', request.url));
    }

    // Verify the state matches what we stored
    const storedState = user.fastenConnections?.find(
      conn => conn.state === state
    );

    if (!storedState) {
      return NextResponse.redirect(new URL('/health-records?error=invalid_state', request.url));
    }

    // Check if the connection is expired (30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (new Date(storedState.createdAt) < thirtyMinutesAgo) {
      return NextResponse.redirect(new URL('/health-records?error=expired_state', request.url));
    }

    // Get the connection ID from the URL
    const connectionId = request.nextUrl.searchParams.get('connection_id');
    if (!connectionId) {
      return NextResponse.redirect(new URL('/health-records?error=missing_parameters', request.url));
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
    return NextResponse.redirect(new URL('/health-records?connection=success', request.url));
  } catch (error) {
    console.error('Error in GET /api/fasten/callback:', error);
    return NextResponse.redirect(new URL('/health-records?error=internal_error', request.url));
  }
} 
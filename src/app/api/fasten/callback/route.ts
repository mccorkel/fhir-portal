import { NextRequest, NextResponse } from "next/server";
import { addFastenConnection } from "@/lib/cosmos-db";
import { initiateExport } from "@/lib/fasten-api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get and verify state parameter
    const stateParam = searchParams.get('state');
    if (!stateParam) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard?error=invalid_state`
      );
    }

    // Decode state parameter
    const { userId, timestamp } = JSON.parse(
      Buffer.from(stateParam, 'base64').toString()
    );

    // Verify state timestamp isn't too old (15 minutes)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard?error=expired_state`
      );
    }

    // Get connection details from query params
    const orgConnectionId = searchParams.get('org_connection_id');
    const platformType = searchParams.get('platform_type');
    const portalId = searchParams.get('portal_id');
    const connectionStatus = searchParams.get('connection_status');

    // Verify required parameters
    if (!orgConnectionId || !platformType || !portalId) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard?error=missing_parameters`
      );
    }

    // Verify connection status
    if (connectionStatus !== 'authorized') {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard?error=unauthorized_connection`
      );
    }

    // Add connection to user's record
    const updatedUser = await addFastenConnection(userId, {
      orgConnectionId,
      platformType,
      portalId
    });

    if (!updatedUser) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard?error=failed_to_save`
      );
    }

    // Initiate first export
    try {
      await initiateExport(orgConnectionId);
    } catch (error) {
      console.error('Failed to initiate export:', error);
      // Continue despite export failure - we can retry later
    }

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?connection=success`
    );
  } catch (error) {
    console.error("Error in GET /api/fasten/callback:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?error=internal_error`
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";
import { headers } from 'next/headers';
import { updateFastenConnectionExport } from "@/lib/cosmos-db";
import { verifyWebhookSignature, downloadFhirData } from "@/lib/fasten-api";

export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const signature = headersList.get('x-fasten-signature') || '';
    const body = await request.text();

    // Verify webhook signature when available
    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);

    // Handle different event types
    switch (event.type) {
      case 'patient.ehi_export_success': {
        const { download_link, task_id, org_id } = event.data;
        
        // Update connection export status
        await updateFastenConnectionExport(org_id, task_id, {
          taskId: task_id,
          status: 'completed',
          downloadUrl: download_link,
          exportedAt: new Date().toISOString()
        });

        // Download and process FHIR data
        try {
          const fhirData = await downloadFhirData(download_link);
          // TODO: Process and store FHIR data
          console.log('Successfully downloaded FHIR data for task:', task_id);
        } catch (error) {
          console.error('Failed to download FHIR data:', error);
          // Update export status to error
          await updateFastenConnectionExport(org_id, task_id, {
            taskId: task_id,
            status: 'error',
            exportedAt: new Date().toISOString()
          });
        }
        break;
      }

      case 'patient.ehi_export_failed': {
        const { task_id, org_id, error } = event.data;
        
        // Update connection export status
        await updateFastenConnectionExport(org_id, task_id, {
          taskId: task_id,
          status: 'error',
          exportedAt: new Date().toISOString()
        });
        
        console.error('Export failed:', error);
        break;
      }

      // Add more event types as needed
      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error("Error in POST /api/fasten/webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 
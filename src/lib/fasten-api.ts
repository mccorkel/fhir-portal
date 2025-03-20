import { headers } from 'next/headers';

const FASTEN_API_BASE = 'https://api.connect.fastenhealth.com/v1';

// Helper to create Basic Auth header
function getAuthHeader() {
  const publicKey = process.env.FASTEN_PUBLIC_KEY;
  const privateKey = process.env.FASTEN_PRIVATE_KEY;
  
  if (!publicKey || !privateKey) {
    throw new Error('Fasten API keys not configured');
  }

  const auth = Buffer.from(`${publicKey}:${privateKey}`).toString('base64');
  return `Basic ${auth}`;
}

// Initiate a bulk export for a connection
export async function initiateExport(orgConnectionId: string) {
  try {
    const response = await fetch(`${FASTEN_API_BASE}/bridge/fhir/ehi-export`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ org_connection_id: orgConnectionId })
    });

    if (!response.ok) {
      throw new Error(`Failed to initiate export: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error initiating export:', error);
    throw error;
  }
}

// Download FHIR data from a signed URL
export async function downloadFhirData(downloadUrl: string) {
  try {
    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download FHIR data: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error downloading FHIR data:', error);
    throw error;
  }
}

// Verify webhook signature
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  // TODO: Implement webhook signature verification when Fasten provides the mechanism
  return true;
}

// Get connection status
export async function getConnectionStatus(orgConnectionId: string) {
  try {
    const response = await fetch(`${FASTEN_API_BASE}/bridge/connection/${orgConnectionId}`, {
      headers: {
        'Authorization': getAuthHeader()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get connection status: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error getting connection status:', error);
    throw error;
  }
} 
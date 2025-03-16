# Simplified Authentication for FHIR Service

Based on the user's clarification, this document outlines the simplified approach for authenticating with the FHIR service using Entra ID credentials.

## Overview

Instead of using separate FHIR Client ID and FHIR Client Secret, we can use the same Entra ID app registration credentials to access the FHIR service. This simplifies the implementation and secret management.

## Environment Variables

The simplified environment variables would be:

```
# Entra ID Configuration
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# FHIR Service Configuration
FHIR_SERVICE_URL=https://your-fhir-service.fhir.azurehealthcareapis.com

# NextAuth Configuration
NEXTAUTH_SECRET=your-random-secret-string
NEXTAUTH_URL=http://localhost:3000
```

## Token Acquisition

Here's how to acquire a token for the FHIR service using the client credentials flow:

```typescript
async function getFhirToken() {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const fhirServiceUrl = process.env.FHIR_SERVICE_URL;
  
  try {
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        resource: fhirServiceUrl
      })
    });
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to acquire token');
    }
    
    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error acquiring FHIR token:', error);
    return null;
  }
}
```

## MSAL Configuration

For MSAL, configure the scopes to include the FHIR service URL:

```typescript
export const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : "",
  },
  // ...other config
};

export const fhirApiRequest = {
  scopes: [`${process.env.NEXT_PUBLIC_FHIR_SERVICE_URL}/.default`],
};
```

## Updated FHIR API Utility

The FHIR API utility can be simplified to use this approach:

```typescript
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

// Function to get FHIR token
async function getFhirToken() {
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const fhirServiceUrl = process.env.FHIR_SERVICE_URL;
  
  try {
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        resource: fhirServiceUrl
      })
    });
    
    if (!tokenResponse.ok) {
      throw new Error('Failed to acquire token');
    }
    
    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error acquiring FHIR token:', error);
    return null;
  }
}

// This is a utility function to handle FHIR API requests
export async function handleFhirRequest(
  req: NextRequest,
  endpoint: string,
  method: string = "GET",
  body?: any
) {
  try {
    // Get the session to verify user authentication
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get FHIR service URL from environment variable
    const fhirServiceUrl = process.env.FHIR_SERVICE_URL || "";
    
    // Get token for FHIR API access using client credentials
    const accessToken = await getFhirToken();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: "Failed to acquire FHIR service token" },
        { status: 500 }
      );
    }
    
    // Construct the full URL for the FHIR request
    const url = `${fhirServiceUrl}/${endpoint}`;
    
    // Set up headers for the FHIR request
    const headers = {
      "Content-Type": "application/fhir+json",
      "Accept": "application/fhir+json",
      "Authorization": `Bearer ${accessToken}`,
    };
    
    // Make the request to the FHIR service
    const response = await fetch(url, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return the response
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("FHIR API request error:", error);
    return NextResponse.json(
      { error: "Failed to process FHIR request" },
      { status: 500 }
    );
  }
}
```

## Azure Key Vault Configuration

When using Azure Key Vault in production, you only need to store these secrets:

```bash
# Add Entra ID secrets
az keyvault secret set --vault-name fhir-portal-kv --name "AZURE-AD-CLIENT-ID" --value "your-client-id"
az keyvault secret set --vault-name fhir-portal-kv --name "AZURE-AD-CLIENT-SECRET" --value "your-client-secret"
az keyvault secret set --vault-name fhir-portal-kv --name "AZURE-AD-TENANT-ID" --value "your-tenant-id"

# Add FHIR service URL
az keyvault secret set --vault-name fhir-portal-kv --name "FHIR-SERVICE-URL" --value "https://your-fhir-service.fhir.azurehealthcareapis.com"

# Add NextAuth secret
az keyvault secret set --vault-name fhir-portal-kv --name "NEXTAUTH-SECRET" --value "your-random-secret-string"
```

## Benefits of This Approach

1. **Simplified Secret Management**: Fewer secrets to manage and rotate
2. **Reduced Configuration**: Fewer environment variables to configure
3. **Consistent Authentication**: Uses the same identity for both user authentication and FHIR service access
4. **Better Security**: Follows Azure's recommended practices for service-to-service authentication

# Azure Secrets Management Configuration

This document outlines how to configure Azure Key Vault for securely storing sensitive information used by the FHIR Portal application.

## Overview

The FHIR Portal application requires several secrets to operate securely:

1. Azure AD (Entra ID) client ID and secret for authentication
2. FHIR service URL and credentials
3. NextAuth secret for session encryption

Instead of storing these values directly in environment variables or code, we'll use Azure Key Vault to securely manage these secrets.

## Setup Instructions

### 1. Create an Azure Key Vault

```bash
# Login to Azure
az login

# Create a resource group if you don't have one
az group create --name tigercare-rg --location eastus

# Create a Key Vault
az keyvault create --name tigercare-kv --resource-group tigercare-rg --location eastus
```

### 2. Add Secrets to Key Vault

```bash
# Add Entra ID secrets
az keyvault secret set --vault-name tigercare-kv --name "AZURE-AD-CLIENT-ID" --value "your-client-id"
az keyvault secret set --vault-name tigercare-kv --name "AZURE-AD-CLIENT-SECRET" --value "your-client-secret"
az keyvault secret set --vault-name tigercare-kv --name "AZURE-AD-TENANT-ID" --value "your-tenant-id"

# Add FHIR service secrets
az keyvault secret set --vault-name tigercare-kv --name "FHIR-SERVICE-URL" --value "https://your-fhir-service.fhir.azurehealthcareapis.com"
az keyvault secret set --vault-name tigercare-kv --name "FHIR-CLIENT-ID" --value "your-fhir-client-id"
az keyvault secret set --vault-name tigercare-kv --name "FHIR-CLIENT-SECRET" --value "your-fhir-client-secret"

# Add NextAuth secret
az keyvault secret set --vault-name tigercare-kv --name "NEXTAUTH-SECRET" --value "your-random-secret-string"
```

### 3. Configure Managed Identity for the App Service

```bash
# Create a managed identity for the App Service
az webapp identity assign --name tigercare-app --resource-group tigercare-rg

# Get the principal ID of the managed identity
principalId=$(az webapp identity show --name tigercare-app --resource-group tigercare-rg --query principalId --output tsv)

# Grant the managed identity access to Key Vault secrets
az keyvault set-policy --name tigercare-kv --object-id $principalId --secret-permissions get list
```

## Integration with the Application

### Update the API Code

The application code needs to be updated to retrieve secrets from Key Vault instead of environment variables. Here's how to modify the FHIR API utility function:

```typescript
// src/lib/fhir-api.ts
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

// Key Vault URL
const keyVaultUrl = process.env.KEY_VAULT_URL || "https://tigercare-kv.vault.azure.net/";

// Create a credential using managed identity
const credential = new DefaultAzureCredential();

// Create a secret client
const secretClient = new SecretClient(keyVaultUrl, credential);

// Function to get a secret from Key Vault
async function getSecret(secretName: string): Promise<string> {
  try {
    const secret = await secretClient.getSecret(secretName);
    return secret.value || "";
  } catch (error) {
    console.error(`Error retrieving secret ${secretName}:`, error);
    return "";
  }
}

export async function handleFhirRequest(
  req: NextRequest,
  endpoint: string,
  method: string = "GET",
  body?: any
) {
  try {
    // Get the session to verify authentication
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get secrets from Key Vault
    const fhirServiceUrl = await getSecret("FHIR-SERVICE-URL");
    const clientId = await getSecret("FHIR-CLIENT-ID");
    const clientSecret = await getSecret("FHIR-CLIENT-SECRET");
    const tenantId = await getSecret("AZURE-AD-TENANT-ID");
    
    // Rest of the function remains the same...
  } catch (error) {
    console.error("FHIR API request error:", error);
    return NextResponse.json(
      { error: "Failed to process FHIR request" },
      { status: 500 }
    );
  }
}
```

### Update NextAuth Configuration

Similarly, update the NextAuth configuration to use Key Vault:

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

// Key Vault URL
const keyVaultUrl = process.env.KEY_VAULT_URL || "https://tigercare-kv.vault.azure.net/";

// Create a credential using managed identity
const credential = new DefaultAzureCredential();

// Create a secret client
const secretClient = new SecretClient(keyVaultUrl, credential);

// Function to get a secret from Key Vault
async function getSecret(secretName: string): Promise<string> {
  try {
    const secret = await secretClient.getSecret(secretName);
    return secret.value || "";
  } catch (error) {
    console.error(`Error retrieving secret ${secretName}:`, error);
    return "";
  }
}

// This is an async function that will be called by NextAuth
async function createHandler() {
  // Get secrets from Key Vault
  const clientId = await getSecret("AZURE-AD-CLIENT-ID");
  const clientSecret = await getSecret("AZURE-AD-CLIENT-SECRET");
  const tenantId = await getSecret("AZURE-AD-TENANT-ID");
  const nextAuthSecret = await getSecret("NEXTAUTH-SECRET");
  
  return NextAuth({
    providers: [
      AzureADProvider({
        clientId,
        clientSecret,
        tenantId,
      }),
    ],
    // Rest of the configuration remains the same...
    secret: nextAuthSecret,
  });
}

// Export the handler
export async function GET(req: Request, res: Response) {
  const handler = await createHandler();
  return handler(req, res);
}

export async function POST(req: Request, res: Response) {
  const handler = await createHandler();
  return handler(req, res);
}
```

## Required Dependencies

Add the following dependencies to your project:

```bash
pnpm add @azure/identity @azure/keyvault-secrets
```

## Local Development

For local development, you can use environment variables instead of Key Vault. Create a `.env.local` file in the root of your project:

```
# Entra ID
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# FHIR Service
FHIR_SERVICE_URL=https://your-fhir-service.fhir.azurehealthcareapis.com
FHIR_CLIENT_ID=your-fhir-client-id
FHIR_CLIENT_SECRET=your-fhir-client-secret

# NextAuth
NEXTAUTH_SECRET=your-random-secret-string
NEXTAUTH_URL=http://localhost:3000
```

Then modify your code to fall back to environment variables when Key Vault access fails:

```typescript
// Function to get a secret from Key Vault or environment variable
async function getSecret(secretName: string, envVarName: string): Promise<string> {
  try {
    // Try to get from Key Vault first
    const secret = await secretClient.getSecret(secretName);
    return secret.value || "";
  } catch (error) {
    // Fall back to environment variable
    console.log(`Using environment variable for ${secretName}`);
    return process.env[envVarName] || "";
  }
}
```

This ensures your application works both in production with Key Vault and in local development with environment variables.

# Local Development Guide for FHIR Portal

This guide provides detailed instructions for setting up and testing the FHIR Portal application locally before deploying to Azure.

## Prerequisites

Before starting local development, ensure you have:

1. Node.js version 18 or later installed
2. pnpm installed (version 8 or later recommended)
3. Git installed
4. An Azure account with:
   - An Azure Health Data Services workspace with FHIR service
   - An Entra ID (Azure AD) application registration for authentication

## Step 1: Clone the Repository

```bash
# Clone the repository (if using version control)
git clone https://github.com/your-org/fhir-portal.git

# Or copy the project files to your local machine
cp -r ~/fhir-app-project/fhir-portal ~/my-projects/

# Navigate to the project directory
cd fhir-portal
```

## Step 2: Install Dependencies

```bash
# Install dependencies using pnpm
pnpm install
```

## Step 3: Configure Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```
# Entra ID Configuration
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# FHIR Service Configuration
FHIR_SERVICE_URL=https://your-fhir-service.fhir.azurehealthcareapis.com
FHIR_CLIENT_ID=your-fhir-client-id
FHIR_CLIENT_SECRET=your-fhir-client-secret

# NextAuth Configuration
NEXTAUTH_SECRET=your-random-secret-string
NEXTAUTH_URL=http://localhost:3000
```

Replace the placeholder values with your actual configuration.

## Step 4: Update Authentication to Use MSAL v2

Since MSAL v2.x.x is compatible with Node 18+, we'll update our authentication implementation to use it for better integration with Entra ID.

1. Install MSAL dependencies:

```bash
pnpm add @azure/msal-browser@^2.0.0 @azure/msal-node@^2.0.0 @azure/msal-react@^2.0.0
```

2. Update the NextAuth configuration in `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

// This configuration uses environment variables for local development
const handler = NextAuth({
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "",
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the access token to the token right after sign in
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
```

3. Create an MSAL configuration file at `src/lib/msal-config.ts`:

```typescript
import { Configuration } from "@azure/msal-browser";

// MSAL configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID}`,
    redirectUri: process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Add scopes for API access
export const loginRequest = {
  scopes: ["User.Read", "https://your-fhir-service.fhir.azurehealthcareapis.com/user_impersonation"],
};
```

4. Update the auth context in `src/lib/auth-context.tsx` to use MSAL:

```typescript
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { MsalProvider, useMsal } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./msal-config";

// Initialize MSAL application
const msalInstance = new PublicClientApplication(msalConfig);

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  const login = async () => {
    await signIn('azure-ad', { callbackUrl: '/' });
  };

  const logout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <MsalProvider instance={msalInstance}>
      <AuthContext.Provider
        value={{
          isAuthenticated,
          user: session?.user,
          loading,
          login,
          logout,
        }}
      >
        {children}
      </AuthContext.Provider>
    </MsalProvider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

## Step 5: Update FHIR API Utility

Update the FHIR API utility in `src/lib/fhir-api.ts` to use environment variables for local development:

```typescript
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

// This is a utility function to handle FHIR API requests
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

    // Use environment variables for local development
    const fhirServiceUrl = process.env.FHIR_SERVICE_URL || "";
    const clientId = process.env.FHIR_CLIENT_ID || "";
    const clientSecret = process.env.FHIR_CLIENT_SECRET || "";
    const tenantId = process.env.AZURE_AD_TENANT_ID || "";
    
    // Construct the full URL for the FHIR request
    const url = `${fhirServiceUrl}/${endpoint}`;
    
    // Set up headers for the FHIR request
    const headers = {
      "Content-Type": "application/fhir+json",
      "Accept": "application/fhir+json",
      "Authorization": `Bearer ${session.accessToken}`,
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

## Step 6: Run the Development Server

```bash
# Start the development server
pnpm dev
```

The application will be available at http://localhost:3000.

## Step 7: Test Authentication

1. Navigate to http://localhost:3000
2. Click on "Sign in with Entra ID"
3. You should be redirected to the Microsoft login page
4. After successful authentication, you should be redirected back to the application

## Step 8: Test FHIR Bundle Upload

1. Sign in to the application
2. Navigate to the Upload page
3. Select a valid FHIR bundle JSON file
4. Click "Upload Bundle"
5. Verify that the upload is successful

## Step 9: Test FHIR Data Retrieval

1. Sign in to the application
2. Navigate to the Records page
3. Verify that patient data is displayed
4. Test the different tabs to view various resource types

## Troubleshooting

### Authentication Issues

1. Verify your Entra ID application registration:
   - Ensure the redirect URI is set to http://localhost:3000/api/auth/callback/azure-ad
   - Check that the required API permissions are granted

2. Check environment variables:
   - Ensure all required variables are set in .env.local
   - Verify that the client ID and tenant ID are correct

### FHIR Service Connection Issues

1. Verify FHIR service configuration:
   - Ensure the FHIR service URL is correct
   - Check that the client ID has appropriate permissions

2. Test FHIR service directly:
   - Use a tool like Postman to test the FHIR service API
   - Verify that the service is accessible and responding

### Development Server Issues

1. Clear cache and node_modules:
   ```bash
   rm -rf .next node_modules
   pnpm install
   ```

2. Check for port conflicts:
   ```bash
   lsof -i :3000
   ```

## Next Steps

After successfully testing the application locally, you can proceed with deploying it to Azure by following the instructions in the `deployment-guide.md` document.

Remember to update the environment variables in Azure App Service to match your production configuration, and consider using Azure Key Vault for storing secrets in production as described in the `azure-secrets-management.md` document.

import { Configuration } from "@azure/msal-browser";

// MSAL configuration for browser
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID}`,
    redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback/azure-ad` : "",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Helper function to ensure no double slashes in resource URL
const getFhirScope = () => {
  const fhirUrl = process.env.NEXT_PUBLIC_FHIR_SERVICE_URL || "";
  // Remove any trailing slash
  return fhirUrl.replace(/\/$/, '');
};

// Add scopes for API access
export const loginRequest = {
  scopes: [
    `${getFhirScope()}/.default`
  ],
};

// Add scopes for FHIR service access
export const fhirApiRequest = {
  scopes: [`${getFhirScope()}/.default`],
  resourceUrl: getFhirScope(),
};

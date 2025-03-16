'use client';

import React from 'react';
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "../lib/auth-context-with-msal";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "../lib/msal-config";

// Initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <SessionProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </SessionProvider>
    </MsalProvider>
  );
} 
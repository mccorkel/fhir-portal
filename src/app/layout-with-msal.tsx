"use client";

import { PublicClientApplication, Configuration, LogLevel } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/lib/auth-context";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// MSAL configuration
const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID}`,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : "",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
      logLevel: LogLevel.Info
    }
  }
};

// MSAL instance
let msalInstance: PublicClientApplication | null = null;

// Initialize MSAL instance on client side only
if (typeof window !== 'undefined') {
  msalInstance = new PublicClientApplication(msalConfig);
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          {msalInstance ? (
            <MsalProvider instance={msalInstance}>
              <AuthProvider>
                {children}
              </AuthProvider>
            </MsalProvider>
          ) : (
            <AuthProvider>
              {children}
            </AuthProvider>
          )}
        </SessionProvider>
      </body>
    </html>
  );
}

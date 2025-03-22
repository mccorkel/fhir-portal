'use client';

import { createContext, useContext } from 'react';

interface AzureAuthContextType {
  getServiceToken: () => Promise<string | null>;
}

const AzureAuthContext = createContext<AzureAuthContextType | null>(null);

export function AzureAuthProvider({ children }: { children: React.ReactNode }) {
  const getServiceToken = async () => {
    try {
      // Use the full URL to prevent client-side navigation
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const response = await fetch(`${baseUrl}/api/auth/azure-token`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to get Azure token:', data.error);
        return null;
      }

      return data.accessToken;
    } catch (error) {
      console.error('Error acquiring Azure token:', error);
      return null;
    }
  };

  return (
    <AzureAuthContext.Provider value={{ getServiceToken }}>
      {children}
    </AzureAuthContext.Provider>
  );
}

export function useAzureAuth() {
  const context = useContext(AzureAuthContext);
  if (!context) {
    throw new Error('useAzureAuth must be used within an AzureAuthProvider');
  }
  return context;
} 
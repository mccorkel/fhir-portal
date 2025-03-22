'use client';

import { CurrentUserProvider } from '@/lib/current-user-context';
import { AuthProvider } from "@/lib/auth-context";
import { AzureAuthProvider } from "@/lib/azure-auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AzureAuthProvider>
        <CurrentUserProvider>
          {children}
        </CurrentUserProvider>
      </AzureAuthProvider>
    </AuthProvider>
  );
} 
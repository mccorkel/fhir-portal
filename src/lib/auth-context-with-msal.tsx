"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { loginRequest, fhirApiRequest } from "./msal-config";

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  acquireFhirToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  acquireFhirToken: async () => null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const { instance, accounts } = useMsal();
  const isMsalAuthenticated = useIsAuthenticated();
  const loading = status === 'loading';
  const isAuthenticated = status === 'authenticated' || isMsalAuthenticated;
  const [user, setUser] = useState<any>(null);

  // Update user when session or MSAL accounts change
  useEffect(() => {
    if (session?.user) {
      setUser(session.user);
    } else if (accounts.length > 0) {
      setUser({
        name: accounts[0].name,
        email: accounts[0].username,
      });
    } else {
      setUser(null);
    }
  }, [session, accounts]);

  const login = async () => {
    if (typeof window !== 'undefined' && window.navigator.userAgent.indexOf('Node.js') === -1) {
      try {
        // Try MSAL login first
        await instance.loginPopup(loginRequest);
      } catch (error) {
        console.error("MSAL login failed, falling back to NextAuth:", error);
        // Fall back to NextAuth
        await signIn('azure-ad', { callbackUrl: '/' });
      }
    } else {
      // Server-side or Node.js environment, use NextAuth
      await signIn('azure-ad', { callbackUrl: '/' });
    }
  };

  const logout = async () => {
    if (isMsalAuthenticated) {
      // MSAL logout
      instance.logoutPopup({
        postLogoutRedirectUri: window.location.origin,
      });
    } else {
      // NextAuth logout
      await signOut({ callbackUrl: '/' });
    }
  };

  const acquireFhirToken = async (): Promise<string | null> => {
    if (!isAuthenticated) return null;

    try {
      // Get token from our token endpoint
      const response = await fetch('/api/auth/token');
      const data = await response.json();

      if (!response.ok || !data.accessToken) {
        console.error("Failed to acquire FHIR token:", data.error);
        return null;
      }

      return data.accessToken;
    } catch (error) {
      console.error("Error acquiring FHIR token:", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      loading,
      login,
      logout,
      acquireFhirToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

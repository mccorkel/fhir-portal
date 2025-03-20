"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { loginRequest } from "./msal-config";

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
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
      return;
    }

    if (session?.user) {
      setUser(session.user);
      setLoading(false);
    } else if (accounts.length > 0) {
      setUser({
        name: accounts[0].name,
        email: accounts[0].username,
        id: accounts[0].localAccountId,
      });
      setLoading(false);
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [session, accounts, status]);

  const login = async () => {
    try {
      await signIn('azure-ad', { callbackUrl: '/' });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (isMsalAuthenticated) {
        await instance.logoutPopup({
          postLogoutRedirectUri: window.location.origin,
        });
      }
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  const acquireFhirToken = async (): Promise<string | null> => {
    if (!session?.accessToken) return null;
    return session.accessToken;
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated: status === 'authenticated' || isMsalAuthenticated,
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

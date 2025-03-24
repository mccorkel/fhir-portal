'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface CurrentUserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  logout: () => void;
}

const CurrentUserContext = createContext<CurrentUserContextType>({
  user: null,
  setUser: () => {},
  isLoading: true,
  logout: () => {},
});

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for user data in cookies on mount
    const userCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('user='));
    
    if (userCookie) {
      try {
        const userData = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user cookie:', error);
      }
    }
    setIsLoading(false);
  }, []);

  const logout = async () => {
    setUser(null);
    // Clear cookies
    document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    // Redirect to home
    window.location.href = '/';
  };

  return (
    <CurrentUserContext.Provider value={{ user, setUser, isLoading, logout }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
} 
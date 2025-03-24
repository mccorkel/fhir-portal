'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/current-user-context';

export function GoogleLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { user, logout } = useCurrentUser();

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const redirectUri = `${baseUrl}/api/auth/google/callback`;
      const response = await fetch(`/api/auth/google/initiate?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (!response.ok) {
        throw new Error('Failed to initiate login');
      }
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error('Failed to initiate login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 justify-center">
          {user.picture && (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
          )}
          <span>Welcome, {user.name}!</span>
        </div>
        <Button
          onClick={logout}
          variant="outline"
          className="w-full"
        >
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleLogin}
      disabled={isLoading}
      className="w-full"
    >
      {isLoading ? 'Loading...' : 'Sign in with Google'}
    </Button>
  );
} 
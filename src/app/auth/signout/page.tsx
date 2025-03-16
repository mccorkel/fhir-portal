"use client";

import React, { useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { useRouter } from 'next/navigation';

export default function SignOut() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const performSignOut = async () => {
      await logout();
      router.push('/');
    };

    performSignOut();
  }, [logout, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm text-center">
        <h1 className="text-4xl font-bold mb-8">Signing out...</h1>
        <p className="text-lg text-gray-600">Please wait while we sign you out.</p>
      </div>
    </div>
  );
} 
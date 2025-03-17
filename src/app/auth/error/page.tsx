"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8">Authentication Error</h1>
          <p className="mb-8 text-lg text-red-600">
            {error || 'An error occurred during authentication'}
          </p>
          <a
            href="/auth/signin"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Return to Sign In
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8">Loading...</h1>
          <p className="text-lg text-gray-600">Please wait while we load the error details...</p>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
} 
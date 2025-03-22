"use client";

import { Loader2 } from "lucide-react";

interface LoadingProps {
  message?: string;
  className?: string;
}

export function Loading({ message = "Loading...", className = "" }: LoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
} 
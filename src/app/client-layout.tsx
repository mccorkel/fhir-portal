'use client';

import { Providers } from "./providers";
import { Header } from "@/components/ui/header";
import { Toaster } from "@/components/ui/toaster";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Header />
      <main>{children}</main>
      <Toaster />
    </Providers>
  );
} 
import React from 'react';
import type { Metadata } from "next";
import { Providers } from "./providers";
import { Header } from "@/components/ui/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "TigerCare FHIR Portal",
  description: "Access and manage your FHIR health records",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main className="min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
} 
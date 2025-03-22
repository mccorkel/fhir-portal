"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/current-user-context";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";

export function Header() {
  const { user } = useCurrentUser();

  return (
    <header className="border-b">
      <div className="container mx-auto py-4 px-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            TigerCare
          </Link>

          <nav className="flex items-center gap-6">
            {user ? (
              <>
                <Link href="/health-records" className="text-gray-600 hover:text-gray-900">
                  Health Records
                </Link>
                <Link href="/upload" className="text-gray-600 hover:text-gray-900">
                  Upload
                </Link>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">ID: {user.id}</span>
                  <div className="w-[200px]">
                    <GoogleLoginButton />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-[200px]">
                <GoogleLoginButton />
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
} 
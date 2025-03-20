"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context-with-msal";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Header() {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="border-b">
      <div className="container mx-auto py-4 px-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            FHIR Portal
          </Link>
        </h1>
        {isAuthenticated && (
          <div className="flex items-center gap-4">
            <nav className="flex gap-4">
              <Link 
                href="/" 
                className={`text-blue-600 hover:underline ${pathname === '/' ? 'font-bold' : ''}`}
              >
                Home
              </Link>
              <Link 
                href="/upload" 
                className={`text-blue-600 hover:underline ${pathname === '/upload' ? 'font-bold' : ''}`}
              >
                Upload
              </Link>
              <Link 
                href="/records" 
                className={`text-blue-600 hover:underline ${pathname === '/records' ? 'font-bold' : ''}`}
              >
                My Records
              </Link>
              <Link 
                href="/health-records" 
                className={`text-blue-600 hover:underline ${pathname === '/health-records' ? 'font-bold' : ''}`}
              >
                Health Records
              </Link>
            </nav>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={logout}
              className="ml-4"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
} 
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface AuthGuardProps {
  children: React.ReactNode;
}

// Routes that strictly require user login
const PROTECTED_PREFIXES = [
  "/checkout",
  "/bookings",
  "/settings",
  "/notifications",
  "/escrow",
  "/host",
  "/admin",
];

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoading, isAuthenticated, isHost, isAdmin } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [deniedRoleMessage, setDeniedRoleMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isProtectedRoute = Boolean(
    pathname && PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  );
  const isLoginPage = Boolean(pathname && (pathname === "/login" || pathname.startsWith("/login/")));

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!isAuthenticated) {
      if (isProtectedRoute) {
        // Redirect unauthenticated user to login with original destination + query params
        const queryString = searchParams?.toString();
        const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
        router.replace(`/login?redirect=${encodeURIComponent(fullPath)}`);
      }
      return;
    }

    // Authenticated user checks
    const homeFor = isAdmin ? "/admin" : isHost ? "/host" : "/";

    if (isLoginPage) {
      const redirectUrl = searchParams.get("redirect");
      // A stale ?redirect= (e.g. left over from an earlier bounce off /admin)
      // must never send this user into a portal their role doesn't own.
      const redirectBlocked =
        !redirectUrl ||
        (redirectUrl.startsWith("/admin") && !isAdmin) ||
        (redirectUrl.startsWith("/host") && !isHost);
      router.replace(redirectBlocked ? homeFor : redirectUrl!);
      return;
    }

    // Role-based route protection
    if (pathname.startsWith("/admin") && !isAdmin) {
      setDeniedRoleMessage("Access restricted: This area requires an authenticated Admin account.");
      const timer = setTimeout(() => {
        router.replace(homeFor);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (pathname.startsWith("/host") && !isHost) {
      setDeniedRoleMessage("Access restricted: This area requires an authenticated Farm Host account.");
      const timer = setTimeout(() => {
        router.replace(homeFor);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setDeniedRoleMessage(null);
    }
  }, [isLoading, isAuthenticated, isHost, isAdmin, pathname, searchParams, router, isProtectedRoute, isLoginPage, mounted]);

  // Guard SSR and initial hydration pass so server and client HTML match 100%
  if (!mounted) {
    return <>{children}</>;
  }

  // Loading state while checking token - only block rendering for strictly protected routes
  if (isLoading && isProtectedRoute) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="size-12 rounded-full border-4 border-brand-200 border-t-brand-700 animate-spin" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-ink">Verifying Security Session...</p>
          <p className="text-xs text-ink-muted">Validating encrypted token credentials</p>
        </div>
      </div>
    );
  }

  // If unauthenticated and on a protected route, render nothing while redirecting
  if (!isAuthenticated && isProtectedRoute) {
    return null;
  }

  // If guest attempting to access host route, show access restriction banner while redirecting
  if (deniedRoleMessage) {
    return (
      <div className="mx-auto max-w-xl my-16 px-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100 text-danger">
            <ShieldAlert size={30} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-950">Host Authorization Required</h2>
            <p className="mt-2 text-sm text-red-800">{deniedRoleMessage}</p>
          </div>
          <p className="text-xs text-red-700/80">Redirecting to traveler home...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

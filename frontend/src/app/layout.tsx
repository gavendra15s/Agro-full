import type { Metadata } from "next";
import { type ReactNode, Suspense } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ToastProvider } from "@/lib/toast-context";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import "./globals.css";

export const metadata: Metadata = {
  title: "KhetYatra — Explore Rural India, Safely",
  description:
    "Authenticated agrotourism experiences with real-time safety metrics and environmental landslide monitoring.",
};

/**
 * Root shell only. Site chrome lives in the (site) and (auth) route groups so
 * the auth screens can render their own header without fighting the main nav.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <ToastProvider>
          <AuthProvider>
            <Suspense fallback={null}>
              <AuthGuard>{children}</AuthGuard>
            </Suspense>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata = { title: "Sign In / Register — KhetYatra" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const role = Array.isArray(sp.role) ? sp.role[0] : (sp.role ?? "guest");

  return (
    <Suspense
      fallback={
        <div className="w-full max-w-xl rounded-2xl border border-line bg-surface p-10 animate-pulse text-center">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4" />
          <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto" />
        </div>
      }
    >
      <AuthCard initialRole={role} />
    </Suspense>
  );
}

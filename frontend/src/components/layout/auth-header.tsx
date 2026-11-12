"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, ShieldCheck, X } from "lucide-react";
import { MATRIX_FEATURE_ENABLED } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/report", label: "Report Landslide" },
  { href: "/live", label: "Live Landslides" },
  ...(MATRIX_FEATURE_ENABLED ? [{ href: "/matrix", label: "Safety Matrix" }] : []),
];

export function AuthHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-brand-700 shrink-0"
        >
          <span className="size-2.5 rounded-full bg-brand-600 inline-block" />
          KHETYATRA
        </Link>

        {/* Center Desktop Navigation */}
        <nav className="hidden items-center gap-4 lg:gap-6 md:flex">
          {NAV.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-xs lg:text-sm foant-medium transition-colors hover:text-brand-700",
                  isActive ? "font-bold text-brand-700" : "text-ink"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="text-xs sm:text-sm font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-3 py-1.5 hover:bg-brand-100 transition-colors"
          >
            Signup / Login
          </Link>

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            className="rounded-md p-2 text-ink hover:bg-black/5 md:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {open ? (
        <nav className="border-t border-line bg-canvas md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 space-y-1">
            {NAV.map((item) => {
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={`mobile-${item.href}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-black/5",
                    isActive ? "bg-brand-50 text-brand-700 font-bold" : "text-ink"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="border-t border-line pt-2 mt-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                <span>Signup / Login</span>
                <ShieldCheck size={16} />
              </Link>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

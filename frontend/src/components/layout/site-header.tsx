"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { MATRIX_FEATURE_ENABLED } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  isHighlight?: boolean;
};

// Base Navigation for all general users
const BASE_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/report", label: "Report Landslide" },
  { href: "/live", label: "Live Landslides" },
  ...(MATRIX_FEATURE_ENABLED ? [{ href: "/matrix", label: "Safety Matrix" }] : []),
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, isHost, isAdmin, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const authed = mounted && isAuthenticated;
  const adminRole = mounted && isAdmin;
  const hostRole = mounted && isHost;

  let navItems: NavItem[] = [...BASE_NAV];
  if (authed) {
    if (adminRole) {
      navItems = [
        ...BASE_NAV,
        { href: "/admin", label: "Admin Console", isHighlight: true },
      ];
    } else if (hostRole) {
      navItems = [
        ...BASE_NAV,
        { href: "/host", label: "My Hostings" },
        { href: "/host/farms/new", label: "List New Farm", isHighlight: true },
      ];
    } else {
      navItems = [
        ...BASE_NAV,
        { href: "/bookings", label: "My Bookings" },
      ];
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href={isAdmin ? "/admin" : isHost ? "/host" : "/"}
          className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-brand-700 shrink-0"
        >
          <span className="size-2.5 rounded-full bg-brand-600 inline-block" />
          AgroSafe Travel
        </Link>

        {/* Center Desktop Navigation */}
        <nav className="hidden items-center gap-4 lg:gap-5 md:flex">
          {navItems.map((item, idx) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/host"
                ? pathname === "/host"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={`${item.href}-${item.label}-${idx}`}
                href={item.href}
                className={cn(
                  "text-xs lg:text-sm font-medium transition-colors hover:text-brand-700 flex items-center gap-1.5",
                  isActive ? "font-bold text-brand-700" : "text-ink",
                  item.isHighlight &&
                    "rounded-md bg-brand-50 px-2.5 py-1 text-brand-800 font-semibold border border-brand-200 hover:bg-brand-100"
                )}
              >
                {item.isHighlight && <PlusCircle size={14} className="text-brand-700" />}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Icons & Auth Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {authed ? (
            <>
              {/* Notifications */}
              <Link
                href="/notifications"
                aria-label="Notifications"
                className={cn(
                  "relative rounded-md p-2 text-ink hover:bg-black/5 transition-colors",
                  pathname === "/notifications" && "bg-black/5 text-brand-700"
                )}
              >
                <Bell size={19} />
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger ring-2 ring-canvas" />
              </Link>

              {/* Settings */}
              <Link
                href="/settings"
                aria-label="Settings"
                className={cn(
                  "rounded-md p-2 text-ink hover:bg-black/5 transition-colors",
                  pathname === "/settings" && "bg-black/5 text-brand-700"
                )}
              >
                <Settings size={19} />
              </Link>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                title="Sign out of your session"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-danger px-2.5 py-1.5 rounded-md border border-line hover:border-red-200 hover:bg-red-50 transition-colors"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-xs sm:text-sm font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-3 py-1.5 hover:bg-brand-100 transition-colors"
            >
              Signup / Login
            </Link>
          )}

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

            {navItems.map((item, idx) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : item.href === "/host"
                  ? pathname === "/host"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={`mobile-${item.href}-${idx}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-black/5",
                    isActive ? "bg-brand-50 text-brand-700 font-bold" : "text-ink",
                    item.isHighlight && "bg-brand-50/60 text-brand-800 font-semibold"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="border-t border-line pt-2 mt-2">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-red-50"
                >
                  <span>Log Out</span>
                  <LogOut size={16} />
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  <span>Signup / Login</span>
                  <ShieldCheck size={16} />
                </Link>
              )}
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}

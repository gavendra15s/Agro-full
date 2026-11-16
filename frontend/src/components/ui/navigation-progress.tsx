"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Complete progress on route change
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Listen for navigation clicks on internal links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find closest anchor
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external, hash, target blank, or modifier clicks
      if (
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // If already on the same exact path and query, skip
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (href === currentUrl) return;

      // Start progress immediately
      setLoading(true);
      setProgress(25);

      const step1 = setTimeout(() => setProgress(65), 150);
      const step2 = setTimeout(() => setProgress(85), 400);

      // Fallback timeout in case navigation is cancelled or fast
      const fallback = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 5000);

      return () => {
        clearTimeout(step1);
        clearTimeout(step2);
        clearTimeout(fallback);
      };
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-brand-600 via-emerald-400 to-teal-400 shadow-sm shadow-emerald-500/50 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}


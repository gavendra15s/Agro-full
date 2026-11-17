import Link from "next/link";
import { Globe, Mail, ShieldCheck, PhoneCall } from "lucide-react";
import { MATRIX_FEATURE_ENABLED } from "@/lib/feature-flags";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-brand-600 inline-block" />
              <span className="font-extrabold text-lg text-brand-800">KhetYatra</span>
            </div>
            <p className="text-xs text-ink-muted max-w-sm leading-relaxed">
              Pioneering safe, disaster-resilient agrotourism across mountain and rural farming belts.
              Combining seasonal risk matrices, satellite CNN hazard detection, and 100% financial escrow protection.
            </p>
            <div className="flex items-center gap-2 text-xs text-ink-subtle pt-2">
              <PhoneCall size={14} className="text-danger" />
              <span>24/7 Disaster Helpline: <strong>1070 / 1078</strong></span>
            </div>
          </div>

          {/* Travellers Col */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-ink">Travellers</p>
            <ul className="space-y-2 text-xs text-ink-muted">
              <li><Link href="/" className="hover:text-brand-700">Search Farmstays</Link></li>
              <li><Link href="/safety" className="hover:text-brand-700">Safety Check</Link></li>
              {MATRIX_FEATURE_ENABLED ? (
                <li><Link href="/matrix" className="hover:text-brand-700">12-Month Safety Matrix</Link></li>
              ) : null}
              <li><Link href="/bookings" className="hover:text-brand-700">My Bookings</Link></li>
              <li><Link href="/escrow" className="hover:text-brand-700">Escrow Refund Policy</Link></li>
            </ul>
          </div>

          {/* Host Operations Col */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-ink">Host &amp; Admin</p>
            <ul className="space-y-2 text-xs text-ink-muted">
              <li><Link href="/admin" className="text-brand-700 font-semibold hover:underline">Admin Command Hub</Link></li>
              <li><Link href="/host" className="hover:text-brand-700">Host Dashboard</Link></li>
              <li><Link href="/host/farms/new" className="hover:text-brand-700">List New Farmstay</Link></li>
              <li><Link href="/host/warnings/new" className="hover:text-brand-700">Issue Disaster Warning</Link></li>
              <li><Link href="/escrow" className="hover:text-brand-700">Escrow Payouts Vault</Link></li>
              <li><Link href="/notifications" className="hover:text-brand-700">Broadcast Log</Link></li>
            </ul>
          </div>

          {/* Disaster & Safety Col */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-ink">Safety & Alerts</p>
            <ul className="space-y-2 text-xs text-ink-muted">
              <li><Link href="/warnings" className="hover:text-brand-700">Live Warning Grid</Link></li>
              <li><Link href="/live" className="hover:text-brand-700">Landslide Hazard Map</Link></li>
              <li><Link href="/report" className="hover:text-brand-700">Upload Hazard Photo (CNN)</Link></li>
              <li><Link href="/settings" className="hover:text-brand-700">Alert Settings</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line pt-6 text-xs text-ink-subtle">
          <p>© 2026 KhetYatra. All rights reserved. Zero-Liability Escrow Protected.</p>
          <div className="flex gap-4">
            <Link href="/safety" className="hover:underline">Terms of Escrow</Link>
            <Link href="/settings" className="hover:underline">Privacy & Location Data</Link>
            {MATRIX_FEATURE_ENABLED ? (
              <Link href="/matrix" className="hover:underline">Himalayan Matrix Methodology</Link>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { ArrowRight, Lock, MapPin, ShieldCheck } from "lucide-react";
import { FarmCard } from "@/components/home/farm-card";
import { HeroSearch } from "@/components/home/hero-search";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { PlatformStatsCounter } from "@/components/home/platform-stats";
import { ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : (v ?? ""));

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = {
    state: one(params.state),
    district: one(params.district),
    subDistrict: one(params.subDistrict),
    checkIn: one(params.checkIn),
  };

  const [farms, platformStats] = await Promise.all([
    api.farms.list({
      state: query.state || undefined,
      district: query.district || undefined,
      subdistrict: query.subDistrict || undefined,
    }),
    api.stats.get().catch(() => undefined),
  ]);
  const filtered = Boolean(query.state || query.district || query.subDistrict);

  return (
    <>
      {/* Dynamic Video & Image Hero Carousel */}
      <HeroCarousel>
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-sm">
            Explore Rural India, Safely.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/95 sm:text-lg drop-shadow-xs">
            Discover authenticated agrotourism experiences with real-time safety metrics and
            environmental landslide monitoring.
          </p>

          <div className="mt-10 text-left">
            <HeroSearch initial={query} />
          </div>
        </div>
      </HeroCarousel>

      {/* Live Platform Users & Network Statistics Counter */}
      <PlatformStatsCounter initialStats={platformStats} />

      {/* About / Introduction */}
      <section id="about" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">About AgroSafe Travel</h2>
          <p className="mt-4 text-ink-muted">
            AgroSafe Travel connects travelers with verified farmstays across the Himalayan belt, pairing
            every booking with an escrow-protected payment and real-time landslide monitoring for the
            region you&apos;re visiting. Hosts get a direct channel to safety-conscious guests; guests get
            a stay they can trust, and their money back if the ground genuinely isn&apos;t safe to travel to.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-surface p-6">
            <MapPin size={22} className="text-brand-700" aria-hidden />
            <h3 className="mt-3 font-bold">Verified Farmstays</h3>
            <p className="mt-1.5 text-sm text-ink-muted">
              Every listing is tied to a real host and a real location, checked before it goes live.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6">
            <Lock size={22} className="text-brand-700" aria-hidden />
            <h3 className="mt-3 font-bold">Escrow-Protected Payments</h3>
            <p className="mt-1.5 text-sm text-ink-muted">
              Funds are held until 24 hours after check-in, and refunded if a hazard blocks travel.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-surface p-6">
            <ShieldCheck size={22} className="text-brand-700" aria-hidden />
            <h3 className="mt-3 font-bold">Live Hazard Monitoring</h3>
            <p className="mt-1.5 text-sm text-ink-muted">
              Landslide reports and safety scores are tracked per district, updated as conditions change.
            </p>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section id="farmstays" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Verified Farmstays
            </h2>
            <p className="mt-2 text-ink-muted">
              {filtered
                ? `${farms.length} ${farms.length === 1 ? "stay" : "stays"} matching your search.`
                : "Top-rated agricultural experiences with current safety status."}
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline"
          >
            View All Destinations <ArrowRight size={16} />
          </Link>
        </div>

        {farms.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {farms.map((farm) => (
              <FarmCard key={farm.slug} farm={farm} />
            ))}
          </div>
        ) : (
          <p className="mt-10 rounded-lg border border-dashed border-line p-10 text-center text-ink-muted">
            No farmstays match that area yet. Try a wider search.
          </p>
        )}
      </section>

      {/* Monitoring banner */}
      <section className="bg-brand-800 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-start gap-4">
            <ShieldCheck size={36} className="shrink-0" aria-hidden />
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Active Monitoring Enabled</h2>
              <p className="mt-1 text-white/90">
                Our Safety Matrix monitors local soil stability and weather patterns 24/7.
              </p>
            </div>
          </div>

          <ButtonLink href="/live" variant="light" size="md" className="shrink-0">
            View Live Safety Map
          </ButtonLink>
        </div>
      </section>

      {/* Strategic Plan */}
      <section id="strategic-plan" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Strategic Plan</h2>
          <p className="mt-2 text-ink-muted">Where AgroSafe Travel is headed, in three phases.</p>
        </div>

        <ol className="mt-10 space-y-6">
          <li className="flex gap-4 rounded-lg border border-line bg-surface p-6">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
              1
            </span>
            <div>
              <h3 className="font-bold">
                Verified Network &amp; Landslide Reporting
                <span className="ml-2 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800">
                  Current
                </span>
              </h3>
              <p className="mt-1.5 text-sm text-ink-muted">
                Onboard verified Himalayan hosts, launch escrow-protected bookings, and crowdsource live
                landslide reports across covered districts.
              </p>
            </div>
          </li>
          <li className="flex gap-4 rounded-lg border border-line bg-surface p-6">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-subtle/15 text-sm font-bold text-ink">
              2
            </span>
            <div>
              <h3 className="font-bold">Predictive Safety Matrix</h3>
              <p className="mt-1.5 text-sm text-ink-muted">
                Combine historical hazard data with weather feeds to forecast risk ahead of a booking,
                not just react to it.
              </p>
            </div>
          </li>
          <li className="flex gap-4 rounded-lg border border-line bg-surface p-6">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-subtle/15 text-sm font-bold text-ink">
              3
            </span>
            <div>
              <h3 className="font-bold">Pan-Himalayan Expansion</h3>
              <p className="mt-1.5 text-sm text-ink-muted">
                Extend coverage beyond the initial districts and open a community disaster-response
                channel between hosts, guests, and local authorities.
              </p>
            </div>
          </li>
        </ol>
      </section>
    </>
  );
}

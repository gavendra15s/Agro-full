import { notFound } from "next/navigation";
import {
  Footprints,
  Leaf,
  type LucideIcon,
  MapPin,
  Map as MapIcon,
  ShieldCheck,
  ShieldPlus,
  Siren,
  Ticket,
  Utensils,
  Wifi,
} from "lucide-react";
import { BookingCard } from "@/components/farm/booking-card";
import { FarmGallery } from "@/components/farm/farm-gallery";
import { RiskCard } from "@/components/farm/risk-card";
import { Card } from "@/components/ui/card";
import { SafetyBar } from "@/components/ui/safety-badge";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : (v ?? ""));

export async function generateStaticParams() {
  try {
    const farms = await api.farms.list();
    return farms.map((farm) => ({ slug: farm.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Params }) {
  try {
    const { slug } = await params;
    const farm = await api.farms.getBySlug(slug);
    return { title: farm ? `${farm.name} — AgroSafe Travel` : "Farmstay — AgroSafe Travel" };
  } catch {
    return { title: "Farmstay — AgroSafe Travel" };
  }
}

/** Keyword → icon, so a new amenity string still renders something sensible. */
const AMENITY_ICONS: Array<[RegExp, LucideIcon]> = [
  [/wi-?fi|connect/i, Wifi],
  [/safety|monitor/i, ShieldCheck],
  [/cuisine|food|breakfast|meal|dham/i, Utensils],
  [/walk|trek|tour|heritage|harvest|trail|picking/i, Footprints],
  [/escrow|protection/i, ShieldPlus],
];

const iconFor = (amenity: string) =>
  AMENITY_ICONS.find(([re]) => re.test(amenity))?.[1] ?? Leaf;

export default async function FarmPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const farm = await api.farms.getBySlug(slug);

  if (!farm) notFound();

  const info = [
    { icon: Ticket, title: "Cancellation Policy", body: farm.cancellationPolicy || "Full refund if cancelled 48 hours prior to check-in." },
    { icon: Siren, title: "Emergency Contact", body: farm.emergencyContact || "On-site caretaker available 24/7." },
    { icon: MapIcon, title: "Regional Guidelines", body: farm.regionalGuidelines || "Stick to marked orchard paths. Respect local guidelines." },
  ];

  const amenities = Array.isArray(farm.amenities) && farm.amenities.length > 0
    ? farm.amenities
    : ["Organic Farm", "Rural Connect Wi-Fi", "Safety Monitoring", "Escrow Protection"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <SafetyBar status={farm.safety || "safe"} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{farm.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-ink-muted">
            <MapPin size={18} aria-hidden />
            {farm.location}
          </p>

          <div className="mt-6">
            <FarmGallery images={farm.images} alt={farm.name} />
          </div>

          <div className="mt-8">
            <RiskCard farmSlug={farm.slug} initialDate={one(sp.checkIn)} />
          </div>

          <Card className="mt-8 p-5 sm:p-7">
            <h2 className="border-b border-line pb-4 text-2xl font-bold tracking-tight">
              About the Farm
            </h2>
            <p className="mt-5 leading-relaxed text-ink-muted">{farm.summary}</p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {amenities.map((amenity) => {
                const Icon = iconFor(amenity);
                return (
                  <li key={amenity} className="flex items-center gap-2.5 text-sm font-semibold">
                    <Icon size={18} className="shrink-0 text-brand-700" aria-hidden />
                    {amenity}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        <BookingCard
          farm={farm}
          defaults={{ checkIn: one(sp.checkIn), checkOut: one(sp.checkOut) }}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {info.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Icon size={18} className="shrink-0 text-brand-700" aria-hidden />
              {title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

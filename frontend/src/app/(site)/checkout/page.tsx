import { notFound } from "next/navigation";
import { OrderSummary } from "@/components/checkout/order-summary";
import { PaymentForm } from "@/components/checkout/payment-form";
import { api } from "@/lib/api";
import { quote } from "@/lib/pricing";
import { nightsBetween } from "@/lib/utils";

export const metadata = { title: "Secure Checkout — KhetYatra" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : (v ?? ""));

const dayMonth = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
    : "—";

export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const farmSlug = one(sp.farm) || "apple-blossom-retreat";

  // Fetch farm from backend API
  const farm = (await api.farms.getBySlug(farmSlug)) || (await api.farms.list())[0];
  if (!farm) notFound();

  const checkIn = one(sp.checkIn);
  const checkOut = one(sp.checkOut);
  const guests = Number(one(sp.guests)) || 2;
  const nights = nightsBetween(checkIn, checkOut) || 3;

  const q = quote(farm.pricePerNight, nights, guests);
  const dateRange =
    checkIn && checkOut ? `${dayMonth(checkIn)} – ${dayMonth(checkOut)}` : `${nights} nights`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Secure Checkout</h1>
      <p className="mt-2 text-ink-muted">Complete your booking details below.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <PaymentForm
          total={q.total}
          farmId={farm.id || 1}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={guests}
        />
        <OrderSummary farm={farm} quote={q} guests={guests} dateRange={dateRange} />
      </div>
    </div>
  );
}

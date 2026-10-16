"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Minus, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { quote } from "@/lib/pricing";
import type { Farm } from "@/lib/types";
import { formatINR, nightsBetween } from "@/lib/utils";

interface Props {
  farm: Farm;
  defaults: { checkIn: string; checkOut: string };
}

const FALLBACK_MAX_GUESTS = 20;

export function BookingCard({ farm, defaults }: Props) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [checkIn, setCheckIn] = useState(defaults.checkIn);
  const [checkOut, setCheckOut] = useState(defaults.checkOut);
  const [guests, setGuests] = useState(2);
  const [availableSeats, setAvailableSeats] = useState<number | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [holding, setHolding] = useState(false);

  const nights = nightsBetween(checkIn, checkOut);
  // Same quote the checkout page charges — the two must never disagree.
  const { stay, serviceFee, taxes, total } = quote(farm.pricePerNight, nights, guests);

  // Seats left for the currently-selected dates. Refetched on every date change
  // so the guest count can never be set higher than what the farm can actually hold.
  useEffect(() => {
    if (!checkIn || !checkOut || nights === 0) {
      setAvailableSeats(null);
      return;
    }
    let cancelled = false;
    setCheckingAvailability(true);
    api.farms
      .availability(farm.slug, checkIn, checkOut)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setAvailableSeats(res.data.availableSeats);
          setGuests((g) => Math.min(g, Math.max(1, res.data!.availableSeats)));
        } else {
          setAvailableSeats(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
  }, [farm.slug, checkIn, checkOut, nights]);

  const soldOut = availableSeats !== null && availableSeats <= 0;
  const maxSelectable = availableSeats !== null ? Math.max(availableSeats, 1) : FALLBACK_MAX_GUESTS;

  function setGuestCount(next: number) {
    if (!Number.isFinite(next)) return;
    setGuests(Math.min(maxSelectable, Math.max(1, Math.floor(next))));
  }

  async function book() {
    const params = new URLSearchParams({
      farm: farm.slug,
      checkIn,
      checkOut,
      guests: String(guests),
    });

    if (!isAuthenticated) {
      const checkoutUrl = `/checkout?${params.toString()}`;
      router.push(`/login?redirect=${encodeURIComponent(checkoutUrl)}`);
      return;
    }

    setHolding(true);
    try {
      if (farm.id) {
        const holdRes = await api.bookings.createHold({
          farm_id: farm.id,
          stay_start_date: checkIn,
          stay_end_date: checkOut,
          total_guests: guests,
        });
        if (holdRes.success && holdRes.data?.booking_id) {
          params.set("holdId", String(holdRes.data.booking_id));
        }
      }
    } catch (err) {
      console.warn("Hold creation fallback:", err);
    } finally {
      setHolding(false);
      router.push(`/checkout?${params.toString()}`);
    }
  }

  return (
    <aside className="rounded-lg border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-24">
      <p className="flex items-baseline justify-between">
        <span className="text-3xl font-extrabold tracking-tight">
          {formatINR(farm.pricePerNight)}
        </span>
        <span className="text-ink-muted">/ night / person</span>
      </p>

      <div className="mt-5 grid grid-cols-2 rounded-md border border-line">
        <Field label="Check-in" className="border-r border-line p-3">
          {(id) => (
            <Input
              id={id}
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="border-0 px-0 py-0"
            />
          )}
        </Field>
        <Field label="Check-out" className="p-3">
          {(id) => (
            <Input
              id={id}
              type="date"
              min={checkIn || undefined}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="border-0 px-0 py-0"
            />
          )}
        </Field>
      </div>

      <Field
        label="Guests"
        className="mt-3 rounded-md border border-line p-3"
        hint={
          checkingAvailability
            ? "Checking seats available..."
            : availableSeats !== null
            ? soldOut
              ? "Fully booked for these dates."
              : `${availableSeats} seat${availableSeats === 1 ? "" : "s"} available for these dates.`
            : undefined
        }
      >
        {(id) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Decrease guests"
              onClick={() => setGuestCount(guests - 1)}
              disabled={soldOut || guests <= 1}
              className="flex size-7 shrink-0 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:border-brand-300 hover:text-brand-700 disabled:pointer-events-none disabled:opacity-40"
            >
              <Minus size={14} aria-hidden />
            </button>

            <input
              id={id}
              type="number"
              inputMode="numeric"
              min={1}
              max={maxSelectable}
              value={guests}
              disabled={soldOut}
              onChange={(e) => setGuestCount(Number(e.target.value))}
              className="w-12 border-0 bg-transparent p-0 text-center text-sm font-semibold text-ink [appearance:textfield] focus:outline-none disabled:opacity-40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />

            <button
              type="button"
              aria-label="Increase guests"
              onClick={() => setGuestCount(guests + 1)}
              disabled={soldOut || guests >= maxSelectable}
              className="flex size-7 shrink-0 items-center justify-center rounded-md border border-line text-ink-muted transition-colors hover:border-brand-300 hover:text-brand-700 disabled:pointer-events-none disabled:opacity-40"
            >
              <Plus size={14} aria-hidden />
            </button>

            <span className="text-xs text-ink-muted">{guests === 1 ? "Guest" : "Guests"}</span>
          </div>
        )}
      </Field>

      <dl className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-muted">
            {formatINR(farm.pricePerNight)} × {nights} {nights === 1 ? "night" : "nights"} × {guests}{" "}
            {guests === 1 ? "guest" : "guests"}
          </dt>
          <dd className="font-medium">{formatINR(stay)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Service Fee</dt>
          <dd className="font-medium">{formatINR(serviceFee)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Taxes &amp; Fees</dt>
          <dd className="font-medium">{formatINR(taxes)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="text-xl font-bold">Total Price</dt>
          <dd className="text-2xl font-extrabold">{formatINR(total)}</dd>
        </div>
      </dl>

      <Button
        onClick={book}
        disabled={nights === 0 || soldOut || holding}
        size="lg"
        className="mt-5 w-full flex-col gap-0.5"
      >
        <span>{holding ? "Holding Seats (15m)..." : "Book & Hold in Escrow"}</span>
        <span className="text-[10px] font-medium tracking-wider text-white/80 uppercase">
          15-Min Inventory Hold • Safe Escrow
        </span>
      </Button>

      {nights === 0 ? (
        <p className="mt-2 text-center text-xs text-danger">
          Pick a check-out date after your check-in date.
        </p>
      ) : soldOut ? (
        <p className="mt-2 text-center text-xs text-danger">
          No seats left on these dates. Try different dates.
        </p>
      ) : null}

      <p className="mt-5 flex gap-2 rounded-md border-l-4 border-brand-700 bg-black/[0.03] p-3 text-xs text-ink-muted">
        <ShieldCheck size={16} className="mt-px shrink-0 text-brand-700" aria-hidden />
        Your payment is held securely and only released to the host after your successful stay.
      </p>

      <p className="mt-5 border-t border-line pt-5 text-sm font-bold">Hosted by {farm.host}</p>
    </aside>
  );
}

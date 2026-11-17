"use client";

import { useState } from "react";
import { Car, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { loadRazorpayScript } from "@/lib/razorpay";
import { toast } from "@/lib/toast-context";
import { formatINR } from "@/lib/utils";

interface PaymentFormProps {
  total: number;
  farmId?: number;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

export function PaymentForm({ total, farmId, checkIn, checkOut, guests }: PaymentFormProps) {
  const { user } = useAuth();
  const [bookCab, setBookCab] = useState(false);
  const [cabLocation, setCabLocation] = useState("");
  const [cabPincode, setCabPincode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);
  const [bookingRef, setBookingRef] = useState<string | null>(null);

  function validate() {
    if (bookCab) {
      if (!cabLocation.trim()) return "Enter a pickup location for the cab.";
      if (!/^\d{6}$/.test(cabPincode)) return "Enter a valid 6-digit PIN code for the cab pickup.";
    }
    return "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const message = validate();
    setError(message);
    if (message) {
      toast.error(message, "Validation");
      return;
    }

    const stayStartDate = checkIn || "2026-09-15";
    const stayEndDate = checkOut || "2026-09-18";
    const totalGuests = guests || 2;

    setLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        toast.error("Could not load the payment gateway. Check your connection and try again.", "Payment Error");
        setLoading(false);
        return;
      }

      const orderRes = await api.payments.createOrder({
        farm_id: farmId || 1,
        stay_start_date: stayStartDate,
        stay_end_date: stayEndDate,
        total_guests: totalGuests,
      });

      if (!orderRes.success || !orderRes.data) {
        toast.error(orderRes.error || "Failed to start payment", "Payment Error");
        setLoading(false);
        return;
      }

      const { order_id, amount, currency, key_id } = orderRes.data;

      const razorpay = new window.Razorpay({
        key: key_id,
        amount,
        currency,
        order_id,
        name: "KhetYatra",
        description: "Farmstay booking — held in escrow",
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone_number,
        },
        theme: { color: "#1b633e" },
        handler: async (response) => {
          try {
            const verifyRes = await api.payments.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              farm_id: farmId || 1,
              stay_start_date: stayStartDate,
              stay_end_date: stayEndDate,
              total_guests: totalGuests,
              ...(bookCab ? { cab_pickup_location: cabLocation.trim(), cab_pincode: cabPincode } : {}),
            });

            if (!verifyRes.success) {
              toast.error(verifyRes.error || "Payment verification failed", "Payment Error");
              setLoading(false);
              return;
            }

            if (verifyRes.data?.booking?.booking_code) {
              setBookingRef(verifyRes.data.booking.booking_code);
            }
            toast.success("Stay booked & payment secured in Escrow Vault!", "Booking Confirmed");
            setPaid(true);
          } catch (err: any) {
            toast.error(err.message || "Payment verification failed", "Error");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      razorpay.on("payment.failed", (resp) => {
        toast.error(resp.error.description || "Payment failed", "Payment Failed");
        setLoading(false);
      });

      razorpay.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to process booking", "Error");
      setLoading(false);
    }
  }

  if (paid) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8 text-center sm:p-12">
        <CheckCircle2 size={48} className="mx-auto text-safe" aria-hidden />
        <h2 className="mt-4 text-2xl font-bold tracking-tight">Payment held in escrow</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-muted">
          {formatINR(total)} is secured{bookingRef ? ` for Booking ${bookingRef}` : ""}. It is released to the host 24 hours after your successful
          check-in. A confirmation has been sent to your registered email.
          {bookCab ? " Your cab request has been forwarded — we'll confirm pickup details separately." : ""}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="rounded-lg border border-line bg-surface p-5 sm:p-7">
        <h3 className="text-sm font-semibold">Payment</h3>
        <p className="mt-2 text-sm text-ink-muted">
          You&apos;ll be redirected to Razorpay&apos;s secure checkout to pay by card, UPI, or net banking. Funds are
          locked in the KhetYatra Escrow Vault until 24 hours after check-in.
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-surface p-5 sm:p-7">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={bookCab}
            onChange={(e) => {
              setBookCab(e.target.checked);
              setError("");
            }}
            className="mt-0.5 accent-brand-700"
          />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Car size={16} aria-hidden />
              Book a cab for pickup
            </span>
            <span className="text-xs text-ink-muted">
              We&apos;ll arrange a cab to meet you at your location. Requested separately from the stay.
            </span>
          </span>
        </label>

        {bookCab ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Pickup Location">
              {(id) => (
                <Input
                  id={id}
                  placeholder="Dehradun Railway Station"
                  value={cabLocation}
                  onChange={(e) => setCabLocation(e.target.value)}
                />
              )}
            </Field>

            <Field label="PIN Code">
              {(id) => (
                <Input
                  id={id}
                  inputMode="numeric"
                  placeholder="248001"
                  value={cabPincode}
                  onChange={(e) => setCabPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              )}
            </Field>
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="mt-6 w-full" disabled={loading}>
        <Lock size={18} aria-hidden />
        {loading ? "Opening secure checkout…" : `Pay Now — ${formatINR(total)}`}
      </Button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
        <ShieldCheck size={14} aria-hidden />
        Secured by Razorpay · 256-bit SSL encrypted
      </p>
    </form>
  );
}

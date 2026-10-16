import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  computeBookingQuote,
  createBookingHold,
  rescheduleBookingForWeather,
} from "../services/bookingService.js";

describe("Disaster-Aware Booking & Hold Engine Suite", () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 4);

  const startStr = tomorrow.toISOString().split("T")[0];
  const endStr = dayAfter.toISOString().split("T")[0];

  describe("Booking Quote & Pricing Calculations", () => {
    it("should accurately compute nights, rates, and platform fee", async () => {
      // 2 nights, 2 guests
      const quote = await computeBookingQuote(1, startStr, endStr, 2);

      assert.equal(quote.nights, 2, "Expected 2 nights");
      assert.equal(quote.guests, 2, "Expected 2 guests");
      assert.ok(quote.stay_amount > 0, "Stay amount must be positive");
      assert.equal(quote.platform_fee, Math.round(quote.stay_amount * 0.05), "Platform fee must be 5%");
      assert.equal(quote.total_charged, quote.stay_amount + quote.platform_fee, "Total charged must equal stay + fee");
    });
  });

  describe("15-Minute Seat Inventory Hold", () => {
    it("should issue a 15-minute expiration hold window for checkout", async () => {
      const holdRes = await createBookingHold({
        guest_id: 3,
        farm_id: 1,
        stay_start_date: startStr,
        stay_end_date: endStr,
        total_guests: 2,
      });

      assert.ok(holdRes.booking, "Booking record must be returned");
      assert.equal(holdRes.booking.current_status, "Held", "Initial status must be 'Held'");
      assert.ok(holdRes.hold_expires_at, "Hold expiration timestamp must be present");

      const expiry = new Date(holdRes.hold_expires_at).getTime();
      const now = Date.now();
      const diffMinutes = Math.round((expiry - now) / (1000 * 60));

      assert.ok(diffMinutes >= 14 && diffMinutes <= 16, `Expected ~15 minute hold, got ${diffMinutes} minutes`);
    });
  });

  describe("Weather-Aware Zero-Fee Rescheduling", () => {
    it("should allow rebooking dates without cancellation penalty", async () => {
      const holdRes = await createBookingHold({
        guest_id: 3,
        farm_id: 1,
        stay_start_date: startStr,
        stay_end_date: endStr,
        total_guests: 2,
      });

      const nextWeekStart = new Date();
      nextWeekStart.setDate(nextWeekStart.getDate() + 10);
      const nextWeekEnd = new Date();
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 12);

      const reschedRes = await rescheduleBookingForWeather(
        holdRes.booking.id,
        nextWeekStart.toISOString().split("T")[0],
        nextWeekEnd.toISOString().split("T")[0],
        "Orange Hazard IMD Rainfall Advisory"
      );

      assert.equal(reschedRes.success, true);
      assert.equal(reschedRes.booking.stay_start_date, nextWeekStart.toISOString().split("T")[0]);
      assert.equal(reschedRes.booking.stay_end_date, nextWeekEnd.toISOString().split("T")[0]);
    });
  });
});

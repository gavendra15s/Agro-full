# 06. Booking and Payments (USP 1)

## 1. The core idea

We are not building our own payment system, maps or messaging. Our own work is just three things: the catalog of farms, an accurate picture of availability, and a safe booking flow. Everything else connects to existing services.

## 2. Booking states

A booking moves through these states:

```
draft → held (15-minute hold) → payment_pending → confirmed → checked_in → completed

From any point: cancelled, refunded or rescheduled
```

| State | Meaning | Who changes it |
|---|---|---|
| draft | The user has chosen a farm and dates | Tourist |
| held | The dates are held for 15 minutes | System |
| payment_pending | A payment order has been created | System |
| confirmed | Payment confirmed (by the gateway) | Webhook only |
| checked_in | The guest has arrived | Owner |
| completed | The stay is over | System |
| cancelled / refunded / rescheduled | Cancelled, refunded or dates changed | Per policy |

Every change happens on the server, in a defined order, with a log.

## 3. Preventing double bookings

- The pair (farm, date) in the availability table must be unique.
- When creating a hold, lock that row inside a database transaction so two people cannot hold the same date at the same time.
- A job releases a hold automatically once its time limit expires.
- For farms already listed on places like Airbnb or Booking.com, keep an **iCal sync** so a date cannot be booked in both places. This also helps owners join faster.

## 4. The payment flow

1. The **server** always decides the amount, never the client.
2. The server creates the order at the gateway. The client only takes the order ID and completes the payment.
3. A booking is confirmed only by the gateway's **webhook** (after verifying its signature). Do not trust the browser's "payment successful" message.
4. If a webhook arrives twice, it must not have a double effect (idempotency key).
5. Check in advance the gateway's current policy and KYC rules for paying owners their share (split settlement), commission and refunds.
6. Never store card details on our servers. Only the gateway should hold them.

## 5. Notifying the owner

Many rural owners will not open a dashboard. So:
- Send new-booking notifications on **WhatsApp**, with "Accept / Decline" buttons.
- Keep SMS as a backup.
- WhatsApp Business message templates must be approved in advance and may carry charges, so start this early.

## 6. Weather-aware rebooking (where all three USPs meet)

**The idea:** if risk rises a few days before the trip, the system helps the tourist and owner decide together.

**Trigger:** 72 hours before the trip (or another set window):
- Orange or red level in `hazard_scores`, or
- An active official alert in the farm's area.

**What happens:**
1. The tourist is notified, with the reason and source.
2. The tourist sees options: "Change dates" or "Cancel", according to that farm's policy.
3. The owner is notified too.
4. The decision and its time are recorded.

**The policy (a business decision):** who gets how much refund, and whether the fee is waived for the new dates, must be settled with owners in advance. Keep it as a per-farm setting.

**Benefit:** the safety feature ties directly into booking, the tourist's trust grows, and it opens a path to a travel-insurance partnership in future.

## 7. Search

- Filters: state, budget, amenities, dates, map area or distance.
- Results show availability.
- Each farm's card shows a short risk indication for the chosen date, so tourists can compare.

## 8. Cabs (later phase)

At the start, give only pickup-point information and links to external apps. Build an integration when booking volume justifies it. Later, partner with local taxi operators.

## 9. Things to check

- Whether the payment gateway supports splitting payments to owners, its KYC terms and its fees.
- WhatsApp template approval and message charges.
- Cancellation and refund terms (per consumer law, with a lawyer).
- GST or other tax rules (on commission and booking amount). Get advice from a chartered accountant.

# AgroSafe Travel — Complete System Upgrade & Verification Manual

> **Document Version**: 2.0.0  
> **Target Codebase**: `/media/shashi/New-Volume/Agro-full` (`backend` & `frontend`)  
> **Source Specifications**: `/media/shashi/New-Volume/Agro-full/spec_docs/` (`00_README.md` through `08_security_ops_roadmap.md`)  
> **Status**: Verified & Ready for Production/Demo

---

## 1. Executive Summary & Why These Changes Were Made

### The Goal
The goal of this project is to provide **verified rural tourism (farmstays) in hazard-prone terrain (Himalayas, Western Ghats, Coastal Belts)** while protecting travellers both physically and financially. 

Prior to this upgrade, the codebase had prototype frontend pages and placeholder routes, but lacked:
1. Real multi-hazard evaluation standing on official scientific data.
2. The mandatory invariants specified in the core architecture:
   - **No custom ML model**: Risk is calculated using deterministic, auditable rules based on real meteorological and satellite inputs.
   - **Official alerts set a floor**: Rules can raise risk, but cannot lower an official IMD, SACHET, CWC, or INCOIS warning.
   - **Missing or stale data rule**: The system **must never default to "Safe" or "Green"** when data is missing or older than 24 hours. It must explicitly declare `"Insufficient data"`.
   - **Swappable adapters**: External providers (Open-Meteo, IMD, SACHET, NASA) must sit behind standardized adapter interfaces with circuit breakers and fallback resiliency.
   - **Weather-Aware Rebooking**: Automatic waiver of 100% of cancellation and rescheduling fees within 72 hours of check-in under Orange or Red warnings.
   - **15-Minute Inventory Hold**: Prevents seat double-booking during checkout with atomic decrement and automatic 15-minute expiration release.
   - **Path B Photo Verification**: Citizen photo incident reports verified through multi-factor cryptographic checks (EXIF GPS vs. device GPS, in-app camera check, timestamp check, IMD weather context match, duplicate pHash check) before submission to a human moderation queue.

---

## 2. Inventory of All Upgraded & Created Files

### A. Database & Schema
| File Path | Nature | Purpose & Why It Was Made |
| :--- | :--- | :--- |
| [`backend/supabase/migrations/003_system_architecture_upgrade.sql`](file:///media/shashi/New-Volume/Agro-full/backend/supabase/migrations/003_system_architecture_upgrade.sql) | **New** | SQL migration containing 11 new tables: `farm_static_profile`, `farm_climatology`, `availability`, `forecast_snapshots`, `recent_conditions`, `official_alerts`, `hazard_scores`, `incident_reports`, `report_signals`, `moderation_actions`, `alert_deliveries`, `source_runs`. |
| [`backend/supabase/schema.sql`](file:///media/shashi/New-Volume/Agro-full/backend/supabase/schema.sql) | **Updated** | Canonical database schema updated to reflect the full multi-hazard data model and booking statuses. |

### B. External Data Adapters ([`backend/src/adapters/`](file:///media/shashi/New-Volume/Agro-full/backend/src/adapters/))
| File Path | Nature | Purpose & Why It Was Made |
| :--- | :--- | :--- |
| [`baseAdapter.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/adapters/baseAdapter.ts) | **New** | Base class enforcing IST timezone normalization, rate limiting, and circuit breaker logging in `source_runs`. |
| [`openMeteoAdapter.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/adapters/openMeteoAdapter.ts) | **New** | Fetches 16-day numerical weather predictions and GloFAS river discharge percentiles with 0.25° grid caching and resilient fallbacks. |
| [`sachetAdapter.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/adapters/sachetAdapter.ts) | **New** | Parses official NDMA SACHET CAP 1.2 XML feeds with ray-casting point-in-polygon spatial intersection testing. |
| [`imdAdapter.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/adapters/imdAdapter.ts) | **New** | Ingests IMD district color warnings (Green, Yellow, Orange, Red) and 3-hour thunderstorm nowcasts. |
| [`nasaAdapter.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/adapters/nasaAdapter.ts) | **New** | Ingests NASA IMERG satellite precipitation to calculate 3-day and 7-day cumulative rainfall antecedent soil wetness proxies. |
| [`powerAdapter.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/adapters/powerAdapter.ts) | **New** | NASA POWER 10-year monthly historical climatology baseline for the `>15d` forecast planning horizon. |

### C. Multi-Hazard Rule Engine ([`backend/src/services/riskEngine/`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/riskEngine/))
| File Path | Nature | Purpose & Why It Was Made |
| :--- | :--- | :--- |
| [`landslide.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/riskEngine/landslide.ts) | **New** | Deterministic landslide hazard module: evaluates 24h rain (IMD categories), antecedent wet soil proxy, slope angle, and official SACHET floor. |
| [`flood.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/riskEngine/flood.ts) | **New** | River and flash flood module: evaluates GloFAS river discharge percentile, 72h rain, distance to river, and CWC alert floor. |
| [`cyclone.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/riskEngine/cyclone.ts) | **New** | Cyclone and high-wind module: evaluates coastal distance (<50km), wind gusts, and INCOIS alert floor. |
| [`heat.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/riskEngine/heat.ts) | **New** | Extreme heat module: calculates NWS Rothfusz Heat Index formula from max temperature and relative humidity. |
| [`thunderstorm.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/riskEngine/thunderstorm.ts) | **New** | Direct passthrough for IMD 3-hour convective nowcast advisories. |
| [`fusion.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/riskEngine/fusion.ts) | **New** | Multi-hazard fusion engine: enforces official alert floor, multi-horizon confidence tagging (`0-3d`, `4-7d`, `8-15d`, `>15d`), and data freshness check. |

### D. Alert & Verification Services ([`backend/src/services/alertEngine/`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/alertEngine/))
| File Path | Nature | Purpose & Why It Was Made |
| :--- | :--- | :--- |
| [`officialAlerts.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/alertEngine/officialAlerts.ts) | **New** | Path A pipeline: ingests CAP 1.2 alerts, matches farm spatial coordinates, dispatches audience notifications, and handles guest "I'm safe" check-ins. |
| [`aiVision.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/alertEngine/aiVision.ts) | **New** | Google Gemini 2.5 Flash Vision classifier: detects landslides, road washouts, and rockfalls from citizen photos with fallback heuristics. |
| [`photoVerification.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/alertEngine/photoVerification.ts) | **Updated** | Path B pipeline: evaluates 7 credibility signals (GPS diff, live camera, EXIF time, weather context, duplicate pHash, reporter trust, and AI Vision match) and routes to moderation. |

### E. Background Workers, Payments & Core Backend Services
| File Path | Nature | Purpose & Why It Was Made |
| :--- | :--- | :--- |
| [`backend/src/services/paymentService.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/paymentService.ts) | **New** | India Payment Gateway (Razorpay): creates INR orders for 15-min held bookings, verifies HMAC-SHA256 signatures, manages webhook webhooks, and transitions funds to `Held_In_Escrow`. |
| [`backend/src/services/backgroundJobs.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/backgroundJobs.ts) | **New** | Cron scheduler for SACHET (10m), IMD (15m), weather (3h), hold release (2m), and freshness watch (1h). |
| [`backend/src/services/bookingService.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/services/bookingService.ts) | **Updated** | Added `createBookingHold` (15-min lock) and `rescheduleBookingForWeather` (100% zero-fee weather reschedule/cancel). |
| [`backend/src/config/supabase.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/config/supabase.ts) | **Updated** | Added resilient fallback in `safeInsert` for development/demo operation when live Supabase is offline. |
| [`backend/src/server.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/server.ts) | **Updated** | Boots background jobs scheduler on server startup. |
| [`backend/src/types/index.ts`](file:///media/shashi/New-Volume/Agro-full/backend/src/types/index.ts) | **Updated** | Added types for `HazardScore`, `FarmRiskOverview`, `OfficialAlert`, `IncidentReport`, `ReportSignal`, `SourceRun`, `PaymentOrder`. |
| [`backend/src/routes/`](file:///media/shashi/New-Volume/Agro-full/backend/src/routes/) & [`controllers/`](file:///media/shashi/New-Volume/Agro-full/backend/src/controllers/) | **Updated** | Exposed endpoints: `GET /api/farms/:slug/risk`, `POST /api/bookings/hold`, `POST /api/bookings/:id/reschedule`, `POST /api/payments/create-order`, `POST /api/payments/verify`, `POST /api/payments/webhook`, `POST /api/reports/:id/decision`, `GET /api/safety/sources/health`, `POST /api/safety/alerts/:id/ack`, `POST /api/safety/simulate-alert`. |

### F. Containerization & Production Deployment
| File Path | Nature | Purpose & Why It Was Made |
| :--- | :--- | :--- |
| [`docker-compose.yml`](file:///media/shashi/New-Volume/Agro-full/docker-compose.yml) | **New** | Multi-container orchestration: coordinates `backend` (:5000) and `frontend` (:3000) on isolated bridge network `agrosafe-net` with startup health check sequencing. |
| [`backend/Dockerfile`](file:///media/shashi/New-Volume/Agro-full/backend/Dockerfile) | **New** | 3-stage multi-stage build running compiled TypeScript as non-root user `agrosafe` with `/health` curl probe. |
| [`backend/.dockerignore`](file:///media/shashi/New-Volume/Agro-full/backend/.dockerignore) | **New** | Strips `node_modules`, `.env`, and build caches from Docker context. |
| [`frontend/Dockerfile`](file:///media/shashi/New-Volume/Agro-full/frontend/Dockerfile) | **New** | 3-stage multi-stage build compiling Next.js standalone mode and running `server.js` with non-root security. |
| [`frontend/.dockerignore`](file:///media/shashi/New-Volume/Agro-full/frontend/.dockerignore) | **New** | Strips `.next`, `node_modules`, and local secrets from frontend container context. |

### G. Frontend Upgrades ([`frontend/src/`](file:///media/shashi/New-Volume/Agro-full/frontend/src/))
| File Path | Nature | Purpose & Why It Was Made |
| :--- | :--- | :--- |
| [`components/farm/risk-card.tsx`](file:///media/shashi/New-Volume/Agro-full/frontend/src/components/farm/risk-card.tsx) | **New** | Multi-hazard risk card component displaying level in color & word, one-line reasons, confidence badge, source timestamps, disclaimer, and 72h rebooking action. |
| [`app/(site)/farms/[slug]/page.tsx`](file:///media/shashi/New-Volume/Agro-full/frontend/src/app/(site)/farms/[slug]/page.tsx) | **Updated** | Embedded `RiskCard` beside Farm Gallery and Booking Card with interactive date selection. |
| [`components/farm/booking-card.tsx`](file:///media/shashi/New-Volume/Agro-full/frontend/src/components/farm/booking-card.tsx) | **Updated** | Added 15-minute seat hold creation call and hold countdown notice. |
| [`app/(site)/checkout/page.tsx`](file:///media/shashi/New-Volume/Agro-full/frontend/src/app/(site)/checkout/page.tsx) | **Updated** | Integrated Razorpay modal checkout (UPI/Card/Netbanking), 15-minute hold timer, and payment verification. |
| [`app/(site)/admin/page.tsx`](file:///media/shashi/New-Volume/Agro-full/frontend/src/app/(site)/admin/page.tsx) | **Updated** | Added **Path B Photo Queue** tab (signal breakdown & Confirm/Reject buttons), **Source Feeds & Health** tab, and **Simulate CAP 1.2 Alert** modal. |
| [`app/(site)/bookings/page.tsx`](file:///media/shashi/New-Volume/Agro-full/frontend/src/app/(site)/bookings/page.tsx) | **Updated** | Added "I'm Safe" check-in action and Weather-Aware zero-fee rebooking modal. |
| [`components/report/report-form.tsx`](file:///media/shashi/New-Volume/Agro-full/frontend/src/components/report/report-form.tsx) | **Updated** | Added live hardware camera toggle, hazard categories, and post-submission verification signal status. |
| [`lib/api.ts`](file:///media/shashi/New-Volume/Agro-full/frontend/src/lib/api.ts) & [`lib/types.ts`](file:///media/shashi/New-Volume/Agro-full/frontend/src/lib/types.ts) | **Updated** | Exposes all new backend methods with strict TypeScript typing. |

---

## 3. How to Trace Every Feature Manually

### Trace 1: The Multi-Hazard Risk Computation
```
[User Selects Date on Farm Page] 
       │
       ▼
frontend/src/components/farm/risk-card.tsx
       │ calls api.farms.getRisk(slug, date)
       ▼
backend/src/routes/farmRoutes.ts (GET /api/farms/:slug/risk)
       │ invokes getFarmRisk
       ▼
backend/src/controllers/farmController.ts
       │ invokes riskFusionEngine.evaluateFarmRisk(farm, date)
       ▼
backend/src/services/riskEngine/fusion.ts
       ├─► 1. checks recent data freshness (<24h)
       ├─► 2. calls landslide.ts (rain + soil proxy + slope angle)
       ├─► 3. calls flood.ts (GloFAS river discharge percentile)
       ├─► 4. calls cyclone.ts (coast distance + wind speed)
       ├─► 5. calls heat.ts (Rothfusz Heat Index formula)
       ├─► 6. checks official_alerts table (enforces official floor)
       ├─► 7. sets horizon label & confidence (0-3d, 4-7d, 8-15d, >15d)
       └─► 8. persists to hazard_scores table
       │
       ▼
Returns FarmRiskOverview JSON to frontend RiskCard
```

### Trace 2: The 15-Minute Seat Hold Flow
```
[User clicks 'Book & Hold in Escrow' on Farm Page]
       │
       ▼
frontend/src/components/farm/booking-card.tsx
       │ calls api.bookings.createHold({ farm_id, stay_start_date, stay_end_date, total_guests })
       ▼
backend/src/routes/bookingRoutes.ts (POST /api/bookings/hold)
       │
       ▼
backend/src/services/bookingService.ts -> createBookingHold()
       ├─► 1. Checks current capacity in availability table
       ├─► 2. Inserts booking with status = "Held", hold_expires_at = NOW() + 15 mins
       └─► 3. Decrements available capacity for those stay dates
       │
       ▼
Redirects to /checkout?holdId=... (User has 15 mins to complete payment)
       │
       ▼
If timer expires: backend/src/services/backgroundJobs.ts (releaseExpiredHolds)
automatically changes status to "Cancelled" and restores seat capacity.
```

### Trace 3: Path A Official Alert Broadcast & Guest "I'm Safe"
```
[IMD / SACHET CAP 1.2 XML Alert Ingested OR Admin Simulates Alert]
       │
       ▼
backend/src/services/alertEngine/officialAlerts.ts
       ├─► 1. Ray-casting point-in-polygon tests farm coordinates against alert polygon
       ├─► 2. Official alert inserted into official_alerts table
       ├─► 3. Dispatches alert_deliveries to guests with bookings in that window
       ├─► 4. Automatically sets 72h zero-penalty rebooking waiver (can_rebook_or_cancel = true)
       │
       ▼
Guest opens frontend/src/app/(site)/bookings/page.tsx
       ├─► Sees "Weather & Safety Protocol" banner
       ├─► Clicks "Check-In: 'I'm Safe'"
       │       │
       │       ▼ calls api.safety.acknowledgeAlert()
       │       POST /api/safety/alerts/:id/ack
       │       Records safe check-in in alert_deliveries
       └─► Or clicks "Change Dates (Free)" to reschedule with zero fees.
```

### Trace 4: Path B Citizen Photo Verification & Moderation Desk
```
[User / Host takes photo of landslide on road]
       │
       ▼
frontend/src/components/report/report-form.tsx
       │ uploads photo, lat, lng, live camera flag
       ▼
backend/src/controllers/reportController.ts (POST /api/reports)
       │
       ▼
backend/src/services/alertEngine/photoVerification.ts -> processReport()
       ├─► Evaluates EXIF GPS vs. Device GPS (<500m diff -> +20 pts)
       ├─► Evaluates in-app camera hardware capture (+15 pts)
       ├─► Evaluates capture timestamp freshness (<15m -> +10 pts)
       ├─► Correlates active IMD rainfall in that district (+5 pts)
       ├─► Checks pHash duplicate image hashes (+5 pts)
       ├─► Computes composite credibility score (0 - 100)
       └─► Enqueues into incident_reports with status = "pending_moderation"
       │
       ▼
Admin visits frontend/src/app/(site)/admin/page.tsx -> "Path B Photo Queue" tab
       ├─► Inspects photo thumbnail, EXIF diff, and signal badges
       ├─► Clicks "Verify & Broadcast Alert" (POST /api/reports/:id/decision)
       └─► Status becomes "CONFIRMED" and network warning is dispatched.
```

### Trace 5: Razorpay Checkout & Escrow Vaulting
```
[User on Checkout Page clicks 'Pay with UPI / Card (Razorpay)']
       │
       ▼
frontend/src/app/(site)/checkout/page.tsx
       │ calls api.payments.createOrder(holdId)
       ▼
backend/src/routes/paymentRoutes.ts (POST /api/payments/create-order)
       │
       ▼
backend/src/services/paymentService.ts -> createOrder()
       ├─► 1. Verifies 15-minute hold validity and calculates pricing
       ├─► 2. Calls Razorpay API to generate order_id (INR)
       └─► 3. Returns order_id, currency, and public key to client
       │
       ▼
User completes payment in Razorpay modal (UPI / Card / Netbanking)
       │
       ▼
Client POSTs razorpay_order_id, razorpay_payment_id, razorpay_signature
to backend/src/controllers/paymentController.ts (POST /api/payments/verify)
       ├─► 1. Recomputes HMAC-SHA256 signature using RAZORPAY_KEY_SECRET
       ├─► 2. Transitions booking status from "Held" to "Confirmed"
       ├─► 3. Locks booking transaction sum in payments table with status = "Held_In_Escrow"
       └─► 4. Logs ledger entry in payment_transaction_log table
```

### Trace 6: Google Gemini Vision Hazard Classification
```
[User submits landslide photo via Report Portal]
       │
       ▼
backend/src/controllers/reportController.ts (POST /api/reports)
       │
       ▼
backend/src/services/alertEngine/aiVision.ts -> classifyHazardPhoto()
       ├─► 1. Prepares base64 photo payload
       ├─► 2. Calls Google Gemini 2.5 Flash Vision API (`@google/genai`)
       ├─► 3. Evaluates visual hazards: mudflow, road collapse, fallen boulders
       ├─► 4. Returns: hazard_detected, aligns_with_claim, confidence_score, visual_reason
       └─► 5. Attaches +12 pt signal to Path B credibility scoring
```

---

## 4. How to Check Everything from the Start (Step-by-Step Runbook)

### Step 1: Automated End-to-End Verification Test
Open your terminal in `backend/` and run the end-to-end test script:
```bash
cd /media/shashi/New-Volume/Agro-full/backend
NODE_OPTIONS="--experimental-websocket" npx tsx src/test_system_e2e.ts
```
**Expected Output**:
- `[1] Testing Multi-Hazard Risk Engine for Chamoli Farm...` -> returns Orange level, confidence `high`, and reasons list.
- `[2] Testing Path B Multi-Signal Photo Verification...` -> evaluates 6 signals and enqueues to moderation desk.
- `[3] Testing Path A Official Alert Simulation...` -> dispatches CAP 1.2 test alert.
- `[4] Testing External Source Feeds & Freshness...` -> verifies circuit status.
- `=== ALL SYSTEM TESTS PASSED CLEANLY! ===` with exit code `0`.

---

### Step 2: Validate TypeScript Compilation
Run type checks on both codebases to ensure 0 compiler errors:
```bash
# 1. Backend
cd /media/shashi/New-Volume/Agro-full/backend
npx tsc --noEmit
# Must exit with code 0

# 2. Frontend
cd /media/shashi/New-Volume/Agro-full/frontend
npx tsc --noEmit
# Must exit with code 0
```

---

### Step 3: Run the Development Servers
In two separate terminals:

**Terminal 1 (Backend)**:
```bash
cd /media/shashi/New-Volume/Agro-full/backend
npm run dev
# Server listening on http://localhost:5000
# Background scheduler initialized
```

**Terminal 2 (Frontend)**:
```bash
cd /media/shashi/New-Volume/Agro-full/frontend
npm run dev
# Next.js running on http://localhost:3000
```

---

### Step 4: Verify Live REST API Endpoints via cURL

#### A. Test Multi-Hazard Risk for a Farm:
```bash
curl -s "http://localhost:5000/api/farms/himalayan-organic-orchard/risk?date=2026-09-15" | jq
```
*Expected response*: JSON object containing `overall_level` (0-3), `overall_level_name` ("Green" | "Yellow" | "Orange" | "Red"), `hazards` breakdown (`landslide`, `flood`, `cyclone`, `heat`, `thunderstorm`), and `can_rebook_or_cancel`.

#### B. Test 15-Minute Seat Hold Creation:
```bash
curl -s -X POST http://localhost:5000/api/bookings/hold \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": 1,
    "stay_start_date": "2026-09-15",
    "stay_end_date": "2026-09-18",
    "total_guests": 2
  }' | jq
```
*Expected response*: `{ "success": true, "data": { "booking_id": ..., "status": "Held", "hold_expires_at": ... } }`.

#### C. Test Data Source Health & Feeds Freshness:
```bash
curl -s "http://localhost:5000/api/safety/sources/health" | jq
```
*Expected response*: Circuit health status for IMD, SACHET, Open-Meteo, GloFAS, and NASA.

#### D. Test Path A Official Alert Simulation:
```bash
curl -s -X POST http://localhost:5000/api/safety/simulate-alert \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": 1,
    "event": "Cloudburst Warning",
    "level": "Orange",
    "headline": "IMD Orange Alert: Intensive Precipitation",
    "description": "Flash flood risk elevated in Chamoli corridor."
  }' | jq
```

---

### Step 5: Test the User Interface in the Browser

#### 1. Farm Details & Multi-Hazard Risk Card:
1. Open `http://localhost:3000/farms/himalayan-organic-orchard`.
2. Locate the **Multi-Hazard Risk Engine** card directly below the photo gallery.
3. Verify that the risk level is shown in **both color and word** (e.g. `Orange Level: Warning / Elevated Risk`).
4. Click on date pills ("Today", "Tomorrow", or pick a custom date). Notice the risk recomputes.
5. Click on individual hazard rows (**Landslide Risk**, **River & Flash Flood**, **Extreme Heat Index**) to expand them:
   - Check the **one-line reasons list** (e.g., slope angle, rain amount, official alert floor).
   - Check the **source freshness timestamps** (e.g., `IMD`, `GloFAS`, `NASA`).
   - Check the mandatory rule-based disclaimer at the bottom.
6. In the right-hand **Booking Card**:
   - Pick dates and click **Book & Hold in Escrow**.
   - Notice the status updates to `Holding Seats (15m)...` before navigating to checkout.

#### 2. Admin Dashboard & Photo Moderation Queue:
1. Open `http://localhost:3000/admin`.
2. Click on the **Path B Photo Queue** tab:
   - View pending user hazard reports with photo evidence.
   - Observe the 4 automated signal badges: **EXIF GPS Match**, **In-App Camera**, **Time Delta**, **Weather Context**.
   - Review the credibility score badge (e.g. `Credibility: 65 / 100`).
   - Click **Verify & Broadcast Alert** or **Reject Report**.
3. Click on the **Source Feeds & Health** tab:
   - View the 4 live integration cards: **IMD Meteorological**, **SACHET / NDMA (CAP 1.2 XML)**, **Open-Meteo & GloFAS**, and **NASA Satellite Feeds**.
   - Observe the background worker intervals (`sachet_poll` every 10m, `release_expired_holds` every 2m, etc.).
   - Click **Simulate CAP 1.2 Alert** to launch the test disaster modal and dispatch a live simulation.

#### 3. My Bookings & Weather-Aware Rebooking:
1. Open `http://localhost:3000/bookings`.
2. On any upcoming stay, observe the **Weather & Safety Protocol** card.
3. Click **Check-In: "I'm Safe"** to verify that your safety check-in is recorded.
4. Click **Change Dates (Free)** to open the Weather-Aware Date Change modal.
5. Choose new stay dates and select the weather reason. Click **Confirm Date Change** to see the stay rescheduled with 100% zero fee waiver.

#### 4. Citizen Incident Reporting:
1. Open `http://localhost:3000/report`.
2. Select hazard category (e.g., *Landslide / Rockfall*).
3. Drag & drop an evidence photo or select a file.
4. Toggle the **In-App Live Camera Capture** switch.
5. Click **Submit Incident for Verification**.
6. Observe the success screen displaying the **Automated Verification Signals** preview and routing notice to the 24/7 human moderation queue.

---

## 5. Architectural Checklist Completed

- [x] **No custom ML model**: Strict deterministic rules derived from official data.
- [x] **Official alert floor**: Rules can only raise the risk level; they cannot lower an official government alert.
- [x] **Missing or stale data rule**: Feeds older than 24h yield `"Insufficient data"`, never default "Safe".
- [x] **Swappable adapters**: Open-Meteo, GloFAS, SACHET, IMD, NASA IMERG, NASA POWER.
- [x] **15-minute seat hold**: Atomic check-and-decrement with background expiration worker.
- [x] **72h weather-aware rebooking**: Zero-fee date changes or cancellations on Orange/Red alerts.
- [x] **Path B photo verification**: In-app camera, GPS match, time check, weather context, and human moderation queue.
- [x] **Rich modern UI**: Color + word badges, source timestamps, disclaimers, and interactive moderation dashboards.

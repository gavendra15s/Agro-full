# AgroSafe Travel — Backend API & Services Engine

> **High-performance Node.js, Express, and TypeScript backend orchestrating deterministic multi-hazard risk models, external meteorological adapters, Razorpay escrow vaulting, Google Gemini AI vision classification, and Supabase PostgreSQL persistence.**

---

## 🏗️ Architecture & Core Components

The backend implements the full architectural specifications defined in `spec_docs/` (`01_system_architecture.md` through `08_security_ops_roadmap.md`):

```
backend/src/
├── adapters/                  # Resilient external data connectors
│   ├── baseAdapter.ts         # Circuit breaker, IST normalization, source_runs audit
│   ├── openMeteoAdapter.ts    # 16-day numerical weather & GloFAS river discharge
│   ├── sachetAdapter.ts       # NDMA SACHET CAP 1.2 XML feeds with ray-casting polygons
│   ├── imdAdapter.ts          # IMD district color advisories & 3-hour radar nowcasts
│   └── powerAdapter.ts        # NASA POWER 10-year monthly climatology baseline
├── services/
│   ├── riskEngine/            # Deterministic multi-hazard rules
│   │   ├── landslide.ts       # 24h rain (IMD bands), antecedent wetness, slope angle
│   │   ├── flood.ts           # GloFAS percentile, 72h rain, river proximity
│   │   ├── cyclone.ts         # Coastal proximity (<50km), wind gusts (>=90 km/h)
│   │   ├── heat.ts            # NWS Rothfusz Heat Index formula
│   │   ├── thunderstorm.ts    # IMD Doppler convective nowcast advisories
│   │   └── fusion.ts          # Invariant enforcement (official alert floor, >15d trend)
│   ├── alertEngine/           # Path A & Path B verification pipelines
│   │   ├── aiVision.ts        # Google Gemini 2.5 Flash Vision photo classifier
│   │   ├── officialAlerts.ts  # CAP 1.2 spatial alert ingestion & guest notifications
│   │   └── photoVerification.ts # 7-factor credibility score & moderation desk
│   ├── bookingService.ts      # 15-minute inventory hold & zero-fee weather rebooking
│   ├── paymentService.ts      # Razorpay order generation, HMAC verification, Escrow Vault
│   └── backgroundJobs.ts      # Cron workers (SACHET 10m, IMD 15m, Hold release 2m)
├── routes/ & controllers/     # Express route handlers and input validation
└── tests/                     # 26 automated unit & invariant test suites
```

---

## 🚀 Quickstart

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure the key variables are configured:
```ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Supabase (PostgreSQL 15)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
JWT_SECRET=super-secret-jwt-key-agrosafe-2026

# Razorpay (India Payments & Escrow)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=rzp_webhook_secret_agrosafe

# Google Gemini Vision AI
GEMINI_API_KEY=AIzaSy...
```

*Note: If `SUPABASE_URL` contains placeholder text, the backend automatically runs in **Resilient Local Mock Mode**, storing and querying data in-memory with pre-loaded farms and matrices.*

### 3. Database Migration & Seeding
If using a live Supabase database:
1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Run `supabase/migrations/003_system_architecture_upgrade.sql` to add multi-hazard tables.
3. Seed test users, farms, and records:
   ```bash
   npm run seed
   ```

### 4. Run the Development Server
```bash
npm run dev
```
*Server starts at `http://localhost:5000` with hot reloading enabled via `tsx watch`.*

---

## 📡 Complete API Reference

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register Guest or Host account.
- `POST /api/auth/login` — Sign in and receive Bearer JWT token.
- `GET /api/auth/me` — Retrieve current authenticated user profile.

### 🏡 Farms & Multi-Hazard Safety (`/api/farms`)
- `GET /api/farms` — Search and filter farmstays by state, district, or category.
- `GET /api/farms/:slug` — Farm details by unique slug.
- `GET /api/farms/:slug/risk?date=YYYY-MM-DD` — Multi-hazard evaluation (Landslide, Flood, Cyclone, Heat, Thunderstorm) with confidence tag and rebooking waiver status.
- `POST /api/farms` — (Host) List new farmstay with automated geographic coordinate resolution.

### 📅 Bookings & Inventory Hold (`/api/bookings`)
- `POST /api/bookings/hold` — Atomically reserve seat inventory for 15 minutes before checkout.
- `POST /api/bookings` — Create confirmed booking and lock funds in Escrow Vault.
- `GET /api/bookings` — List authenticated user's active and completed bookings.
- `POST /api/bookings/:id/reschedule` — Weather-aware zero-penalty rebooking under active Orange/Red alerts.

### 💳 Payments & Escrow Vault (`/api/payments`, `/api/escrow`)
- `POST /api/payments/create-order` — Create Razorpay order in INR for a held booking.
- `POST /api/payments/verify` — Verify HMAC-SHA256 signature and lock funds in `Held_In_Escrow`.
- `POST /api/payments/webhook` — Razorpay webhook endpoint (`payment.captured`, `refund.processed`).
- `GET /api/escrow` — Global Escrow Vault ledger.
- `POST /api/escrow/:paymentId/release` — Release stay payout to host upon safe guest checkout.
- `POST /api/escrow/:paymentId/refund` — Issue 100% emergency disaster refund to guest.

### ⚠️ Disaster Alerts & Safety Protocol (`/api/safety`, `/api/warnings`, `/api/reports`)
- `POST /api/reports` — Submit citizen hazard photo with GPS and camera metadata → Gemini AI Vision analysis.
- `POST /api/reports/:id/decision` — (Admin) Confirm or reject pending report in moderation queue.
- `GET /api/warnings` — Active disaster warning feed with epicenter and impact blast radius.
- `POST /api/safety/simulate-alert` — (Admin) Simulate CAP 1.2 XML alert for demonstration and testing.
- `POST /api/safety/alerts/:id/ack` — Guest "I'm Safe" check-in acknowledgement.
- `GET /api/safety/sources/health` — Monitor status and freshness of Open-Meteo, IMD, and SACHET feeds.

---

## 🧪 Testing & Verification Runbook

### 1. Run Complete Automated Unit & Invariant Test Suite
```bash
npm test
```
Executes all 26 tests across 16 suites:
- `src/tests/riskEngine.test.ts`: Deterministic landslide, flood, cyclone, heat index, and invariant floor rules.
- `src/tests/bookingEngine.test.ts`: Pricing math, 15-minute seat holds, zero-fee weather rescheduling.
- `src/tests/photoVerification.test.ts`: 7-factor credibility scoring and 100-point invariant cap.
- `src/tests/paymentWebhook.test.ts`: Razorpay HMAC-SHA256 signature verification and tampering prevention.

### 2. Run End-to-End System Integration Test
```bash
npx tsx src/test_system_e2e.ts
```
Tests all 4 critical workflows sequentially:
1. Multi-hazard risk calculation for Chamoli farmstay.
2. Path B photo verification with 7 aggregated signals.
3. Path A official CAP 1.2 alert simulation and audience matching.
4. Background cron worker freshness and circuit breaker checks.

### 3. Test Google Gemini AI Vision Classifier
```bash
npx tsx src/scripts/testGemini.ts
```
Verifies live API communication with Gemini 2.5 Flash Vision, reporting classification results and execution time.

### 4. Create an Admin User via CLI
```bash
npm run create-admin -- admin@agrosafe.travel YourSecurePassword Admin Name +919876543299
```

### 5. Type Checking & Code Quality
```bash
npm run lint
```
Runs `tsc --noEmit` to verify type safety across the entire backend.

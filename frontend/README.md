# AgroSafe Travel — Frontend Web Application

> **Production-grade Next.js 15 (App Router) agrotourism web application with real-time multi-hazard risk cards, 15-minute seat inventory hold, Razorpay UPI/Card checkout, citizen hazard reporting with hardware camera capture, and an Admin Disaster Moderation Desk.**

---

## 🎨 Features & Pages

The frontend is built with **Next.js 15**, **React 19**, **Tailwind CSS v4**, and **TypeScript**:

| Route | Page / Component | Key Functionality |
| :--- | :--- | :--- |
| `/` | **Explore Farmstays** | Search & filter vetted mountain farmstays by state, district, and safety status. |
| `/farms/[slug]` | **Farm Details & Safety** | Displays interactive **Multi-Hazard Risk Card** (`components/farm/risk-card.tsx`) with date picker, horizon confidence badge, and **15-Minute Seat Hold** booking card (`components/farm/booking-card.tsx`). |
| `/checkout` | **Checkout & Escrow** | Displays live **15-minute hold countdown timer**, price breakdown, and **Razorpay Payment Gateway** modal (supporting UPI apps, QR codes, Cards, and Netbanking). |
| `/bookings` | **Reservations & Safety** | Shows active bookings, **Escrow Vault status**, urgent **Official Weather Protocol** banners, **Guest "I'm Safe" Check-In**, and **Zero-Fee Weather Rebooking**. |
| `/report` | **Citizen Hazard Reporter** | Allows users and hosts to report landslides and road blocks with live hardware camera capture, EXIF metadata extraction, and Google Gemini AI Vision hazard detection. |
| `/admin` | **Disaster Moderation Desk** | Admin portal with **Path B Photo Queue** (7-signal score breakdown & Confirm/Reject buttons), **CAP 1.2 Alert Simulation Tool**, and **Source Feed Health** monitors. |
| `/login` | **Authentication** | Sign in as Guest, Host, or Admin with JWT storage and session restoration. |

---

## 🚀 Quickstart

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment Variables
Create `.env.local` if custom API overrides are needed:
```ini
# Backend API URL (defaults to http://localhost:5000/api)
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Razorpay Test Key for Frontend Checkout Modal
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
```

### 3. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Project Architecture & Directory Layout

```
frontend/src/
├── app/
│   ├── (auth)/                    # Authentication route group (clean auth chrome)
│   │   ├── layout.tsx
│   │   └── login/page.tsx         # Guest & Host login / registration
│   ├── (site)/                    # Primary site route group (header, footer, nav)
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Homepage & farm discovery
│   │   ├── admin/page.tsx         # Moderation desk & CAP 1.2 simulator
│   │   ├── bookings/page.tsx      # Reservation ledger & "I'm Safe" check-in
│   │   ├── checkout/page.tsx      # 15-min hold countdown & Razorpay gateway
│   │   ├── farms/[slug]/page.tsx  # Dynamic farm details & multi-hazard risk card
│   │   └── report/page.tsx        # Citizen photo report portal with camera toggle
│   ├── globals.css                # Tailwind v4 theme & custom utilities
│   └── layout.tsx                 # Root HTML shell
├── components/
│   ├── farm/
│   │   ├── booking-card.tsx       # 15-minute seat hold initiator
│   │   └── risk-card.tsx          # Multi-hazard risk level, confidence, & reasons
│   ├── layout/                    # SiteHeader, SiteFooter, AuthHeader
│   ├── report/
│   │   └── report-form.tsx        # Form with live camera toggle & signal display
│   └── ui/                        # Button, Field, Card, SafetyBadge primitives
└── lib/
    ├── api.ts                     # Fully-typed API client connecting to backend
    ├── pricing.ts                 # Shared deterministic booking & fee calculation
    ├── pricing.check.ts           # Assert-based pricing verification test
    ├── types.ts                   # Domain TypeScript interfaces
    └── data/                      # Fallback fixture data for offline resilience
```

---

## 🧪 Testing & Validation Scripts

### 1. Pricing Math Self-Check
Ensures the booking card and checkout modal share identical rate, fee, and disaster levy maths:
```bash
npm run check
```
*Executes `src/lib/pricing.check.ts` with assertions on multi-night quotes.*

### 2. Production Standalone Build
Tests the multi-stage standalone build required for container deployment:
```bash
npm run build
```
Generates `.next/standalone/server.js`.

### 3. Start Production Standalone Server
```bash
npm run start
```
Starts Next.js on port 3000.

### 4. Lint & Code Quality
```bash
npm run lint
```
Checks for ESLint rule violations.

---

## 🐳 Docker Deployment

The frontend includes a production-ready multi-stage `Dockerfile`:
- **Stage 1 (deps)**: Installs Node.js production dependencies with clean cache.
- **Stage 2 (builder)**: Compiles TypeScript and builds the Next.js standalone bundle.
- **Stage 3 (runner)**: Runs a minimal Alpine container as non-root user `agrosafe` with built-in `/` health probes.

To run standalone with Docker Compose, see the root [`docker-compose.yml`](file:///media/shashi/New-Volume/Agro-full/docker-compose.yml).

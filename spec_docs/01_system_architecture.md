# 01. System Architecture

## 1. The layers at a glance

```
CLIENTS
  Tourist (PWA)  |  Farm owner (WhatsApp + small dashboard)  |  Admin / moderator panel
        │
        ▼
ENTRY LAYER
  Reverse proxy · HTTPS · Login (OTP + JWT) · Rate limiting
        │
        ▼
BACKEND: modular monolith (one codebase, clean modules)
  Catalog & search          Booking & payments        Risk engine (rule-based)
  Reports & verification    Alert engine              Notification dispatcher
        │
        ▼
WORKERS & STORAGE
  Workers / scheduler  |  PostgreSQL + PostGIS  |  Redis (cache, queue)  |  Object storage (private photos)
        ▲
        │  (workers pull data from outside)
        │
EXTERNAL SOURCES & SERVICES
  Open / official data: IMD API, SACHET (CAP), Open-Meteo / ECMWF, NASA IMERG & LHASA, NASA POWER, NASA COOLR
  External services: payment gateway, SMS (DLT) / WhatsApp / Web Push, map tiles
```

The project's own core work lives in two modules: the **risk engine** and the **alert engine**. Everything else runs on existing tools, services and official data.

## 2. What each component does

| Component | Job | Note |
|---|---|---|
| Tourist PWA | Search, farm page, booking, risk card, my trips, reporting | Last alert and emergency numbers available offline |
| Owner interface | Booking notifications and approval on WhatsApp, small dashboard | For rural owners, WhatsApp is easier than a dashboard |
| Admin / moderator panel | Review reports, source health, test alerts | Most important screen: source freshness |
| Entry layer | HTTPS, login, rate limiting | OTP login, short-lived JWT |
| Catalog & search | Farms, amenities, availability, search by place and filters | Distance and area queries through PostGIS |
| Booking & payments | Hold, payment, confirmation, cancellation, refund | Confirmation only from the gateway webhook |
| Risk engine | Level, confidence and reasons per farm × date × hazard | Computed ahead of time in the background |
| Reports & verification | Automatic checks and a score for photo reports | A human makes the final decision |
| Alert engine | Match alerts to farms, pick audience, throttle | Official alerts first |
| Notification dispatcher | Send by push, WhatsApp, SMS, email and log status | If one channel fails, another takes over |
| Workers / scheduler | Fetch data, compute risk, send alerts | No external API is ever called during a user request |
| PostgreSQL + PostGIS | All core data and geospatial queries | "Which farms are inside this polygon?" in one query |
| Redis | Cache and job queue | |
| Object storage | Farm and report photos | Private bucket, opened only through signed links |

## 3. Life of a request

A tourist picks a farm and a date, and the app asks for that farm's risk information. No heavy computation happens at this moment. A background worker has already computed risk for every farm and the next 15 days and stored it in the `hazard_scores` table. The API simply reads that row and returns the level, confidence, reasons and data time.

Benefits:
- Pages open fast.
- External API limits are never hit by user traffic.
- If an outside source is down, the last known result can still be shown, marked as "stale".

Size estimate: about 1,500 farms × 15 days × 4-5 hazards is under 100,000 rows. The table stays small.

## 4. Tech stack

The choices rest on three things: a small team, starting free or cheap, and easy handling of geospatial data (places, polygons, rasters). That is why the backend is Python.

| Layer | Suggested option | Why |
|---|---|---|
| Frontend | Next.js (React) PWA, Hindi/English, MapLibre GL for maps | One codebase for mobile and desktop. PWA gives offline alerts. |
| Backend | Python + FastAPI (modular monolith) | Geospatial and data libraries (Shapely, xarray, rasterio) are easiest in Python |
| Database | PostgreSQL + PostGIS | Polygon and point queries directly in the database |
| Jobs & cache | Redis + Celery (or RQ / APScheduler for a simpler start) | Ingestion, risk computation and dispatch run in the background |
| Photo storage | S3-compatible storage (Cloudflare R2, Supabase Storage or MinIO) | Private bucket. Check free-tier limits before relying on them. |
| Login | Phone OTP (primary) + email | In India the phone number is the identity. OTP needs SMS, so do DLT first. |
| Notifications | Web Push (FCM), WhatsApp Business, SMS (DLT-registered), email | If one fails, another works. SMS reaches everywhere. |
| Payments | Razorpay or Cashfree | Do not build our own payment system. Check split settlement and KYC terms. |
| Maps | MapLibre GL + OpenStreetMap-based tiles | Open tools. Check the tile provider's terms under heavy traffic, or self-host. |
| Infra | Docker Compose, one VPS or PaaS, GitHub Actions | Cheapest and simplest to start |
| Monitoring | Sentry (errors), Uptime Kuma / Healthchecks (are jobs running?) | A silently stalled data job is the biggest quiet failure |

## 5. Deployment

- **Three environments:** dev, staging (test alerts and simulation live here), production.
- **Start:** Docker Compose on one server running web, workers, Redis and Postgres. GitHub Actions for tests and deploys.
- **When traffic grows, in this order:** (1) split workers and database, (2) CDN for photos, (3) database read replica.
- **Main real cost drivers:** SMS, WhatsApp, payment gateway fees, servers, and a commercial forecast licence. Check current prices with the providers directly.

## 6. The adapter rule (the most important architectural rule)

Every external source gets a thin layer that always does the same three things:
1. Fetch the raw data.
2. Convert it into our shared shape (same units, IST time, source name and issue time).
3. Report its own health: last success time, how many consecutive failures.

The risk engine never talks directly to Open-Meteo or IMD, only to our normalized data. That way, if a licence or availability problem forces a source change, the engine stays untouched.

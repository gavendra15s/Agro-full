# 03. Data Pipeline and Database

## 1. Ingestion pipeline

External data is pulled only by **workers**, never at the moment of a user request. This keeps us within external API limits and keeps pages fast.

### Job list

| Job | How often (suggested) | What it does | Where the result goes |
|---|---|---|---|
| sachet_poll | Every 5 minutes | Check the RSS feed, spot new CAP IDs, download the XML, extract polygon, level and time. Handle Update and Cancel messages. | official_alerts |
| imd_warnings | Every 30 minutes | Fetch district-wise warnings and nowcasts and convert them to levels | official_alerts |
| forecast_refresh | Every 6 hours (follow the model run schedule) | Group all farms into grid cells, one request per cell, save the 15-day forecast | forecast_snapshots |
| flood_refresh | 1-2 times a day | Fetch river discharge forecasts and compare them with that location's history to get a percentile | forecast_snapshots |
| imerg_lhasa | Every 3 hours | Read the raster value at each farm's pixel: recent rainfall and LHASA class | recent_conditions |
| climatology_build | Once when a farm is added, then yearly | Take 10 years of daily data from NASA POWER and compute month-wise statistics | farm_climatology |
| static_profile_build | Once when a farm is added | Compute elevation, slope, distance to river and coast, landslide susceptibility class | farm_static_profile |
| risk_compute | Whenever any job above brings new data, and hourly | Compute the level for every farm × next 15 days × each applicable hazard | hazard_scores |
| freshness_watch | Every 10 minutes | Check how old each source is. If older than its limit, mark scores built from it "Insufficient data" and notify the team. | source_runs |
| booking_hold_release | Every minute | Release holds whose time limit has expired | bookings, availability |

### Rules for every job

- **Dedupe by grid cell:** dozens of nearby farms share one cell's data. Sending a separate request per farm is wasteful and burns the source's limit faster.
- **Idempotent:** if a job runs twice, data must not duplicate (update if present, otherwise insert).
- **Retry and backoff:** on failure, retry at gradually longer intervals. If it keeps failing, open a "circuit breaker" for that source and alert the team.
- **Save raw data:** keep each CAP XML and each API response for a while. If an alert is questioned, we can prove what the source sent.
- **Source name and time on every row:** source, issued_at, fetched_at. This becomes the "data time" shown to users.
- **Respect limits:** keep a daily request budget for each source and never exceed it.

## 2. Database design

Everything lives in one PostgreSQL database. Location columns use PostGIS geospatial types (point or polygon, WGS84).

### Tables

| Table | Main columns | Purpose |
|---|---|---|
| users | id, phone, name, role (tourist / owner / moderator / admin), language, consent time | Login and permissions |
| farms | id, owner_id, name, state, district code, location (point), amenities, price, active? | Catalog |
| farm_static_profile | farm_id, elevation, slope, distance to river, distance to coast, landslide susceptibility class, source | Permanent risk profile, filled once when the farm is added |
| farm_climatology | farm_id, month, average heavy-rain days, temperature percentiles, source years | "Historical trend for this month" |
| availability | farm_id, date, status, price | Calendar. (farm_id + date) must be unique. |
| bookings | id, farm_id, guest_id, check-in/out, status, amount, hold_expires_at | Booking state machine |
| payments | booking_id, gateway_order_id, status, webhook events, refund | Payment record |
| source_runs | source, job, start/end, success?, record count, error | History of each source's freshness |
| forecast_snapshots | grid_cell, source, issued_at, valid_time, variables (rain, temperature, humidity, wind, river discharge) | Normalized forecast data |
| recent_conditions | farm_id, time, rainfall past 3/7 days, LHASA class | Recent conditions |
| official_alerts | cap_id, source, event, level, area (polygon), effective, expires, status (Actual/Update/Cancel), raw XML | Official alerts |
| hazard_scores | farm_id, hazard, date, level (0-3 or unknown), confidence, reasons (list), source times, computed_at | Risk engine output, read by the API |
| incident_reports | id, user_id, photo path, device GPS, photo EXIF time, claimed type, location, status, score | User reports |
| report_signals | report_id, signal name, value, weight | The full accounting of how the score was built |
| moderation_actions | report_id, moderator, decision, reason, time | Record of human decisions |
| alert_events | id, cause (official or report), message, area, level, time | Every alert event |
| alert_deliveries | alert_id, recipient, channel, sent / delivered / "I'm safe" | Full log of which alert went to whom |
| audit_log | who, what, when | Record of sensitive actions |

### Indexes and rules

- **Most important indexes:** geospatial indexes on farms' location, official_alerts' area and incident_reports' location. Without them, "which farms are in this polygon?" gets slow as records grow.
- **Reasons list** (in hazard_scores) should be stored in a structured form so the UI can show it directly.
- **Old data:** delete or summarize forecast_snapshots after a few weeks. Keep official_alerts and alert_deliveries for a long time (for audits).
- **Personal data:** decide retention periods for phone numbers and photos and provide a route for deletion requests (see `08_security_ops_roadmap.md`).

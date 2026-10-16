# Agri-Tourism Platform: Complete System Architecture (Overview)

This folder holds the detailed design of the whole system. There is no code in it, only decisions, structure, rules and checklists.

## The core constraint

Building or fine-tuning our own ML model is not feasible at this stage. So the entire system stands on **real, free, official data** and **existing tools**. Every risk signal comes either from an official source or from open rules that anyone can read and check. Every result is shown together with its reason and the time of the underlying data.

## The three USPs and what each one rests on

| USP | What it rests on |
|---|---|
| 1. Unified agri-tourism booking | Existing payment gateways, maps and WhatsApp/SMS services. We build only the catalog and the booking logic. |
| 2. Multi-disaster risk estimation | IMD, NASA and ECMWF/Open-Meteo data + rule-based scoring + historical climatology. No trained model. |
| 3. Disaster report verification and alerts | Official alerts (SACHET/IMD) are the backbone. User photo reports are an extra signal, checked by rules and a human moderator. |

## Five core principles

1. **No custom ML model.** The risk engine runs on rules. Every result ships with a list of reasons.
2. **Official first.** IMD and SACHET alerts set a floor on the risk level. Our rules cannot push the level below it.
3. **Sources must be swappable.** Each data source sits behind its own adapter. Replacing Open-Meteo with ECMWF should change one part, not the whole system.
4. **No data means "Insufficient data".** When data is missing, the system never shows "green/safe".
5. **Modular monolith.** One codebase, clean modules. Microservices are needless overhead for a small team.

## File index

| File | Contents |
|---|---|
| `00_README.md` | This file: summary, principles, glossary |
| `01_system_architecture.md` | Layers, components, life of a request, tech stack, deployment |
| `02_data_sources.md` | Every data source, its terms, the adapter rule, licence risks |
| `03_data_pipeline_and_database.md` | Ingestion jobs and database tables |
| `04_risk_engine.md` | Risk engine: levels, forecast horizons, per-hazard rules, worked examples, backtest |
| `05_alerts_and_report_verification.md` | Two alert paths, photo report verification, moderation |
| `06_booking_and_payments.md` | Booking, payments, weather-aware rebooking |
| `07_ui_and_api.md` | Screens and the list of main APIs |
| `08_security_ops_roadmap.md` | Security, privacy, reliability, testing, build phases, launch checklist |

## Glossary

| Term | Meaning |
|---|---|
| CAP | Common Alerting Protocol: the international XML format for disaster alerts. SACHET publishes alerts in it. |
| SACHET | NDMA's integrated alert system, carrying alerts from IMD, CWC, INCOIS, GSI and others |
| IMD / CWC / INCOIS / GSI | India Meteorological Department / Central Water Commission / Indian National Centre for Ocean Information Services / Geological Survey of India |
| IMERG | NASA GPM's satellite-based rainfall data |
| LHASA | NASA's landslide hazard assessment model (susceptibility + recent rainfall) |
| GloFAS | Global flood forecasting system for river discharge |
| COOLR | NASA's open repository of landslide events |
| PostGIS | PostgreSQL's geospatial extension (queries on points and polygons) |
| Adapter | A thin layer in front of each external source that converts its data into one shared shape |
| Grid cell | One square tile of weather data. Many nearby farms share the same cell. |
| Throttle | Preventing repeated messages about the same event |
| pHash | A "fingerprint" of an image used to catch similar images |
| DLT | India's mandatory registration for commercial SMS |
| DPDP Act, 2023 | Digital Personal Data Protection Act |

## One important note: thresholds are examples

Wherever this document gives numbers, intervals or weights, they are starting examples, not fixed standards. Calibrate them against IMD criteria and historical events. The method is in the "Backtest" section of `04_risk_engine.md`.

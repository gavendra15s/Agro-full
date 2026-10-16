# 02. Data Sources

These are the sources whose existence and terms were checked. For each one we note what it does in the system and what happens if it goes down.

## 1. Verified sources

### 1.1 IMD API platform (`api.imd.gov.in`)
- **What it provides:** district-wise warnings, nowcasts, district-wise rainfall, city forecasts, marine bulletins.
- **Access:** account with a key (JWT). Check the terms for commercial use and for redisplaying the data **in writing**.
- **Role in the system:** official colour alerts (green, yellow, orange, red) at district level.
- **If it goes down:** fall back to the SACHET feed.

### 1.2 SACHET (NDMA), CAP RSS
- **What it provides:** geo-targeted alerts from IMD, CWC, INCOIS, GSI and others, in CAP 1.2 XML.
- **Access:** the RSS feed is open. Each feed item links to its CAP XML. There is no separate feed per location, so we must match the alert polygon against a farm's location ourselves.
- **Role in the system:** the main trigger for real-time alerts.
- **If it goes down:** IMD API.
- **Caution:** confirm the feed's terms of use and any limits on rebroadcasting alerts with NDMA.

### 1.3 Open-Meteo (Forecast and Flood APIs)
- **What it provides:** hourly weather up to 16 days. The Flood API gives GloFAS-based river discharge forecasts and recent history.
- **Access:** no key. **Free only for non-commercial use.** Commercial use requires a paid plan.
- **Role in the system:** main forecast and river discharge source for the prototype and hackathon.
- **If it goes down:** ECMWF Open Data.

### 1.4 ECMWF Open Data (IFS + AIFS)
- **What it provides:** global forecasts up to 15 days, roughly 0.25° grid.
- **Terms:** CC-BY-4.0, meaning commercial use and redistribution are allowed, but **attribution is required**. Files come in GRIB format that we must process ourselves. The open rolling archive keeps only the latest few runs (about 2-3 days), so save whatever you need yourself.
- **Role in the system:** the forecast source for the commercial launch (option 1).
- **If it goes down:** Open-Meteo paid plan.

### 1.5 NASA GPM IMERG and LHASA
- **What it provides:** satellite rainfall (past 7 days) and landslide nowcasts, updated roughly every 3 hours.
- **Terms:** NASA data is described as free, including for commercial use.
- **Limits:**
  - LHASA is not validated everywhere, because most landslides happen where there are no observations. Present it as a "signal", not a verdict.
  - There are warnings that some satellite inputs may be disrupted, which could affect real-time IMERG accuracy. So never depend on a single rainfall source.
- **Role in the system:** recent rainfall (a soil-moisture proxy) and an extra landslide signal.
- **If it goes down:** the "past days" data from the forecast model.

### 1.6 NASA POWER
- **What it provides:** hourly, daily, monthly and climatology data.
- **Terms:** no authentication. Data lags by about 3 months, so it is not for real-time use. It is grid-based, so local extremes may be understated. Rate-limited.
- **Role in the system:** 10-year historical trend. Pull it once and keep it in our own database.
- **If it goes down:** our own saved copy.

### 1.7 NASA COOLR / Global Landslide Catalog
- **What it provides:** a list of past landslide events (location and date).
- **Role in the system:** testing our rules (backtest) and confirming susceptible areas.

## 2. Optional sources (not verified this time)

Check each one's terms and limits yourself before use.

| Source | Possible role |
|---|---|
| NASA FIRMS | Forest fires (later phase) |
| USGS / NCS | Post-event earthquake information |
| Copernicus DEM or SRTM | Farm elevation and slope |
| OpenStreetMap | Rivers, streams, roads, distance to coast |

## 3. Summary table

| Source | Role | Commercial use | Backup |
|---|---|---|---|
| IMD API | Official colour alerts | Check terms | SACHET |
| SACHET | Real-time alerts | Check terms | IMD API |
| Open-Meteo | Forecast and river discharge | No (paid plan needed) | ECMWF |
| ECMWF Open Data | Forecast | Yes, with attribution | Open-Meteo paid |
| NASA IMERG / LHASA | Recent rain, landslide signal | Yes | Past data from the forecast model |
| NASA POWER | 10-year trend | Yes | Our own copy |
| NASA COOLR | Backtest | Open data | — |

## 4. The biggest licence risk

A prototype can run on Open-Meteo, but a public platform that charges money will not count as "non-commercial". Before launch, choose one of two paths:
1. Open-Meteo's paid plan.
2. Our own forecast pipeline from ECMWF Open Data (more work, but the licence is clear).

Settle the terms for showing IMD and SACHET data in the app, or forwarding it as alerts, in writing at the same time.

## 5. Attribution requirements

- When using ECMWF Open Data, credit it as CC-BY-4.0 requires (for example "Adapted from ECMWF IFS/AIFS forecast data, licensed under CC BY 4.0").
- When using Open-Meteo, credit it too.
- Credit NASA, IMD and NDMA data per the terms on their sites.

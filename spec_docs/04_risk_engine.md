# 04. Risk Engine (USP 2)

From the data above, the risk engine produces a **level**, a **confidence** and a **list of reasons** for every farm, every date and every applicable hazard. There is no trained model. Everything is rule-based.

## 1. Data flow

```
INPUTS (four groups)
  1. Static profile       elevation, slope, distance to river/coast, landslide susceptibility
  2. Recent conditions    IMERG rainfall (past 7 days), LHASA nowcast
  3. Forecast             Open-Meteo or ECMWF, GloFAS river discharge
  4. Official alerts      IMD district-wise, SACHET polygons
        │
        ▼
DATA NORMALIZER
  - Cache by grid cell
  - Same units and time zone (IST)
  - Freshness check: how old is the data?
  - Missing value → "unknown" marker, never zero
  - Every value keeps its source and time
        │
        ▼
PER-HAZARD MODULES
  Landslide | Flood / flash flood | Cyclone / storm | Extreme heat | (Thunderstorm: IMD nowcast passed through)
        │
        ▼
FUSION (rule-based)
  1. Each component gives a level 0 to 3
  2. Official alert = floor (rules cannot lower it)
  3. Confidence = data freshness + forecast horizon + agreement between sources
  4. Missing data → "Insufficient data"
        │
        ▼
OUTPUT: hazard_scores
  Level (Green / Yellow / Orange / Red / Insufficient data) + confidence + reasons + data time
```

The API only reads `hazard_scores`. Computation has already happened in the background.

## 2. What the levels mean

The first four levels follow IMD's colour code. The fifth exists so the system never shows "safe" when it has no data.

| Level | What the user should see |
|---|---|
| Green | No notable risk at this time. (This is not a guarantee.) |
| Yellow | Be aware. Keep checking the latest weather information. |
| Orange | Be prepared. Reconsider your travel plans or activities. |
| Red | Serious risk. Put the option to postpone or change the trip at the very top. |
| Insufficient data | This risk cannot be assessed right now. It does not mean "safe". |

In the UI the level must always appear as **both colour and word**, so people who cannot distinguish colours can still understand it.

## 3. Travel date and trust

| Days until travel | Inputs used | Label shown to the user | Confidence |
|---|---|---|---|
| 0 to 3 days | Forecast + nowcast + official alerts + recent rainfall | "Forecast" | High (if data is fresh) |
| 4 to 7 days | Forecast + IMD's multi-day alerts | "Forecast" | Medium |
| 8 to 15 days | Forecast only | "Early estimate" | Low |
| More than 15 days | Historical climatology only | "Historical trend": no level, just information, for example "in how many of the last 10 years this month had heavy-rain days" | Not applicable |
| Data missing or older than its limit | — | "Insufficient data" | Not applicable |

When the trip is more than 15 days away, the app re-checks automatically as the date approaches and notifies the tourist. This is the foundation of "weather-aware booking".

### How confidence is decided

1. Start from the horizon: 0-3 days high, 4-7 days medium, 8-15 days low.
2. If an official alert exists and agrees with the rule result (difference of one level or less), raise confidence by one step (never above high).
3. If data freshness is outside its limit, do not compute a level at all. Show "Insufficient data".
4. Where a source has a known limitation (for example GloFAS on small streams), lower confidence by one step.

## 4. Structure of the per-hazard rules

| Hazard | When it applies | Inputs | Rule structure | Official alert |
|---|---|---|---|---|
| Landslide | Farm has a steep slope or high susceptibility class (hill farms) | Rainfall forecast for the next 24-72 hours, rainfall in the past 3-7 days, LHASA nowcast, susceptibility class | Upcoming rain sets the base. Wet soil and high susceptibility raise the level, low susceptibility lowers it. | IMD heavy-rain and GSI alert levels set a floor |
| Flood / flash flood | Farm near a river, stream or low-lying area | River discharge percentile (against that location's own history), rainfall in the next 72 hours, distance to river | The higher the discharge percentile and the heavier the rain, the higher the level. GloFAS is built for large rivers and does not fully catch sudden flash floods on small streams, so lower confidence there. | CWC flood alerts |
| Cyclone / storm | Farm close to the coast | IMD / INCOIS alerts, wind gust and rainfall forecast | The main signal is the official alert. Our rules only add supplementary information from wind and rain. | Sets the level directly |
| Extreme heat | All farms | Maximum temperature and humidity to compute a "heat index" | A well-known formula (such as Rothfusz) and its classification | IMD heat-wave alerts |
| Lightning / thunderstorm | All farms | IMD nowcast | No rule of our own. Show whatever IMD says. | Directly |
| Earthquake | — | — | Earthquakes cannot be predicted. Keep them out of the risk score. Post-event notifications can be added in a later phase. | — |

### Rainfall categories (IMD standard limits, per 24 hours)

| Category | mm |
|---|---|
| Heavy | 64.5 to 115.5 |
| Very heavy | 115.6 to 204.4 |
| Extremely heavy | 204.5 or more |

Check these once against IMD's website before use.

## 5. Landslide example rule (to understand the approach)

This rule only shows how the engine thinks. The thresholds are examples.

**Inputs:**
- Category of rain expected in the next 24 hours: light/moderate (0), heavy (1), very heavy (2), extremely heavy (3).
- Did it rain a lot in the past 3 days? (wet soil: yes = 1, no = 0)
- Farm susceptibility: low (−1), medium (0), high (+1).
- Official alert: none (0), yellow (1), orange (2), red (3).

**Steps:**
1. If expected rain is "heavy" or above: base level = rain category + wet soil + susceptibility.
2. If rain is light but the soil is wet and susceptibility is high: level is Yellow (1).
3. Otherwise: level is Green (0).
4. Keep the level between 0 and 3 (never below or above).
5. If an official alert is higher than this level, the final level is the official alert's level. An official alert can only raise the level, never lower it.
6. Every step records its reason in the reasons list.

### Worked examples

| Scenario | Rain | Wet soil | Susceptibility | Official alert | Final level | Reason |
|---|---|---|---|---|---|---|
| 1 | Heavy | No | Medium | None | Yellow | Base level from heavy rain |
| 2 | Heavy | Yes | High | None | Red | Wet soil and high susceptibility add two levels |
| 3 | Very heavy | No | Low | None | Yellow | Low susceptibility lowered the level by one |
| 4 | Light | Yes | High | None | Yellow | Rain is light, but soil is wet and the area is susceptible |
| 5 | Light | No | Medium | Orange | Orange | The official alert raised the level |
| 6 | Very heavy | Yes | Medium | Yellow | Red | Rule result is higher than the official alert, so the rule result stands |
| 7 | (any) | (any) | (any) | (any) | No level, only "Historical trend" | Travel is more than 15 days away |
| 8 | (any) | (any) | (any) | (any) | Insufficient data | Source data is older than its limit |

## 6. What the user sees (the risk card)

For each hazard the card shows:
- The level (colour and word).
- A one-line reason (for example "Heavy rain forecast in the next 24 hours and the soil is already wet").
- Confidence.
- Data time and source.
- Disclaimer: "This is a risk estimate, not a guarantee of safety."
- For dates more than 15 days away: "Historical trend", no level.
- If the level is Orange or Red: the option to change the date or cancel, shown most prominently.

## 7. How to test the rules without ML (backtest)

You can measure rule quality without training any model. This is data analysis, not training.

1. From COOLR or the Global Landslide Catalog, take landslide events in India over the past few years (location + date).
2. For each event's location and date, pull the rainfall history for that time (from IMERG or POWER).
3. Run your rule on those dates and count how often it shows Orange or Red.
4. Then run it on an equal number of "no-event" dates and count how often it gives a false warning.
5. Compare the two and use the difference to adjust thresholds.
6. Record the results honestly, even if they are limited.

**Caution:** the recorded events are not all events. The catalog has gaps and misses small events. So "how many events did we catch" is a reliable figure, but "how many false warnings" is only an estimate, because a "no-event" day may not truly have been event-free.

This method gives your research paper or pitch a concrete basis for saying "we tested our rules against historical events".

## 8. How to add a new hazard

Every hazard module has the same structure:
1. When it applies (which farms).
2. Which inputs it needs.
3. Rules and levels.
4. How it ties to official alerts.
5. Output: level + confidence + reasons.

So adding a new hazard (such as forest fire) does not change the rest of the system.

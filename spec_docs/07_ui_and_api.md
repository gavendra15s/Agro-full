# 07. User Interface and Main APIs

## 1. Tourist (PWA)

| Screen | What it shows |
|---|---|
| Search | Farms on a map and in a list. Filters: state, budget, amenities, dates. |
| Farm page | Photos, amenities, availability calendar and the **risk card** |
| Booking / checkout | Dates, amount, payment, cancellation policy |
| My trips | Booking status, active alerts on top, "I'm safe" button |
| Report | In-app camera, location permission, a few words of description |
| Alerts | A clear difference between official and unconfirmed, with source and time |

### Rules for the risk card

- Each hazard's level in **both colour and word**.
- A one-line reason.
- Confidence (high / medium / low).
- "Data time and source" (for example "IMD, today 14:30").
- Disclaimer: "This is a risk estimate, not a guarantee of safety."
- The card changes the moment the date changes. For a date more than 15 days away, show "Historical trend", not a level.
- In the "Insufficient data" state, state clearly that it does not mean "safe".
- On orange or red, show the "Change date / Cancel" option prominently.

### Offline behaviour

Through the PWA's service worker, the last alert and emergency numbers (such as 112) should show even without a network. Remote farms often have weak connectivity, so this matters.

### Language

Hindi and English. Regional languages (Marathi, Tamil and others) can be added later. Alert messages follow the chosen language too.

## 2. Farm owner

- **WhatsApp:** new-booking notification and accept/decline.
- **Small dashboard:** calendar, bookings, active alerts, guest list and who has said "I'm safe".
- **Make adding a farm easy:** drop a pin on the map and the system fills in the permanent risk profile automatically.
- **Risk page for owners:** the next 15 days of risk for their farm, and its history.

## 3. Admin and moderator

- Report queue and the breakdown of signals.
- **Source health page:** the last successful time for each data source. This is the most important screen for the team.
- Test alerts in simulation mode.
- Review and approval of farms.

## 4. Main APIs

| Request | Purpose | Who |
|---|---|---|
| GET /farms (lat, lng, radius, state, from, to, amenities) | Search, with availability | Everyone |
| GET /farms/{id} | Full farm details | Everyone |
| GET /farms/{id}/risk?date=… | Risk for that date: level, confidence, reasons, data time | Everyone |
| POST /bookings | Create a hold | Tourist |
| POST /bookings/{id}/pay | Create a payment order | Tourist |
| POST /webhooks/payment | Confirmation from the gateway (after verifying the signature) | Gateway |
| GET /me/alerts | Active alerts connected to my farm or booking | Tourist, owner |
| POST /alerts/{id}/ack | "I'm safe" | Tourist |
| POST /reports | Submit a photo report | Verified user |
| GET /reports/{id} | Report status | Reporter |
| GET /admin/reports?status=pending | Moderation queue | Moderator |
| POST /admin/reports/{id}/decision | Decision on a report | Moderator |
| POST /admin/simulate-alert | Fake alert, test environment only | Admin |
| GET /admin/sources/health | Freshness of each source | Admin |

### General API rules

- Every response that carries risk or alert data includes an indication of its source and time.
- Lists are paginated.
- Error messages are clear and can be shown in the user's language.
- Idempotency keys on writing requests (booking, payment).
- The risk API only reads `hazard_scores`. It calls no outside API.

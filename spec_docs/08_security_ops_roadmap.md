# 08. Security, Reliability, Testing, Roadmap and Launch Checklist

## 1. Security and privacy

- **Login and permissions:** OTP login, short-lived JWTs, role-based access (tourist, owner, moderator, admin). An owner sees only their own farm's data.
- **Abuse prevention:** rate limits on OTP, reports and login. Users cannot broadcast alerts to everyone. Only alerts from official sources go out automatically.
- **Upload safety:** check file type and size, re-encode photos, store them in a private bucket, open them only through signed links.
- **Payments:** never keep card details on our servers. Only the gateway should. Verify webhook signatures.
- **Secrets:** not in code. Keep them in the environment or a secret manager.
- **Data protection law:** location and photos are personal data. Under India's Digital Personal Data Protection Act (DPDP Act, 2023), provide for consent, purpose limitation, retention periods and deletion requests. Have a lawyer review this before launch.
- **SMS rules:** commercial SMS in India requires DLT registration. Get message templates approved in advance.
- **Backups and audit:** daily database backups. An audit log of every alert sent and every moderation decision.

### Legal responsibility (the most important warning)

A wrong or late alert can raise legal questions. So:
- Write "risk estimate, not a guarantee" on every screen.
- Give the source and time in every message.
- Keep a clear difference between "official" and "unconfirmed".
- Have a lawyer prepare the terms of service.

No technical measure can replace this.

## 2. Reliability: when something breaks

| Situation | System behaviour |
|---|---|
| One data source is down | Show the last known result marked "stale, time …". If older than the set limit, "Insufficient data". |
| Main forecast source down | Switch to the other source (Open-Meteo ↔ ECMWF) |
| Main official-alert source down | Switch to the other source (SACHET ↔ IMD) |
| Push alert fails | SMS or WhatsApp. Each recipient's delivery status goes in the log. |
| A job keeps failing | Automatic retries. Alert the team if it keeps failing. |
| Database or server problem | Restore from backup. Rehearse this in advance. |

**Core rule:** when data is lacking, the system lands on "Insufficient data", never on "Green".

### Monitoring

- **Source freshness page:** the last successful time of every source.
- **Job health:** when each job last ran.
- **Errors:** a service like Sentry.
- **Alert delivery:** how many sent, how many arrived, how many failed.

## 3. Testing

| Approach | How |
|---|---|
| Table-driven tests of the risk engine | Unit tests over many fixed scenarios (inputs → expected level). The worked-example table in `04_risk_engine.md` is a starting point. |
| Tests from recorded responses | Save real API and CAP XML samples and test each adapter with them, so tests need no internet |
| Replay past alerts | Run past real alerts (saved XML) and check that the right farms were chosen |
| Failure drills | Deliberately shut off a source and check that the system lands on "Insufficient data", not "Green" |
| Load testing | Many simultaneous requests to the risk-reading API |
| Booking tests | Two people trying to book the same date at once (no double booking) |
| Payment tests | A webhook arriving twice, arriving late, arriving with a wrong signature |
| Historical backtest | As described in `04_risk_engine.md` |

## 4. Build phases

| Phase | What gets built | Done when |
|---|---|---|
| 0. Validate | Talk to 10-20 farm owners: do they want online bookings, what commission, are they comfortable on WhatsApp | At least a few farms are ready to be early partners |
| 1. Booking MVP | Search, farm page, calendar, booking, payment, WhatsApp notification to the owner, 7-day weather on the farm page | One real booking completes start to finish with no manual touch |
| 2. Official alerts + risk v1 | SACHET/IMD ingestion, farm matching, alert dispatch, permanent farm profile, landslide, flood and heat rules, risk card, source health page, weather-aware rebooking | Replaying old real alerts gives the right farms the right level. Backtest results are recorded. |
| 3. User reports | In-app camera reports, automatic checks, credibility score, moderator panel, "unconfirmed" messages | Moderator decisions are recorded and the score weights match them |
| 4. Commercial launch | Licences settled (forecast, IMD/SACHET), legal documents, DLT and WhatsApp approvals, optional AI classification of photos, cab and insurance partnerships, other hazards | Every item in the checklist below is complete |

### The smallest version for a hackathon or pitch

- 5-6 sample farms.
- The booking flow.
- A date-aware risk card (real forecast + official alerts).
- One full alert flow through simulation mode: upload, checks, moderator confirmation, message to a guest.

This is enough to show all three USPs working.

## 5. Risks and open questions

| Risk | How to reduce it |
|---|---|
| Legal questions over a wrong or late alert | Disclaimers, source and time in every message, moderation, a lawyer's advice |
| False alarms eroding trust | Channel by level, throttling, the moderator layer |
| Few users at first, so few reports | The official feed is the backbone, reports are only extra |
| A data source shutting down or changing terms | Adapters, two paths for each need, our own historical copy in the database |
| Licensing (forecast) | Choose the paid plan or the ECMWF route before launch |
| Owners' digital comfort | WhatsApp-based interface, make adding a farm easy |
| Weak networks | Offline PWA, SMS backup |
| Market size | The 1,500+ farms figure is an estimate from your research. Verify it on the ground: the real number, and how many would want online bookings. |
| Limits of LHASA / IMERG | Present them as "signals" and cross-check against another source |

## 6. Pre-launch checklist

These are things that cannot be settled here. Get each answer in writing from the source.

| Question | Where to find out | Done? |
|---|---|---|
| Is the IMD API's data allowed to be shown in a commercial app and forwarded as alerts? | IMD API platform's terms of use, and IMD directly if needed | ☐ |
| What are the terms for using the SACHET feed, and what limits are there on rebroadcasting alerts? | NDMA / SACHET terms and contact | ☐ |
| Which forecast source will we use: Open-Meteo's paid plan or ECMWF Open Data? What is the correct attribution? | Open-Meteo's terms, ECMWF's CC-BY-4.0 and terms of use | ☐ |
| What is the current status and accuracy limit of LHASA and IMERG real-time products? | NASA GPM and LHASA notices | ☐ |
| Payment gateway: split payments to owners, KYC and fees? | Razorpay's or Cashfree's current documentation | ☐ |
| SMS DLT registration and WhatsApp template approval? | The SMS provider and WhatsApp Business process | ☐ |
| Legal liability for a wrong or late alert, and the terms of service? | A lawyer | ☐ |
| Consent, retention and deletion arrangements under the DPDP Act? | A lawyer and the Act's rules | ☐ |
| Tax (GST) and the commission arrangement? | A chartered accountant | ☐ |
| Map tile provider's terms and limits? | The provider's documentation | ☐ |
| Photo storage free limit and cost? | The provider's documentation | ☐ |

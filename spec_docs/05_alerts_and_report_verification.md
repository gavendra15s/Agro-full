# 05. Alerts and Report Verification (USP 3)

The alert engine has two paths:
- **Path A: official alerts.** Fully automatic. This is the backbone of trust.
- **Path B: user photo reports.** Only an extra, early signal. A layer of human review sits on top.

## 1. Path A: official alerts

### Flow

```
SACHET poll (every 5 minutes)
   ▼
CAP parse: polygon, level and time from the XML
   ▼
Farm match: which farm locations does the alert polygon cut across (PostGIS)
   ▼
Audience: the farm's owner + guests whose booking is active or starting soon
   ▼
Throttle: remove duplicates, handle Update / Cancel
   ▼
Dispatch: push, WhatsApp, SMS, email
   ▼
Log: delivery status and "I'm safe" replies
```

Warnings from the IMD API go through the same flow, but are matched by district code instead of polygon.

### Rules

1. **Send only when there is impact.** The alert's area must cut across the farm's location. Then build the audience.
2. **Channel by level.** Set a minimum level per channel. For example: yellow in-app only, orange or red also by SMS and WhatsApp. Texting everyone every time makes people start ignoring alerts.
3. **Throttle and duplicates.** Do not send message after message for updates of the same event. On Update, replace the old message. On Cancel, send "alert withdrawn".
4. **"I'm safe" button.** Put a link in the alert so guests can reply. The owner's dashboard shows how many guests have replied and who is still pending.
5. **Always show the source.** Write "Source: IMD / SACHET" and the issue time in the message.
6. **Bilingual messages.** Hindi and English both, with the user's chosen language first.
7. **Closing the alert.** When conditions return to normal or the alert period ends, send an "all clear" message.

### Sample message

> An orange heavy-rain alert has been issued around your farm (Source: IMD, time: …). Stay at a high, safe place. In an emergency, call 112.

### The government's own alert system

SACHET already sends national-level alerts to mobile phones. So our job is not to repeat government alerts. Our job is to be **hyperlocal**: "what is the alert at your farm, how many guests are there, and what should the owner do".

## 2. Path B: user reports

### Flow

```
A verified user takes a photo with the in-app camera
   ▼
Upload: through a secure link, with GPS and time
   ▼
Automatic checks: photo GPS vs phone GPS, time, duplicate image (pHash)
   ▼
Context signals: rainfall at that place, official alerts, nearby reports
   ▼
Credibility score (from configured weights)
   ▼
Decision: score band + moderator
```

### Who can report

Only **guests with an active booking** or **registered farm owners/staff**. Everyone else can only read alerts. This is the cheapest and most effective control, because it closes the path for outsiders to send fake reports.

### Signals

| Signal | How to measure | Why it helps |
|---|---|---|
| Who is reporting | Guest with an active booking or registered owner/staff | Stops fake reports from outsiders |
| Photo taken with the in-app camera | Gallery upload disabled, photo taken at that moment | Old or internet images become nearly impossible |
| Does the location match? | Compare the photo's EXIF GPS, the phone's live GPS and distance to the farm | Reports from the wrong place get caught |
| Does the time match? | EXIF time vs server time | Old photos get caught |
| Duplicates | Find similar images with a perceptual hash (pHash) | The same photo reused, or slightly altered |
| Weather context | Rainfall at that place in the past 24-72 hours and the upcoming forecast | A "landslide" claim is more credible when heavy rain actually fell there |
| Official alerts | Is there an active IMD/SACHET alert at that place? | Corroboration |
| Other nearby reports | Reports from different people within a few km and a few hours | Independent confirmation |
| Reporter history | How many of their earlier reports proved correct | Rank trusted people higher |
| (Optional) AI classification of the photo | An existing open model, with very low weight | Not needed in the first version. Fake images and misclassification are both possible, so it must never be the sole deciding factor. |

### Credibility score

- Put all signals in a config file with **weights**, and add them up to get the score.
- Start with guessed weights, then adjust them gradually using moderators' real decisions.
- This is rule tuning, not model training.
- How the score was built is recorded in `report_signals`.

### Score bands and outcomes

| Band | What happens |
|---|---|
| Low score | Reject or hold pending. No alert goes to anyone. |
| Medium score | Goes to the moderator queue. (Optional) nearby farm owners get an "unconfirmed report" message. |
| High score + moderator confirmation | Alert to guests, meaning the dispatch step of Path A. |

**The final decision on Path B stays in human hands.** The score only decides who sees the report and how quickly.

## 3. Moderation

- **Moderator panel:** the report in a queue, the photo, location on a map, the breakdown of signals, and "confirm / reject / ask for more information" buttons.
- **Every decision recorded:** who, when, what, and why (`moderation_actions`).
- **Response time:** set a time limit for the moderator queue. Higher-level reports show first.
- **Route for wrong confirmations:** if a confirmation later proves wrong, there should be a way to send a correction message and fix the reporter's history.

## 4. Language and privacy rules

- **Be careful with "unconfirmed".** Before confirmation, never write that a disaster has happened. Write: "An unconfirmed report has been received".
- **Photo privacy.** Strip EXIF before showing anything publicly. Keep the original photo in a private bucket, for moderators only.
- **Retention.** How long report photos are kept should be decided in advance and told to users.

## 5. Simulation mode

For demos and testing, an admin should be able to create an alert with a clear **"TEST"** tag. It runs only in a separate test environment and never reaches real users. For a hackathon or pitch, this is the safe way to show the entire alert flow (upload, checks, moderator confirmation, message to a guest) without a real disaster.

## 6. Limits of responsibility

- An AI merely classifying a photo as a "disaster" will not count as final confirmation.
- Build the possibility of wrong or old photos, misleading reports and wrong locations into the structure itself: reporter verification, in-app camera, GPS and time checks, duplicate detection, a credibility score and human verification.
- Official alerts always go straight through Path A. Reports only provide an extra, early signal.

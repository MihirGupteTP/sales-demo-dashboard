# Meeting Tracking Spec (proposed)

Date captured: 2026-04-17. Owner: Mihir. Status: draft for review — no code changes yet.

## Goal

Accurately count every scheduled Zoom demo, regardless of whether a HubSpot deal exists yet. Split the count into **Booked**, **Upcoming**, **Attended**, **No-Show**. Deal-level demo-stage tracking is a secondary layer — a missing deal must not make a meeting invisible.

## Source of truth

| Field | Source | Notes |
|---|---|---|
| Meeting exists | HubSpot meeting engagement (`hs_meeting_*`) | Filters: sales owner, `hs_video_conference_url` set, `hs_activity_type = Demo` or blank |
| Booked-by rep | Zoom `host_email` (primary) → HubSpot owner (fallback) | Zoom wins when both exist |
| Attendance (past) | Zoom participants report | Any non-`truckerpath.com` email joined → `attended`; only internal → `no_show`; report expired → keep HubSpot outcome |
| Demo stage | HubSpot deal `demo_done` | Only present when deal is associated; dashboard must not require it |
| Contact / lead association | HubSpot deal associations | Compliance flags only — do not filter meetings out |

## KPI definitions

| Metric | Rule |
|---|---|
| **Booked** | Every meeting in the period that passes the source-of-truth filters. Includes meetings with no associated deal. |
| **Upcoming** | Subset of Booked where `meetingDate > now`. |
| **Attended** | `status === 'attended'` OR deal's `demo_status === 'completed'`. |
| **No-Show** | `status === 'no_show'` OR deal's `demo_status === 'no_show'`. |
| **Show rate** | Attended / (Attended + No-Show). Booked meetings without Zoom data don't enter the denominator. |

## Compliance flags (badges, not filters)

- `no_deal` — meeting has no associated deal in the default pipeline
- `blank_demo_status` — deal exists but `demo_done` is empty
- `no_contact` — deal has no contact association
- `no_lead` — deal has no lead association

Each flag is a tag, never a filter. A `no_deal` meeting still counts in Booked / Upcoming / Attended / No-Show.

## Attendance logic detail

For each meeting with a Zoom link:
1. Pull Zoom participants for past, non-terminal meetings.
2. Drop participants without an email (dial-ins, unauthenticated guests) — they can't be classified and would inflate Attended.
3. If any remaining participant's domain ≠ `truckerpath.com` → `attended`.
4. Otherwise → `no_show`.
5. If Zoom returns 404 (data expired after ~30 days, or meeting never ended) → keep HubSpot outcome.

Open question: should a Zoom-confirmed `attended` override a HubSpot `NO_SHOW` outcome? Current code: yes, Zoom wins for past non-terminal meetings. Flag if we want a different precedence.

## Verification checklist (before shipping any change)

1. Create a HubSpot meeting with no deal, confirm it appears in Booked + Upcoming.
2. Create a HubSpot meeting with a deal missing contact, confirm it appears in Booked and gets a `no_contact` badge.
3. Past meeting with Zoom prospect join → Attended.
4. Past meeting with only internal joiners → No-Show.
5. Past meeting older than 30 days (Zoom data expired) → fall back to HubSpot outcome without crashing.
6. Today filter → count should match HubSpot's "today" view plus any no-deal strays HubSpot hides.

## Known gap to investigate (not a spec item)

The current "Booked" KPI filters by **`bookedOn` (creation date)**, not meeting date. A meeting created last week that happens today counts toward *last week's* Booked, not today's. Confirm this is intended before coding anything — if the intent is "meetings happening today," switch to `meetingDate` filter. Julian Besliu's meeting today is a good test case.

## Out of scope for this spec

- Changing HubSpot outcome enforcement (still manual).
- Deal-level demo stage KPIs (still follow `demo_done` — separate card group).
- Leaderboard changes.

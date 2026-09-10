# SkillTrace

A skilling-outcomes tracking dashboard for government skill-development programmes.

SkillTrace follows what happens to trainees **after** a government skill-training
course ends — whether they got employed, started a business, became an apprentice,
or simply cannot be reached. Two rules shape everything in it:

1. **Employment is only counted after 3+ months at the same employer.**
   A placement letter is not an outcome. Until there is evidence the person was
   still at the same place three months later, the record reads
   *"awaiting 3-month confirmation"*, never *"employed"*.

2. **Every number carries its evidence.** No figure appears without showing how
   much of it can be trusted, split into four tiers:

   | Tier | `trust_level` | Meaning |
   |---|---|---|
   | 🟢 **Verified** | `high` | Confirmed by bank records or directly by the employer |
   | 🔵 **Corroborated** | `medium` | Checked in person by a field officer, or matched across two sources |
   | 🟠 **Self-reported** | `low` | Stated by the trainee, not yet independently confirmed |
   | ⚪ **Stale** | `stale` | Last confirmed more than 9 months ago — treat as out of date |

This repository currently contains the **frontend** (`frontend/`).

---

## Running it

```bash
cd frontend
npm install
npm run dev
```

Then open <http://localhost:5173>. **No backend is required** — see below.

## Backend, and running without one

Every call goes to the real API first and falls back to a local mock store if the
backend is unreachable, slow (>2.5s) or errors. A badge in the top-right always
says which you are looking at: **LIVE API** or **MOCK DATA**.

Configure via `.env` (copy `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE` | `http://localhost:8000` | Backend base URL |
| `VITE_EMPLOYER_CONFIRM_PATH` | `/checkin` | Endpoint for the employer confirmation page |
| `VITE_FORCE_MOCK` | `0` | Set to `1` to skip live calls entirely |

### Endpoints consumed

| Method | Path | Screen |
|---|---|---|
| `GET` | `/dashboard?cohort=&course=&provider=&district=&demographic=` | Dashboard |
| `GET` | `/providers` | Centre ranking |
| `GET` | `/skill-gap` | District grid + intended-vs-actual chart |
| `GET` | `/disputes` | Disputes |
| `POST` | `/disputes/:id/resolve` | Disputes — mark resolved |
| `GET` | `/consent` · `GET /consent/:id` | Consent |
| `POST` | `/consent` | Grant consent |
| `DELETE` | `/consent/:id` | **Withdraw consent** |
| `POST` | `/checkin` | Check-in simulator, employer confirmation |
| `GET` | `/followup-queue` | Follow-up queue |
| `POST` | `/followup-queue/:id/assign` | Assign a field officer |
| `GET` | `/trainees` · `GET /trainees/:id` | Record pickers |

> **Employer confirmation endpoint is not yet settled.** It currently posts to
> `/checkin` with `source: "employer"`. If the backend adds a dedicated route,
> change `VITE_EMPLOYER_CONFIRM_PATH` — that is the only place it is referenced.

### Data shapes

The agreed schema is used verbatim:

```js
trainee  { id, name, course, district, gender, age_group }
event    { id, trainee_id, date, what_happened, job_role, salary, source, trust_level }
provider { id, name, district, certified_count, verified_placement_pct,
           retention_3mo, retention_6mo, retention_12mo }
dispute  { id, trainee_id, employer_claim, trainee_claim, date, status }
```

**Fields the frontend adds on top**, because the required screens cannot be built
without them — the backend should expect to return these too:

| Field | On | Why |
|---|---|---|
| `cohort` | trainee | The "Cohort / Batch" filter |
| `provider_id` | trainee | The "Training Centre" filter |
| `category` | trainee | The "Demographic" filter (SC/ST/OBC/General) |
| `phone` | trainee | Follow-up queue contact column |
| `employer` | event | Required by the 3-months-at-the-**same**-place rule, by the employer confirmation page, and by the check-in message text |

The `demographic` query parameter is namespaced so one dropdown covers three
attributes: `age_group:25-34`, `gender:Female`, `category:SC`.

---

## Screens

| Route | Screen |
|---|---|
| `/` | Government dashboard |
| `/disputes` | Disputed records |
| `/consent` | Consent management + withdrawal |
| `/check-in` | Simulated messaging check-in |
| `/employer/:token` | Employer confirmation (public, no login) |
| `/follow-up` | Assisted follow-up queue |

### 1. Dashboard
Five combining filters (AND logic), five summary cards, and a composition bar
that reconciles every trainee to 100%. Above the cards sits the contrast the
system exists to expose: **reported placement rate vs verified employment rate**.
Clicking any figure opens its evidence-tier breakdown. Also includes the centre
ranking table (sortable on every column), a district skill-gap grid, retention at
3/6/12 months, wage progression by cohort, and intended-vs-actual job role.

Clicking a district tile or a centre row filters the whole dashboard.

### 2. Disputes
Where an employer and a trainee describe the same job differently, both claims are
held side by side and the record is excluded from outcome figures until a human
reviewer decides. A reviewer can record which account stands, or send it for field
verification, with an optional note.

### 3. Consent
Shows one trainee's consent: granted date, exactly what they agreed to, and
exactly what is held about them. **Withdraw Consent** issues a real
`DELETE /consent/:id`, then shows a receipt with the dashboard figures *before and
after* the withdrawal. The person's records disappear from every figure in the
system immediately — a dashboard open in another tab shows a "refresh figures"
banner, and on refresh the affected cards flash with a delta chip (e.g. `▼ 1`).

### 4. Check-in simulator
A phone-frame messaging mockup. **The interface is fake; the API call is not** —
tapping a reply sends a real `POST /checkin`, and the request and response are
shown next to the phone. Each first answer triggers a different follow-up
question. Responses are recorded as *Self-reported*, because that is what they are.

### 5. Employer confirmation
A public, no-login page reached from a link. Shows a partially masked trainee name,
the employer, the role on record, and three answers — still working / left / never
worked here — plus an optional wage band. Recorded as *Verified* evidence.

### 6. Follow-up queue
Trainees unreachable after three automated attempts, for assignment to a field
officer. An unanswered message is treated as missing data, not as a bad outcome.
Answering a check-in removes a trainee from this queue automatically.

---

## Demo script

1. **Dashboard** — point at *reported 65.5%* vs *verified 42.1%*. Click the
   **Employed** card to show the evidence split. Filter by district and course to
   show the numbers move together.
2. **Disputes** — show two contradicting claims; resolve one.
3. **Check-in simulator** — tap through a conversation; show the real request and
   response, and the *Self-reported* tier it produces.
4. **Consent** — open a second browser tab on the dashboard first. Withdraw
   consent. Show the before → after receipt, then switch to the dashboard tab:
   it shows the refresh banner, and the figures drop.

**Reset demo data** in the sidebar restores everything to the seeded state.

---

## Notes on the mock data

The mock store is not hardcoded JSON — it generates 420 trainees, ~950 events, 12
centres and 9 disputes from a fixed seed, then computes every dashboard figure
from that. This means filters genuinely filter, and withdrawing consent genuinely
removes a person from every aggregate. Session changes (withdrawals, resolutions,
check-ins, assignments) persist in `localStorage` and propagate across browser
tabs.

`AS_OF` in `frontend/src/api/mock/dataset.js` is the reference date (10 Sep 2026);
cohorts and checkpoint maturity are computed relative to it.

## Not built (deliberately)

No login or authentication (the dashboard assumes an authenticated operator),
no real WhatsApp Business API integration, no mobile app, no deployment or
Docker configuration.

## Stack

React 18 · Vite · React Router · Recharts · plain CSS (design tokens in
`frontend/src/styles/global.css`).

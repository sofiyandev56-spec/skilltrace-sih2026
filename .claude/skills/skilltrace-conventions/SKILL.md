---
name: skilltrace-conventions
description: Architectural and legal conventions for the SkillTrace skilling-outcomes portal. Use when adding a screen, a figure, an API call, or any government chrome to this project.
---

# SkillTrace conventions

SkillTrace reports what happened to trainees after a government skilling course.
Its credibility rests on two promises, and most of the rules below exist to keep
them. Read this before adding a screen, a figure or an endpoint.

## 1. Employment means three months at the same employer

A placement letter is not an outcome. A `placed` event on its own is reported as
**"awaiting 3-month confirmation"** — never as employment. Only a later
`still_working` event, at the *same* `employer`, 75+ days after the placement,
promotes a trainee to the `employed` bucket.

This rule lives in one function, `classify()` in `src/api/mock/handlers.js`.
Do not re-derive employment anywhere else. If a screen needs to know whether
someone is employed, call `classify()`.

The dashboard deliberately shows the reported placement rate *beside* the
verified employment rate. That gap is the argument the product exists to make —
do not quietly remove it to make the numbers look better.

## 2. No figure appears without its evidence

`trust_level` maps to exactly one visible tier, defined once in
`src/lib/evidence.js`:

| `trust_level` | Tier | Colour |
|---|---|---|
| `high` | Verified | green `#1a7a4c` |
| `medium` | Corroborated | blue `#2b6cb0` |
| `low` | Self-reported | orange `#b4623a` |
| `stale` | Stale | grey `#8a949e` |

Rules that follow from this:

- **Never reuse a tier colour to mean something else.** A green line meaning
  "2025-Q1", or a green bar meaning "above target", teaches the reader that green
  is not really "Verified". Non-tier colours come from `src/lib/chartTheme.js`
  instead — a sequential ramp for ordinal series, a neutral fill for magnitude
  bars, a separate heat ramp for the district grid. A continuous ramp with a
  legend is exempt; a categorical swatch never is.
- **Every number carries provenance.** A headline figure gets a `StatCard` with
  its stacked `EvidenceMeter` and a click-through breakdown. A chart whose points
  are too small for their own badge gets an `EvidenceFooter` under it. If you are
  adding a figure and cannot say where its evidence comes from, that is a sign
  the API response is missing an `evidence` block, not a sign to skip the badge.
- **Colour is never the only carrier.** Tiers always ship a written label too, so
  the trust level survives a high-contrast theme and a screen reader.

## 3. Live API first, mock fallback always

Every call goes through `src/api/client.js`. It tries the real backend, and on
timeout or error silently falls back to the local mock store, flipping the
`ModeBadge` to "Mock data".

- **Never call `fetch` directly from a component**, and never import
  `api/mock/handlers.js` outside the client — that bypasses the fallback and the
  mode badge, so the operator can no longer tell what they are looking at.
- Importing `api/mock/store.js` is allowed only for `initStore` and `subscribe`.
- The mock store *computes* aggregates from a seeded dataset rather than serving
  canned JSON. That is what makes filters genuinely filter and consent
  withdrawal genuinely remove someone from every number. Keep it that way: if you
  add a figure, compute it, don't hardcode it.

## 4. Consent withdrawal must be visibly real

Withdrawal is the closing moment of the demo. `DELETE /consent/:id` removes the
trainee from every aggregate immediately; the consent screen shows the dashboard
figures before and after; the dashboard flashes changed cards with a delta chip
and drops its denominator.

Delta chips compare against the figures for **the same filter slice**, keyed off
`filters_applied` from the response — not off local filter state, which updates
before the data does and would report a bogus drop on every filter change.

## 5. Government portal chrome (GIGW 3.0)

The site frame is not decoration; most of it is required.

- Accessibility is a statutory duty under section 40 of the **Rights of Persons
  with Disabilities Act, 2016**, with WCAG 2.1 AA set as the bar by GIGW 3.0.
  Keep the skip link, the `data-text-size` steps, the `data-contrast` theme,
  visible keyboard focus, landmark regions and labelled controls.
- Policy disclosures (privacy/DPDPA, terms, copyright, hyperlinking,
  accessibility, RTI, disclaimer) must be reachable from every page. They live in
  `GovPolicyModal`, opened via `openPolicy(id)` from `GovContext`.
- The frame is bilingual. Interface strings go in `src/gov/i18n.js` and are read
  through `t()`; record content (names, courses, employers) stays untranslated.
- Page titles and descriptions live in `src/routes.js` as `title`/`desc` with
  `titleHi`/`descHi`; `GovBreadcrumbs` reads them.

### Insignia — do not use

**Never display the State Emblem of India.** Its use is restricted by the
**State Emblem of India (Prohibition of Improper Use) Act, 2005**, and this
project holds no authorisation. The **Ashoka Chakra** is likewise listed in the
Schedule to the **Emblems and Names (Prevention of Improper Use) Act, 1950**.
`public/emblem.svg` and `public/ashoka-chakra.svg` are deliberately neutral
placeholder marks. Keep the prototype disclaimer in the footer: this is a
hackathon build, not an official Government of India website, and it must not
present itself as one.

## 6. Visual design

Follow the `frontend-design` skill, with one standing override: **this brief
pins the direction**, so where the two conflict, the brief wins. Specifically —
the navy `#14202e` / terracotta `#b4623a` palette, the square-cornered
governmental treatment and the small uppercase statistical labels are deliberate
choices for an Indian government portal, not generic defaults to be designed
away. Everything the brief leaves open should still avoid templated defaults.

## Working in this repo

This project has had two agents edit it concurrently. **Before overwriting any
file wholesale, check whether it changed since you last wrote it** — prefer
targeted edits over full-file writes, and commit early so nothing is
unrecoverable.

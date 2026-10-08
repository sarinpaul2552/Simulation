# Batch 7 — Student Experience Redesign: design rules

The V2 economic engine (`src/simulation/*`, `src/production/v2/adapter.ts`) is **frozen**. Everything in this batch
is presentation, explanation and facilitation built on top of the recorded game. Nothing here feeds back into the engine.

## Navigation: four stages over the unchanged server phases

| Student stage | Server phases | Exit requirement |
|---|---|---|
| 1 · The Challenge | `briefing` | all five private briefings opened (shared device) |
| 2 · Leadership Decision | `decide → belief → risk` | valid decision + belief + confidence + two risks |
| 3 · Commit | `vote → commit` | five private votes (unless voting disabled), then commit |
| 4 · Results & Learning | `results → reflect → final` | at least one learning choice |

`useV2Team.advance()` walks the same validated `v2_set_phase` transitions one step at a time; no phase is skipped
on the server and the RPC still rejects illegal moves.

## Content rules

- **Scenario cards** (`content/scenarioContent.ts`): headline, what happened, three "why it matters", one challenge
  question. Written from the briefing only — never from `truthReference`, `designNotes` or demand indices.
- **Evidence labels**: *Market News* (headline/rumour), *Industry Estimate* (estimate/range), *Company Data*
  (measured from our own company). Every signal has a plain-language rewrite used in Undergraduate mode.
- **Role briefings** (`content/roleContent.ts`): responsibility · what you know (private) · why it matters ·
  recommendation · ask your team. The recommendation rules read only the company data that role is shown;
  a "suggested by your data" tag is optional and always says "You decide".
- **Discussion**: belief (one, per-quarter list) + confidence Low/Medium/High + exactly two risks + optional note.
  Stored in the existing draft `deliberation` (ids and labels). Never part of the engine input.
- **Reflection**: "You expected" (team's belief) vs "What happened" (recorded before/after metrics on that belief's
  topics) + learning choices + optional text. No right/wrong verdict. Stored as versioned JSON in the existing
  reflection column; legacy free text still displays.

## Dashboard rules (`insights/dashboard.ts`, `insights/explain.ts`)

- Financial cards: revenue, operating profit, margin, cash, debt, liquidity — value, previous quarter, Δ and %.
  Colour follows meaning (debt up = caution; cash down = bad), always with an arrow icon and text.
- Business health = five **dashboard interpretations** (not scores):
  - Financial: 40% cash ÷ $40M + 40% margin ÷ 20% + 20% (1 − debt ÷ $100M), each capped 0–1
  - Customer: average of retention 75→95%, CAC index 140→60, pipeline 0→$160M, university renewal 80→95%
  - Product: average of Product Quality and AI commercial readiness
  - Organization: average of culture, talent, capacity and load headroom (1.5 − load ÷ capacity)
  - Strategy: before Q4 best destination readiness; after Q4 destination strength
  - Strong ≥ 67, Fair ≥ 40, Weak < 40.
- Charts plot recorded quarters only (Start = Q0). Minimum visible span prevents tiny moves looking dramatic.
- "Why it happened" separates **market** impact (engine market contribution per indicator), **decision** impact
  (event costs, recession actions, financing, contract bookings, transition load, crisis) and **delayed investment**
  impact (maturing cohorts, absorption loss).
- Benchmarks: starting company, previous quarter and documented engine thresholds only. No invented industry data.
- Peer comparison exists only on the facilitator's "Compare teams" tab.

## Final report and debrief (`insights/report.ts`, `insights/debrief.ts`)

- Scores come only from `scoreV2Company` (frozen). Dimension cards explain what each dimension measures.
- Strengths/struggles are rule-based detectors, each with its evidence line; empty when the data does not support one.
- Up to three pivotal decisions (Q4 destination, Q5 contract, Q6 recession, Q7 crisis). Counterfactuals replay the
  same engine with one decision changed; if any later decision becomes invalid the counterfactual is omitted.
- Trade-off reflections are questions, never a "winning formula".
- Facilitator debrief uses decisions, deliberation and **revealed votes of resolved quarters only**
  (`v2_facilitator_debrief`, PIN-protected). Private briefings are never included. The admin PIN is hidden in projector view.

## Presentation modes

`sessions.presentation_mode` ∈ {`undergraduate`, `mba`} (default `mba`), chosen at session creation and changeable
by the facilitator (PIN). Mode changes wording, density and which panels are shown — never decisions, economics or
scores. Missing column/RPC ⇒ client falls back to MBA (backward compatible with databases without the migration).

| | Undergraduate | MBA |
|---|---|---|
| Language | plain, short | technical (CAC, runway, readiness) |
| Role KPIs | core subset | all role KPIs |
| Results | 4 KPI tiles, revenue + cash charts | 6 tiles, + operating profit and segment charts, formulas, benchmarks, sources |
| Financing panel | collapsed until needed | open |
| Notes | optional, collapsed | optional, open |

## Migration

`database/MIGRATION_V2_BATCH7_EXPERIENCE.sql` — additive and idempotent: one column with a check constraint,
two replaced read functions (adds `presentation_mode`), two new PIN-protected RPCs. Not yet applied to production.

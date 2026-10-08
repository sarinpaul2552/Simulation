# Batch 7.5 — Experience refinement: design and rules

The frozen V2 engine is unchanged. Everything here is presentation, explanation, facilitation and one additive
database migration for Team Commitment.

## 1. Team Commitment (default) and optional private voting

| Mode | Who commits | Server rule | Stored |
|---|---|---|---|
| `team_commitment` (default for new sessions) | One authorized participant. On a shared team device: whoever holds it. On individual devices: the team leader (CEO). | `risk → commit` only through `v2_confirm_commitment(team_code, quarter, agreement, role)`; `v2_resolve_quarter` requires the commitment row. | `v2_commitments(team, quarter, agreement, committed_by)`. No votes are created. |
| `private_vote` (facilitator option) | Five private votes, revealed together (unchanged Batch 5–7 mechanism). | `risk → vote → commit`; resolve requires five votes. | `v2_votes` |
| `none` (legacy `voting_disabled` sessions) | Anyone with the team device. | `risk → commit` directly. | — |

- Agreement statements: **A** we agree · **B** we discussed different opinions and reached a decision · **C** the team leader made the final decision.
- A confirmation dialog precedes every team commit. Confirmation and resolution are both idempotent: double clicks and second devices resolve the quarter exactly once.
- Revising the decision from `commit` deletes that quarter's commitment and any votes.
- Switching mode mid-quarter: confirming a team commitment from `vote` discards partial votes **unrevealed**.
- Existing sessions keep their behaviour. The migration backfills `private_vote`, or `none` for `voting_disabled`; this is verified on a live pre-migration database with a quarter in progress.
- The debrief separates "Private votes: n support, n concern, n oppose" from "Team commitment — <statement>". Disagreements come from revealed votes only and are never inferred from agreements.
- Backward compatible: without the migration, the client treats sessions as before (private votes, or none for `voting_disabled`) and the setup screen warns that Team Commitment needs the database update.

## 2. Visual identity — "Boardroom"

Modern strategy game × executive boardroom: warm paper, dark boardroom panels, Fraunces display serif for
narrative, Inter tabular figures for numbers, one chapter colour per quarter.

- **Chapters (quarter-opening screens):** Q1 Take the helm · Q2 The disruption · Q3 Mixed signals · Q4 The commitment · Q5 The offer · Q6 The downturn · Q7 The crisis · Q8 The final move. Each has a large outlined quarter numeral and its own chapter colour. The narrative uses only the briefing every team sees; no hidden information.
- Sections are unboxed (eyebrow + serif title + hairline). Panels are used only for things you act on.
- Status colours always carry an icon and a word. Data colours are validated with the dataviz validator: Consumer #d4572a, Enterprise #00968c, AI #7a5ad6, People #b07d10, University #3f6fc4; cash is hatched.
- Motion is restrained: a short rise on entry, disabled under `prefers-reduced-motion`.

## 3. Investment workspace

- The $30M budget is shown as a large figure, with "kept as cash" beside it and a stacked bar coloured by bucket (cash hatched).
- Each bucket shows: what it builds (from the engine's gain targets), a "pays off sooner/later" pill and its maturation split (from the engine's maturation schedule), and in MBA mode "up to ~N capability points before workload losses" (calibration curve). It has a slider plus a precise numeric input.
- **Execution capacity estimate:** the engine's bucket load curves plus coordination load, against culture-adjusted capacity. It is labelled an estimate because strategy commitments, contracts and events add load. Warnings appear at "stretched" (> 80%) and "overloaded" (> 100%), with the expected absorption.
- It never states returns as guaranteed.

## 4. Results in three levels

1. **Executive summary:**
   - A dynamic headline generated from recorded revenue, operating profit, cash, investment and solvency. A unit test checks that it never contradicts the numbers.
   - Three large figures with change from last quarter.
   - "Your biggest decision consequence": decision → immediate → longer-term → still uncertain.
   - "What happens next?": a leading indicator, not a forecast.
   - The cash bridge.
2. **Explore the business:** tabs for financial trends, revenue by business, customers, product, people & capacity, and strategic readiness. Each tab shows recorded values and the previous quarter.
3. **Deep analysis:** a collapsible section with:
   - six financial diagnostics;
   - market impact vs management decision impact vs delayed investment impact;
   - every decision consequence;
   - benchmarks and formulas (MBA).

   It is open by default for MBA on wide screens and collapsed for Undergraduate.

**Cash bridge.** Opening cash + operating profit − strategic investment − event costs + financing = closing cash, all
from the engine ledger. It reconciles exactly in every quarter of all 15 Test Lab strategies (unit-tested). MBA mode
itemises event costs and financing.

## 5. Decision-consequence rules (`insights/consequences.ts`)

| Decision | How it is explained |
|---|---|
| Held the whole envelope | "You retained the full $X"; cash preserved (recorded closing cash); no new capability will mature from this quarter; uncertainty framed as a trade-off. |
| Concentrated (≥ 60% in one bucket) | Recorded capability move; points still to mature from this quarter's cohorts; diminishing returns from the calibration curve. |
| Two priorities (≥ 80% in two buckets) | Both capability moves; still-maturing points. |
| Diversified | Coordination load from the number of initiatives; still-maturing points. |
| Capacity | Recorded load/capacity and absorption; loss described as lost, not delayed. |
| Debt / equity / repay / partner / restructure | Cash effect; debt balance, rate and quarterly interest; ownership before → after. |
| Q4 destination, Q5 contract, Q6 recession, Q7 crisis, Q8 option | Lead their quarter; values come from the recorded consequence (readiness, transition load, upfront cost, run-rate, savings, one-off cost, trust change). |

No counterfactual revenue or profit appears in quarter results. The final report's existing counterfactual replays
still use the same engine and are dropped whenever a later decision would become invalid.

## 6. Final report additions

- "What kind of company did your team build?": an executive conclusion from the final state and decision history.
- Four interpretations: what you did well · where you struggled · strategic vulnerabilities (exposures visible in the final company, or the least-developed capability) · opportunities you did not pursue (declined contract, a better-fitting Q4 destination by readiness, under-funded buckets, other earned Q8 options). None of these is assigned an invented value.
- Discussion questions for every team, including high performers.

## 7. Mobile

- Collapsible financing, beliefs, risks, decision summary and deep analysis. Beliefs and risks collapse automatically once chosen and show the choice in the summary line.
- No sticky overlays: primary actions sit at the end of each stage and go full width on phones.
- Tested at 375, 820, 1366 and 1920 px with no horizontal scrolling.

## 8. Migration

`database/MIGRATION_V2_BATCH7_5_COMMITMENT.sql`. Prerequisites: `MIGRATION_V2_PRODUCTION.sql`, then
`MIGRATION_V2_BATCH7_EXPERIENCE.sql`. It is additive and idempotent:

- adds `sessions.commitment_mode` (with backfill) and the `v2_commitments` table (block-all RLS);
- adds the `v2_confirm_commitment` and `v2_facilitator_set_commitment_mode` RPCs;
- replaces `v2_create_session`, `v2_set_phase`, `v2_resolve_quarter`, `v2__game_json`, `v2_facilitator_overview` and `v2_facilitator_debrief`, keeping their signatures.

Not applied to production.

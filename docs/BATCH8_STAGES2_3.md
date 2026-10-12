# Batch 8 · Stages 2 & 3 — Executive intelligence, visual identity and shareholder value

| | |
|---|---|
| Branch | `feature/batch8-executive-leadership` (on top of Stage 1, `2e921da`) |
| Engine | The frozen V2 engine and adapter are unchanged (`git diff 003f697 -- src/simulation src/production/v2/adapter.ts` is empty) |
| Production | Not merged, not deployed; no production database change |

## What changed

**Visual identity: "Board Paper"** (`docs/BATCH8_DESIGN_SYSTEM.md`)
- Uses the NexLearn palette, with AA text variants.
- Source Serif 4 for headings, Inter for UI and tables, tabular numerals throughout.
- Removed: all motion, the gradients, the dark banners, the giant numerals and the per-quarter colours.
- Sections are ruled rather than boxed. The commit button is copper.
- Print styles cover the board report and the board defense.

**Stage 1 refinements**
- **Spoilers.** The introduction and home page no longer list the eight chapter titles. The introduction announces only the board's Q4 2023 deadline. Q1–Q3 text no longer mentions the crisis or the final options, and a test guards this.
- **Briefings.** Each is a 60–90 second read:
  - Your mandate (standing objectives fold away after Q1);
  - Your current position (three priority KPIs, with the full table expandable);
  - Confidential intelligence (private signals plus two ways to read them);
  - What concerns you;
  - Questions for your colleagues.
- **Investment perspectives.** Each bucket shows how the CEO, CFO, Product, Growth and People functions look at it. These are lenses with no endorsements.
- **Progressive financing:**
  - the cash forecast and liquidity warnings are always visible;
  - borrowing, equity, partner and restructuring sit behind "Financing options";
  - plans are validated against the engine's limits, with interest (an upper bound) and dilution shown using the engine's formula;
  - an invalid plan cannot be committed.
- **Team size.** For teams of 3–6, one person can hold several roles and read each brief in turn. Awards credit roles, not people.

**Executive intelligence (results)**
- **The quarter in sequence:** starting position → decision → market movement → business impact → ending position.
- **"What moved, and why":** each indicator's movement split into the components the engine recorded (decision or event / market / delayed investment / natural drift). The components reconcile exactly, and expandable detail is available.
- **Bridges:** the cash bridge and the valuation bridge.
- **Executive intelligence dashboard**, with these sections:
  - Executive overview: KPI strip, three trend charts and business health with Δ previous and Δ Q4 2022 plus contributing KPIs;
  - Financial, Commercial, Product and capability, Organization: a metric selector, a quarter selector, a chart with the starting-level line, and a comparison table;
  - Share price: chart, factor table and bridge for any quarter;
  - Executive scorecards: five roles.
- **Reflection:** all four businesses (start, now, this quarter, invested this quarter and to date, capability movement), with factual notes on businesses that received no investment.

**Shareholder value** (`docs/BATCH8_VALUATION_METHODOLOGY.md`, `docs/BATCH8_CALIBRATION_REPORT.md`)
- The NXLN price starts at $100 in Q4 2022 and is shown in the top bar, the results figures, the dashboard, the CEO and company components, the board report and the facilitator comparison.

**Executive scorecards and awards** (`docs/BATCH8_EXECUTIVE_SCORING.md`)
- Five scorecards: 60% functional, 40% company.
- Facilitator "Leadership and awards" tab: a same-quarter comparison, plus awards with eligibility rules.

**Board report (Q8)**
- A printable board paper in nine sections:
  1. executive summary, with the three separate measures;
  2. shareholder value;
  3. financial performance;
  4. commercial performance;
  5. product and innovation;
  6. people and organization;
  7. strategic decisions (an expandable decision history);
  8. executive scorecards;
  9. leadership lessons.
- Sections 3–6 together form the complete KPI dashboard: start, end, absolute change, % change and interpretation for every KPI.
- It ends with the printable board defense: the board's question and a three-minute framework.

## Migration requirements

None. Stages 2 and 3 are computed client-side from the existing replay data:
- the team snapshot for students;
- `v2_facilitator_audit` inputs for the facilitator.

Both work on databases without the Batch 7 or 7.5 migrations; compatibility E2E passes on both older schemas. The earlier Batch 7 and 7.5 migrations remain unapplied to production, as before.

## Tests

| Suite | Result |
|---|---|
| Unit (`npx vitest run`) | 647 passed (16 skipped, environment-gated). New: `batch8.intelligence.test.ts` (26), `batch8.stage2.test.ts` (29) |
| Calibration analysis | 4 passed |
| Database integration (`npm run test:db`) | 14 passed |
| Migration on existing data (7.5) | 1 passed |
| Browser E2E, current schema | All passed: gameplay, integrity, experience, Stage 1, new `stage23.e2e.ts` (8-quarter journey and cross-team awards), new `a11y.e2e.ts` (axe WCAG 2.1 AA: no serious or critical violations) |
| Browser E2E, pre-Batch-7 schema (`V2_COMPAT=1`) | compat + Stages 2–3 passed |
| Browser E2E, pre-Batch-7.5 schema (`V2_COMPAT_LEVEL=7`) | Stages 2–3 passed |
| Type check, production build | Pass |

## Known limitations

- **Scorecards rate functions, not people.** The platform does not record which student held which role, so awards name the team's role. Facilitators assign individual credit in class, and names are not stored.
- **The share price is a teaching model**, not a DCF. Biases are documented in the calibration report: flat early quarters, and margin flattering retrenchment.
- **Market effects in attribution are the engine's own diagnostics:**
  - commercial indicators split into market, capability, drift and decision;
  - capabilities split into this quarter's versus earlier investment;
  - revenue is not split into market versus decision, because the engine does not record such a split, and no counterfactual is estimated.
- **The dashboard shows only recorded quarters.** Later quarters are visible in the selector but disabled.
- **Design research is summarised from the systems' published guidance.** In-session page fetches required an approval that was not available while working unattended.

## Preview

1. Fetch and run the branch:
   ```
   git fetch <bundle> feature/batch8-executive-leadership:feature/batch8-executive-leadership
   git checkout feature/batch8-executive-leadership
   npm install
   npm run dev
   ```
2. Create a self-paced session and join a team. The NexLearn introduction appears first.
3. Results screens show the sequence, attribution, bridges and the Executive intelligence tabs.
4. After Q8, the board report and the board defense appear (use Print to save a PDF).
5. Facilitator → "Leadership and awards" for the cross-team comparison. It needs 3 or more teams with at least 4 quarters each.

A local database is available via `bash scripts/v2-local/up.sh`.

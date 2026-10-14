# Batch 10 — V3 validation plan

**Status:** this is a plan. Nothing here has been run against a V3 engine, because none exists yet.

**Purpose.** The plan defines how V3 proposals will be validated before any production change. **Share-price convergence is not a success criterion.** The criterion is that different strategies produce *defensible* outcomes under the conditions that justify them, and that leadership decisions (evidence use, adaptation, organizational care) have visible consequences.

**Evidence labels:**
- **[V2-verified]** measured on the frozen engine (Batch 9 / Batch 10 diagnostics);
- **[V3-target]** the acceptance threshold for V3;
- **[Open]** to be decided from the first experiments.

## A. Laboratory approach

### A1. Infrastructure

| Item | Description |
|---|---|
| Base | The Batch 9 headless laboratory (`scripts/lab/batch9/`). It reproduces the production replay exactly for price, executive scores, terminal score and cash [V2-verified, `lab.test.ts`]. |
| V3 engine fork | `src/simulation/v3/` (built in stage 10B), a copy of the V2 modules with the V3 mechanisms. It is **not imported by the app** until stage 10F. A lint/test guard asserts that no production module imports `simulation/v3`. |
| Runner extension | `runArc` is generalized in a lab copy (`scripts/lab/v3/runArcV3.ts`) to accept: (a) an engine module (V2 or V3); (b) a scenario arc (paths A/B/C); (c) a per-quarter envelope function (financing, E7); (d) an envelope claim (contract, E5); (e) a mandatory recession stance (E6). The V2 runner stays unchanged. |
| Paired comparison | Every V3 experiment is run against V2 with identical strategies, policies and paths, wherever V2 supports them. |
| Determinism | Every run is deterministic. Each result file records the commit, engine version and calibration hash. |

### A2. Strategy cohorts (reused from Batch 9)

1. **Ten required strategies:** Consumer-led, Enterprise-led, AI-led, Diversified, Consumer-only, Enterprise-only, AI-only, University-led, Cash preservation, Adaptive.
2. **Four supplementary strategies:** University-only, Consumer + AI, Enterprise + AI, Enterprise + AI + People.
3. **Full $5M allocation grid:** 462 allocations × 5 destinations.
4. **New adaptive variants:**
   - an evidence-responsive strategy *per path*, which reads that path's Q2–Q3 signals;
   - a "wrong-way" strategy that follows the noisy Q3 signals;
   - a "late adapter" that changes course only after Q5.
5. **Policy variants:**
   - contract accept / decline / accept with envelope claim;
   - recession Protect / Slow / Freeze→reserve / Targeted / Deep;
   - financing refuse / debt-first / equity-first, at X = $0, $5M, $10M and $15M.

### A3. Market scenarios

1. Three authored paths: A (AI-first, the current arc), B (Enterprise-led AI) and C (Slow adoption).
2. Batch 9's ten sensitivity variations, applied to path A for regression comparison.
3. Within-path stress tests: severe recession, crisis severity +0.2, a delayed contract go-live.

## B. Hypotheses and acceptance criteria

| # | Hypothesis | Measure | Acceptance [V3-target] | V2 baseline [V2-verified] |
|---|---|---|---|---|
| H1 | **AI importance becomes market-dependent** (E1, E10) | AI marginal return by path; AI-only and AI-led rank by path | AI-led is top-3 in path A. AI-only is *not* top-quartile of the grid in path C. AI is still in at least half of the path A top-decile allocations. | AI is the top marginal return in all 10 scenarios; AI-only sits at the 49th percentile and AI-led at the 81st |
| H2 | **Enterprise is commercially viable where conditions support it** (E2, E5, E7) | Enterprise revenue growth by Q8; Enterprise-led rank in path B | In path B, Enterprise-led or Enterprise + AI is top-3. Enterprise revenue grows at least +40% by Q8 for Enterprise-led. Enterprise-only is not last in path B. | Enterprise-led 9th and Enterprise-only last everywhere; Enterprise revenue $40M → $46–52M |
| H3 | **University produces measurable revenue within the game** (E3) | Q8 University revenue for University-led | At least +25% by Q8 (≥ $20M) in at least one path, and growth visible by Q6. **No** quarter-over-quarter jump of more than +$4M (no "instant revenue"). | $16M → $15M |
| H4 | **Organizational health has consequences; layoffs are a real choice** (E4, E9) | Deep cut vs Protect: Q8 and Q12 price, revenue, cumulative operating profit, culture | For a healthy company, the deep-cut Q8 price advantage is ≤ +$3, its Q12 price is below Protect's, and its terminal score is lower. For a cash-strained company (cash < $30M at Q6), a targeted or deep cut can still be best on survival measures. | Deep cut raises the Q8 price for all 4 strategies tested: by +$9–16 for three of them, and +$0.2 for AI-led. It still leads at Q12 for all four (+$0.8 to +$16). |
| H5 | **People investment is worth funding when load is high** | Paired comparison of People vs reserve under heavy plans and the contract | Under load ratio ≥ 0.8, funding People improves Q8 terminal score **and** at least one of price, revenue or crisis severity. Under light plans, People's return can be lower (overcapacity is a real cost). | People helps AI-led and Consumer-led; hurts Enterprise-led in V2 |
| H6 | **The contract has a real opportunity cost** (E5) | Accept vs decline by strategy; accept (claim) vs accept (V2) | Accepting is positive for Enterprise-aligned teams with fit ≥ 0.45 and negative or neutral for off-strategy teams. Total Q5 outflow equals the envelope (no double counting). | Emulation: −$0.1 to −$1.9 price vs V2 accept |
| H7 | **Financing is used selectively** (E7) | Share of strategies drawing on financing; insolvency; dilution | With the default policy, at most 30% of strategies use expansion. No default-policy strategy becomes insolvent. A reckless policy (max expansion every quarter) shows a visible cost: lower price or a distress quarter. Choose the smallest X that meets H2. | Expansion unavailable |
| H8 | **Recession stance is a genuine choice** (E6) | Outcome profiles by stance | Each stance is best on at least one of: price, terminal score, organizational score, cash. No stance dominates on all four for every strategy. Every stance is feasible for every strategy. | Hiring freeze infeasible for 5 of 10 strategies; deep cut leads on price and CFO score |
| H9 | **No universal winning formula** (all) | Top allocation by path; rank correlation across paths | The best constant allocation differs in at least 2 of 3 paths. Spearman rank correlation of the ten strategies between paths A and C is ≤ 0.7. | One path; Consumer + AI best |
| H10 | **Adaptation pays** | Adaptive vs its best fixed counterpart | The per-path adaptive strategy beats the median fixed strategy in all 3 paths and is top-3 in at least 2. The wrong-way strategy is below median. | Adaptive wins 8 of 10 scenarios (one path) |
| H11 | **Insolvency is reachable only through risky choices** | Insolvency incidence across cohorts | No required strategy under the default policy becomes insolvent in any path. At least one reckless policy can. | 0 insolvent in the B9 grid |
| H12 | **Saturation warnings fire before waste** (E8) | Quarter of first warning vs first wasted capability | The warning appears at least one quarter before the first waste for at least 90% of single-bucket plans. | Waste from Q5–Q7; no warning |
| H13 | **Teachability** | Every V3 mechanism has a one-sentence explanation on the results screen | Every results "consequence" line references a real engine channel (no false claims). Automated by mapping text claims to recorded state changes. | One false claim found ("Culture paid for it") |

**Calibration rule.**
- Free constants such as `m` and `s` (E1), the conversion levers (E2, E3), `k` (E4), the weight (E9) and `X` (E7) are tuned **only** against H1–H8.
- Each constant is chosen on **path A and the grid**, and then **verified on paths B and C without re-tuning**. This guards against overfitting to the authored arc.

## C. Regression requirements

1. **The V2 engine is frozen.** `git diff 003f697 -- src/simulation src/production/v2/adapter.ts` must be empty (existing test).
2. **All existing tests pass:** unit, database integration and E2E, plus the compatibility runs.
3. **V2 sessions replay bit-identically.** The existing snapshots are verified with `verifySnapshot`. A V3 session cannot load a V2 snapshot, and the reverse is also refused, with a clear error.
4. **Batch 9 lab parity test still passes.** V2 lab results equal the production path.
5. **V3 has its own parity tests:** lab against the V3 adapter replay; cash ledger reconciles every quarter; valuation bridge reconciles; fixed point at Q0 (a hold strategy with a neutral market stays at steady state).
6. **No production module imports `simulation/v3` before 10F** (guard test).
7. **No new production dependencies** (package.json diff review).

## D. Comparison against Batch 9

Each V3 experiment produces a Batch-9-shaped results file (`docs/batch10/v3-results.json`) and a workbook built by a sibling of the Batch 9 builder. The Batch 9 workbook is not overwritten.

The comparison sheet shows V2 against V3 for:
- the executive comparison;
- the sensitivity rank matrix;
- the grid main effects;
- the marginal returns;
- the contract, financing and recession audits.

A summary sheet lists H1–H13 with pass or fail and the measured value. A "fail" is reported, never hidden.

## E. Human validation (outside the lab)

Lab results cannot validate learning. Before 10F:

1. **Stopwatch pilot (2 cohorts, about 20 students each).**
   - Measure per-stage time against the timing model in the educational review (section 6).
   - Count clicks.
   - **Target:** total ≤ 95 minutes with individual devices, and discussion time ≥ 50% of quarter time (observer log).
2. **Facilitator usability.** Two facilitators run a session with the rationale timeline, the rubric and the signal reveal. Record which views they used in the debrief.
3. **Learning check.** Run a short pre/post question set, five items mapped to the five learning outcomes. Compare V2 and V3 cohorts. This is indicative only, given the small sample.
4. **Student comprehension.** After Q6 and Q8, ask "Why did our price or organizational health change?" Compare answers with the engine's recorded causes. **Target:** ≥ 70% identify a correct primary cause.

## F. Deliverables of the validation stages

- `docs/batch10/v3-results.json`
- `docs/batch10/NEXLEARN_V3_VALIDATION_STUDY.xlsx` (new file)
- `docs/BATCH10_V3_VALIDATION_REPORT.md`: H1–H13 results, with the calibration chosen and its rationale

## G. Already measured for this design (V2, frozen engine)

These diagnostics are in `docs/batch10/diagnostics.json` (generated by `scripts/lab/batch10/diagnostics.test.ts`). They establish the V2 baselines in section B.

| Diagnostic | Question |
|---|---|
| D1 | Marginal return of every bucket in all ten market variations; AI-native revenue path |
| D2 | Deep-layoff share-price decomposition by valuation factor, Q6–Q8 and Q12 |
| D3 | People versus reserve, paired |
| D4 | Contract as an envelope claim (emulated) |
| D5 | Capability saturation and absorption waste |
| D6 | Recession stances, including "freeze + People to reserve" (emulated) |
| D7 | University: market size versus conversion |

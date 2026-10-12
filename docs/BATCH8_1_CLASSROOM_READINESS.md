# Batch 8.1 — Classroom readiness

| | |
|---|---|
| Branch | `feature/batch8-1-classroom-readiness`, built from `feature/batch8-executive-leadership` (0945ac9) |
| Frozen V2 engine and adapter | Unchanged (`git diff 003f697 -- src/simulation src/production/v2/adapter.ts` is empty) |
| Production | No merge, no deployment, no production migration |

## 1. What was audited

1. **All five executive scorecards.**
   - Every formula, weight, normalisation, baseline, threshold and direction.
   - Metric overlap, measured as correlation across 28 strategies × 7 quarters.
   - Exploit risks, including CFO cash conservatism.

   See `BATCH8_1_SCORING_AUDIT.md`.
2. **The 60/40 weighting.** Sensitivity at 100/0, 70/30, 65/35, 60/40 and 50/50.
3. **Cross-team awards.** 300 simulated five-team classrooms at Q4, Q6 and Q8, plus tie, insolvency and equal-quarter rules.
4. **The share-price model.**
   - Determinism, look-ahead, reconciliation of every bridge, idle cash, liquidity, insolvency, dilution, and the AI bias.
   - Feedback speed by quarter, and its relationship to the terminal score.
5. **Strategy calibration.** 28 strategies cover every scenario in the brief. See `BATCH8_1_STRATEGY_CALIBRATION.md`.
6. **Results experience, investment workspace, Q8 report and the facilitator workflow,** in the browser.

## 2. Defects found

| # | Defect | Severity |
|---|---|---|
| D1 | Awards concentrated on one team: ≥ 5 of 6 awards in 68% of simulated classrooms. Cause: the company component, identical for every role, was counted in each role award. | High |
| D2 | Duplicate measures across roles:<br>• CEO operating profit ≈ CFO margin (r = 0.98)<br>• CFO revenue efficiency ≈ CGO revenue (r = 0.96)<br>• CEO load ≈ People load (r = 0.89) | High |
| D3 | Duplicate measures within roles:<br>• Product AI capability ≡ AI readiness (r = 1.00)<br>• People capacity ≡ talent (r = 1.00) | Medium |
| D4 | The CEO score largely mirrored the share price (Spearman 0.92). | Medium |
| D5 | Product scored capability, not whether customers paid for it. | Medium |
| D6 | An insolvent company's CEO scored above a solvent company's CEO. | High |
| D7 | The results page was too long by default: the sequence, attribution and both bridges appeared before the dashboard. | Medium (usability) |
| D8 | Deep analysis repeated sentence-form explanations ("Market conditions raised…"). | Low |
| D9 | The board report opened with scores rather than a verdict; board-defense prompts were generic. | Medium |
| D10 | A duplicate test id (`v2-consequence`), found while building the Level 1 view. | Low |

**Not defects (verified):**
- CFO cash hoarding is not disproportionately rewarded: Cash100 CFO is 48, rank 21 of 28.
- People does not reward avoided change (Cash100 People 50).
- Growth does not reward revenue alone (revenue is 30%).
- Every share-price bridge reconciles.
- There is no look-ahead in the valuation.
- Every cash bridge reconciles, for all 28 strategies.

## 3. Corrections made

| Fix | For | Where |
|---|---|---|
| Role awards rank functional scores; the team award keeps the 60/40 executive average | D1 | `insights/executive.ts` (`computeAwards`) |
| NXLN-EXEC-1.1 metrics:<br>• CEO: strategy readiness (engine function), net strategy delivery, pricing power, focus retained<br>• CFO: return on capital deployed (profit-based)<br>• CPO: AI product revenue<br>• People: capacity removed and reweighted | D2–D5 | `insights/executive.ts` |
| Survival gates: CEO and CFO functional scores capped at 30 if the company was ever insolvent, and at 45 while it is distressed; shown on the scorecard | D6 | `insights/executive.ts`, `ds/intel.tsx` |
| Results in three levels:<br>• Level 1: headline, four KPIs, three material developments, the board's question<br>• Level 2: Executive Intelligence tabs<br>• Level 3: Deep analysis on demand (sequence, attribution, cash and share-price bridges, diagnostics, benchmarks, formulas) | D7 | `stages/ResultsStage.tsx`, `insights/briefing.ts` |
| Compact analytical notation, with a separate Effect column (favourable or unfavourable) beside every arrow; index points, points and $ distinguished | D8, 4.2 | `ds/intel.tsx`, `insights/attribution.ts` |
| Board verdict:<br>• five dimensions assessed by documented rules, with Q4 2022 → Q4 2024 evidence and the last-two-quarter trend<br>• "four lenses" table kept separate<br>• six evidence-based board-defense prompts | D9 | `insights/boardVerdict.ts`, `stages/FinalStage.tsx` |
| Investment workspace:<br>• "Competing executive considerations" with engine-verified timing<br>• per-bucket live estimates: builds, lands by calendar quarter, workload points, capability (labelled as estimates, not guaranteed)<br>• cash-at-quarter-end estimate | 5.1, 5.2 | `stages/DecisionStage.tsx`, `content/bucketPerspectives.ts` |
| Test id corrected | D10 | `ResultsStage.tsx` |

## 4. Deliberately left unchanged

- **The 60/40 executive weighting.** The evidence supports it once awards use functional scores; see the scoring audit, section 5.
- **CFO liquidity, debt, ownership and warning metrics.** Prudence is not penalised; inactivity is charged through capital efficiency.
- **The valuation model (NXLN-VAL-1.0) and its weights.**
- **The frozen economics.**
  - AI's advantage as a complement, and the University destination's weakness, are reported for a product decision rather than changed.
  - Slow Q1–Q2 price movement reflects slow early results. No artificial volatility was added.
- **The design system, the workflow** (Understand → Discuss & Decide → Commit → Results & Learn; one team commitment), and RLS/RPC security.

## 5. Remaining risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| The production database lacks the Batch 7 / 7.5 migrations. Pilot sessions would fall back to MBA mode with all-five private voting. | Certain unless applied | **Product-owner decision:** apply the reviewed migrations to the pilot database (an isolated pilot project is preferable) before the pilot. |
| Vercel previews may write to production Supabase. | Possible | Point the pilot deployment at an isolated pilot database. |
| One device per player: nobody joins as CEO, so the team cannot commit. | Moderate | Pilot guide: use one shared device per team, or require a CEO device. The UI explains that it is waiting for the CEO. |
| Roles in one-device-per-player mode are self-declared. | Low | The team code is the credential, and the server enforces team, phase and idempotency. Roles are coordination, not security; this is unchanged and documented. |
| Eight quarters take 90–110 minutes with real discussion. | High for a single 60-minute class | Pilot guide: two sessions, or a 90-minute compressed format. |
| Students may read the slow early share price as "nothing is happening". | Moderate | The board question and capability developments carry early feedback; the guide explains this. |
| Facilitators may treat executive scores as individual grades. | Moderate | Every scorecard and award says they describe functions, not individuals. Repeat this in the briefing. |

## 6. Test evidence

| Suite | Result |
|---|---|
| Unit (`npx vitest run`) | 679 passed, 0 failed (16 environment-gated skips). New: `batch81.scoring.test.ts` (19), `batch81.experience.test.ts` (10) |
| Audit and calibration analyses | `batch81-audit.test.ts` 3 passed; `valuation-calibration.test.ts` 4 passed |
| Database integration (`npm run test:db`) | 14 passed |
| Migration on existing data (7.5) | 1 passed |
| Browser E2E, current schema | **23 passed, 0 failed, 1 skipped** (the compat suite runs only against older schemas). Covers:<br>• new `classroom.e2e.ts`: facilitator-led three-team Q1→Q8, equal-quarter awards, debrief, projector, print; individual devices with 3, 4 and 6 players; network interruption during commit; stale client; mobile results<br>• `a11y.e2e.ts` (axe WCAG 2.1 AA): no serious or critical violations<br>• gameplay, integrity (double submit, invalid codes, tampered storage, concurrent devices), experience, Stage 1, Stages 2–3 |
| E2E, pre-Batch-7 schema (`V2_COMPAT=1`) | compat + Stages 2–3: 3 passed |
| E2E, pre-Batch-7.5 schema | Stages 2–3: 2 passed (compat suite gated) |
| Type check, production build | Pass |
| Engine diff | Empty |

## 7. Classroom-readiness assessment

**Ready with conditions.**

The economics are unchanged and reconcile. The scoring is now independent across functions, and awards differ by function. Results are concise by default with full detail one click away. The Q8 report opens with an evidence-based verdict, and the full facilitator workflow passes end to end in automated tests.

Conditions for the pilot:
1. Run it on a database with the Batch 7 and 7.5 migrations, isolated from production. This needs product-owner approval.
2. Use one shared device per team, or ensure every team has a CEO device.
3. Plan two sessions, or a 90-minute compressed format.
4. Brief facilitators that scorecards and awards describe functions, not individuals.

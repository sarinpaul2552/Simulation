# CURRENT STATUS — Autonomous Build Batch 2 (Q1–Q4 Strategic Arc)

**Last Updated:** 2026-09-26 · **Batch 1 approved:** c91802c. **V1 restore point:** tag `v1-engine-frozen`.
Locked: (A) no generic capability decay — Q4 destinations provide specialization; (B) scenarios change demand and
market size separately (demand = near-term activity; `segmentCapacity` = structural ceiling).

## Q1 — Capital Allocation Under Uncertainty (PASS)

- New `src/simulation/engineV2Scenario.ts`: scenario quarters with truth (demand, competitor progress, explicit
  structural capacity changes) separate from player signals (briefing with reliability + role/audience tags; measured
  KPIs from company state). `getScenarioMarket(q)`; beyond the authored arc: neutral demand, persisting structure.
- New `src/testlab/utils/v2ScenarioArc.ts`: 15 player policies (incl. evidence-responsive, wrong-way, low X) run through
  the arc in the integrated economy; Mode 5 section H.
- Q1 = neutral competitive market exactly. No Q1 winner (baseline strategies within ±0.3% of $200M).

---

## Batch 1 status (approved at c91802c)

**Last Updated:** 2026-09-26
**Approved/frozen:** 2A e84978b · 2B 330edac · 2C 8f5794b · 2D 5c4f1e5. **V1 restore point:** tag `v1-engine-frozen`.

## Phase 3A — Operating Cost Architecture (PASS)

- New `src/simulation/engineV2Costs.ts` (+ tests). `costSource: 'modelled'` (requires `revenueSource: 'segment'`).
- Operating Cost = Fixed/semi-fixed (115.45, sticky ratchet +10% of prior revenue above $200M, up 25%/down 10% per qtr,
  floor 115.45) + Variable (Consumer servicing 25.5% + acquisition spend $6.3M × demand; Enterprise 20% + onboarding
  0.5 × run-rate going live; University 20%; AI-native 15%) + Commitments (People 0.06/$ lag 1 × 8q; Enterprise 0.04/$ lag 1 × 6q;
  AI/Product 0.06/$ lag 1 × 6q) + Financing 0. Baseline = exactly $170M.
- Calibration change: People commitment 0.10 → 0.06 (0.10 gave $21M/qtr payroll by Q8 on People100 — not "modest").

## Phase 3B — Integrated Financial Model (PASS)

- Segment revenue → modelled operating cost → OP → strategic investment → cash (`V2_INTEGRATED_MODE`).
- `consequence.financials` (`summarizeV2Financials`): margin, operating cash generation (= OP; no working capital yet),
  net cash flow, closing cash, runway (self-funding / burning quarters / cash-negative) and operating-only runway.
  Pure restatement of the ledger; financing 0, events 0, no floor.
- Test Lab Mode 5 section F: Q1/Q4/Q8 integrated table + Q8 segment/capability/commercial state.

## Phase 3C — Economic Stress Audit (PASS)

- `src/testlab/utils/v2StressAudit.ts`: 32 stress cases (8/16/40 quarters) + automated detectors; Mode 5 section G;
  `engineV2StressAudit.test.ts`. Full audit: `ECONOMICS_V2_BATCH1_AUDIT.md`.
- Calibration: market headroom via `market.segmentCapacity` (Consumer 300 / Enterprise 120 / University 40 / AI-native 80
  $M/qtr; multiplier 1 at start); semi-fixed ratchet 0.10 → 0.20.
- Unresolved (design): long-horizon structural advantage of breadth once concentrated capabilities saturate at 100.

---

## Phase 2D status (approved, frozen at 5c4f1e5)

**Last Updated:** 2026-09-26
**Approved/frozen:** 2A e84978b · 2B 330edac · 2C 8f5794b. **V1 restore point:** tag `v1-engine-frozen` → ee4a8bc.

## Phase 2D — Segment Revenue (COMPLETE, STOPPED FOR REVIEW)

Market → Capability → Leading Indicators → Segment Economics → Revenue. Investment never enters a revenue formula.

- New: `src/simulation/engineV2Revenue.ts` (four revenue stocks with memory, Enterprise/University booking cohorts,
  all coefficients in `V2_REVENUE_CALIBRATION`), `src/simulation/engineV2Revenue.test.ts`.
- Modified: `engineV2.ts` (segmentRevenue, enterpriseBacklog, universityBacklog, revenueHistory; `revenueSource`
  'hold' (default, Phase 2A–2C behaviour) | 'segment' (ledger revenue = Σ segments); `operatingCostOverride`),
  `v2Diagnostics.ts` (7 revenue checks per quarter; segment-mode runner, static-neutral vs competitive), Mode 5 section E.
- Consumer: 30% of base exposed/qtr; churn = exposed × (1 − retention); acquisition = 6.3 × demand × 100/CAC;
  price/mix = retained × 0.002 × ΔPricing Power.
- Enterprise: bookings ACV = resolved pipeline (30% of opening) × win rate; run-rate = ACV/4 goes live 0/25/50/25% over
  Q..Q+3; 25% of base exposed/qtr; renewal 0.85 + CS/Trust/Execution/macro terms (0.70–0.97); expansion 10% × ramp(CS 30→80).
- University: 25% exposed; renewal = Phase 2C renewal rate; wins = 20% of pipeline × (1/3)(1 + 0.01(Trust−70));
  live at +2..+5 quarters (10/30/30/30%).
- AI-native: 50% exposed; retention 0.80 + 0.12 × ramp(readiness 10→70); new = AI demand × Q/E factor ×
  (0.04 × min(adoption,10) + 0.08 × max(0, adoption−10)).
- Static neutral market is an exact $200M fixed point. Operating cost remains the $170M placeholder: profit/cash diagnostic only.
- Calibration notes: Balanced ($223.8M Q8) exceeds every single-bucket strategy but not Consumer+AI ($238.2M), from
  concave capability curves + indicator complementarity (no diversification term). AI-native would keep compounding
  beyond Q8 (equilibrium ≫ $100M at AI100) — inspect before extending horizons.

NOT done (by design): cost architecture, payroll, financing, solvency, events, destinations, scoring, stock, Q7/Q8, production.

---

## Phase 2C status (approved, frozen at 8f5794b)

**Last Updated:** 2026-09-26
**Approved/frozen:** Phase 2A e84978b · Phase 2B 330edac. **V1 restore point:** tag `v1-engine-frozen` → ee4a8bc.

## Phase 2C — Commercial & Leading Indicators (COMPLETE, STOPPED FOR REVIEW)

Market conditions + post-maturation capabilities + Product/Trust/Execution → leading commercial indicators with memory.
No revenue, cost, cash, stock or score effects.

- New: `src/simulation/engineV2Commercial.ts` (market input, commercial state, Draft 1 calibration constants, indicator
  engine, AI readiness), `src/simulation/engineV2Commercial.test.ts`.
- Modified: `engineV2.ts` (state.commercial + commercialHistory; optional `market` per quarter; separate
  `commercial` consequence), `engineV2.test.ts` (import allow-list), `v2Diagnostics.ts` (commercial checks, 12 calibration
  scenarios), Mode 5 page (commercial panels, section D), Test Lab tile.
- Indicators: Consumer Retention 85% (60–95), CAC Index 100 (50–200), Enterprise Pipeline $80M (stock, 30% resolves/qtr),
  Win Rate 25% (10–45), AI Commercial Readiness (calculated), AI Adoption 10 (lagged), University Pipeline $24M (stock,
  20%/qtr), Renewal 90% (75–97), Pricing Power 50 (slow).
- Neutral market includes competitor progress (Consumer/Enterprise 0.75, Credential 0.5 capability pts/qtr): standing still
  slowly loses relative position. Zero competitor progress makes the starting company an exact fixed point.
- **Phase 2C calibration patch:** Enterprise investment develops Customer Success as a secondary capability (not a bucket):
  $0/5/10/20/30M → +0/1/2/3.5/5 CS, same cohort, same absorption factor, Enterprise 25/45/30 schedule, capped at 100 with
  nominal/effective/wasted diagnostics. Weak-CS Test Lab scenario re-pins CS to 15 at each quarter start.
  Competitor progress formalized as `V2_NEUTRAL_COMPETITOR_PROGRESS` (0.75 / 0.75 / 0.50 per quarter), injected only via
  `V2MarketConditions.competitorProgress`. Absolute capability never decays because competitors improve; relative position does.
- Accepted: Balanced edges Consumer100 on Q8 retention (91.9 vs 91.2); Consumer100 leads CAC; Consumer+AI leads retention.
- Execution still has no investment curve.

NOT done (by design): revenue conversion, opex, payroll, destinations, financing, insolvency, stock, scoring, events, Q7/Q8.

---

## Phase 2B status (approved, frozen at 330edac)

**Last Updated:** 2026-09-26
**Approved:** Phase 2A at e84978b. **V1 restore point:** tag `v1-engine-frozen` → ee4a8bc.

## Phase 2B — Capability & Investment Pipeline (COMPLETE, STOPPED FOR REVIEW)

Strategic Investment → calibrated curves (piecewise-linear, $0–30M, no extrapolation) → Transformation Load →
Organizational absorption (smooth, 100% ≤70% of capacity … 40% floor) → investment cohorts → lagged capability maturation.

- New: `src/simulation/engineV2Capabilities.ts` (Draft 1 curves, absorption, cohorts, maturation; no imports),
  `src/simulation/engineV2Capabilities.test.ts`
- Modified: `engineV2.ts` (state: Org Capacity 60, Transformation Load, Innovation Velocity 55, Technical Debt 25,
  pending cohorts, capability history; `V2Consequence.capability` separate from the financial `ledger`),
  `engineV2.test.ts` (self-containment test now "V2 modules only, never V1"), `v2Diagnostics.ts`, Mode 5 page, Test Lab tile.
- Capability gains have NO revenue/cost/cash effect yet. Financial ledger unchanged from 2A.
- Absorption uses opening Org Capacity and applies to all new gains (incl. People/University support lines); existing
  cohorts mature on their original schedule.
- **Phase 2B calibration adjustment (approved direction):** absorption recalibrated to ≤0.30→1.00, 0.50→0.95, 0.70→0.85,
  0.90→0.70, 1.10→0.50, ≥1.30→0.40 (continuous). Added coordination load for initiative breadth (active initiative =
  non-reserve bucket ≥ $2M; 0–1→0, 2→1, 3→3, 4→6, 5→10). Total load = bucket load + coordination load; all three exposed.
- Carried unchanged (no approved curve): Customer Success, Execution, Culture, Innovation Velocity, Technical Debt;
  People recurring opex commitment not implemented.
- Legal $30M allocations at capacity 60 now range 1.00 ($30M People) → 0.87 ($6M × 5); worst on a $1M grid is
  5/2/19/2/2 (load 42.8) → 0.84. Capacity 75 improves absorption by 0–6.5 points.

NOT done (by design): segment revenue, pipeline/win rate, AI-native/University revenue, CAC/retention, events,
Q4 destinations, financing, insolvency, scoring, switching penalties, Q7 crises.

---

## Phase 2A status (approved)

**Last Updated:** 2026-09-26
**V1 restore point:** tag `v1-engine-frozen` → ee4a8bc (engine.ts unchanged by Phase 2A)

## Phase 2A — V2 Financial Accounting Core (COMPLETE, STOPPED FOR REVIEW)

Canonical identity implemented on a parallel V2 path:

```
Operating Profit = Revenue − Operating Costs
Closing Cash     = Opening Cash + Operating Profit − Strategic Investment − Event Costs + Financing
```

- New: `src/simulation/engineV2.ts` (ledger + state model), `src/simulation/engineV2.test.ts` (Vitest),
  `src/testlab/utils/v2StateBuilder.ts`, `src/testlab/utils/v2Diagnostics.ts`, `src/testlab/pages/V2FinancialLedgerTest.tsx`
- Modified: `src/testlab/index.tsx` (Mode 5), `package.json` (`npm test`, vitest)
- No ΔOperatingProfit cash semantics, no cash floor, Cash Reserve is memo only, strategic investment booked outside opex,
  financing explicit and fixed at $0, event costs explicit/itemised (none by default).
- Operating inputs are carried forward (flat $200M/$170M) or injected by tests — placeholder until calibration.
- Production gameplay still runs V1. V2 is reachable only via Test Lab Mode 5.
- Phase 2A cleanup: `engineV2.ts` is fully self-contained (V2-native `V2Capabilities`; no import from V1 `engine.ts`).
- Phase 2A cleanup: Test-Lab-only `people-60` preset fixed to total 100% (was 92%); all presets now asserted to sum to 100%.
  The V2 runner's unallocated-remainder → Cash Reserve guard remains as a visible safety net but no preset triggers it.

NOT done (by design): capability/revenue calibration, financing choices, Q1–Q8 event rebalance, scoring, Q4 destinations.

---

# CURRENT STATUS — Phase 1 Economics Audit CLOSED

**Last Updated:** 2026-09-25 17:35 UTC  
**Commits:** 
- c8f246e (Phase 1D Findings — Cash State Reconciliation Complete)
- d8a7940 (Phase 1D Trace Analysis)
- bb6f880 (Phase 1C Diagnostic Observability)
- 5583202 (Phase 1 Audit)

**Engine Baseline:** V1 Audited (all Phase 1 findings documented; no fixes applied)

---

## TIMELINE

```
Phase 1  (CLOSED)    — Economics audit complete; V1 baseline frozen
Phase 1C (COMPLETE)  — Diagnostic observability infrastructure
Phase 1D (COMPLETE)  — Cash state reconciliation; semantic violations identified
Next: Economics V2 Design (approval pending)
```

---

## PHASE 1 DELIVERABLES

### Three Comprehensive Audit Documents

**ECONOMICS_AUDIT_PHASE1.md** — Full report (A–H analysis)
- Cash/insolvency mechanics
- Terminal financial score reconstruction
- AI dominance analysis
- Enterprise dominance analysis
- No-investment viability
- Execution scoring patterns
- Organizational scoring
- Strategic coherence & adaptability
- Critical unknowns & unresolved issues
- Issue classification

**ECONOMICS_AUDIT_SUMMARY.md** — Executive brief (quick reference)
- One-page summary per finding (A–H)
- Bug severity ranking (P1/P2/P3)
- Recommendations for next phases

**ECONOMICS_AUDIT_TABLES.md** — Detailed analysis (9 tables)
- Q1→Q8 cash flows by strategy
- Financial score reverse-engineering
- Capability growth paths
- Execution alignment mystery
- Terminal verdict calculation
- Q4 destination mechanics
- No-investment decomposition
- Capability thresholds
- Product quality growth mechanism

### Key Findings Summary

**4 Critical Bugs Identified:**
1. Total Score Gap (People 100%: calculated 80, observed 73)
2. Financial Score Gaps (Enterprise +4, AI +3)
3. Null RoleVotes Crash Risk
4. Execution Alignment Gap (Pathological −13)

**4 Calibration Issues:**
1. Cash score cliff at $50M
2. Enterprise +6% default baseline
3. Q4 destination incomplete
4. Org score has no financial gate

**3 Missing Mechanics:**
1. Insolvency gate/financing
2. Q5–Q8 destination effects
3. Strategy switching coherence

**1 Resolved Mystery:**
- ✓ Product Quality Growth with AI 100% (mechanism found and explained)

---

## PHASE 1D FINDINGS — CASH STATE RECONCILIATION

### Confirmed Implementation Issues

**Q7 (Line 986):** Semantic Violation
```
Actual:   cashChange = newOperatingProfit - startingState.operatingCost
Should be: cashChange = newOperatingProfit - startingState.operatingProfit
Impact: Subtracts absolute cost (~$170M) instead of profit delta → −$170M unexplained deduction
Classification: CONFIRMED IMPLEMENTATION BUG
```

**Q8 (Line 1072):** Semantic Inconsistency
```
Actual:   cashChange = q8EBITDA - startingState.operatingCost
Pattern: Uses EBITDA instead of operating profit; incompatible with Q1–Q7
Classification: SEMANTIC INCONSISTENCY (requires Economics V2 design decision)
```

**Q2 Floor (Line 495):** Untracked Adjustment
```
Issue: Math.max(5, ...) applied to newCash but not reflected in returned cashChange
Impact: If floor triggers, closing ≠ opening + reported cashChange
Classification: DIAGNOSTIC OMISSION (not a logic error, diagnostic incomplete)
```

### Correct Pattern (Q1–Q6)

All quarters Q1–Q6 correctly use:
```
cashChange = newOperatingProfit - startingState.operatingProfit (delta)
```

This is intentional and requires **Economics V2** design decision to address how cashChange semantics interact with overall system architecture.

### Missing Diagnostics

**startingState.operatingProfit** is never captured in diagnostic ledger.
- **Impact:** Cannot independently verify `cashChange = newOp - startOp` formula
- **Fix:** Add to Phase 1C diagnostic observability (low priority; documentation only)

### Terminal Score Discrepancies (Phase 1 Audit)

**Resolved:** All Phase 1 audit discrepancies (People 100%: −7 point gap, Enterprise/AI financial gaps, execution alignment gaps) are **audit reconstruction errors**, not engine bugs.

**Evidence:** Phase 1C and 1D instrumentation confirmed:
- ✓ Q8 terminal formula is correct
- ✓ Execution alignment null guard works as designed
- ✓ Financial component calculations are correct
- ✓ Audit reverse-engineering was imperfect (expected)

---

## PHASE 1 CLOSURE — FINAL FINDINGS

### Architecture Assessment

The audit reveals that cash and financial systems require **coordinated redesign**, not isolated fixes:

1. **Q1–Q6 Pattern:** Correct deltas on operating profit (`newOp - startingOp`)
2. **Q7 Issue:** Wrong metric (uses cost instead of profit) → -$170M deduction
3. **Q8 Issue:** Incompatible formula (EBITDA-based) instead of profit delta
4. **System Design:** Current architecture assumes cashChange is always a consistent semantic type (delta), but Q7–Q8 violate this assumption

### What Cannot Be Fixed in Isolation

- ✗ Q7 formula fix alone will break cash flow continuity (depends on Q1–Q6 semantics)
- ✗ Q8 terminal formula fix alone will break terminal scoring logic
- ✗ Insolvency/financing mechanics cannot be added without addressing cash semantics first
- ✗ Q4 destination propagation requires decision on Q5–Q8 architecture

### V1 ENGINE BASELINE — FROZEN

**Current engine (commit 336a4a2) is the V1 audited baseline:**
- All Phase 1–1D findings documented
- No fixes applied
- Diagnostic instrumentation active
- Ready for Economics V2 design reference

---

## ECONOMICS V2 ARCHITECTURE — LOCKED

**Approved:** 2026-09-25 17:45 UTC  
**Document:** ECONOMICS_V2_ARCHITECTURE.md (2300 lines)

### 16 Approved Architecture Decisions

1. **Financial Accounting:** Real cash; no artificial floor; strategic investment as cash outflow
2. **Revenue Model:** Four-segment structure; revenue driven by market × capability × strategy
3. **Cost Architecture:** Separate fixed/variable; revenue declines don't produce proportional cost declines
4. **Six Allocation Buckets:** Consumer, Enterprise, AI & Product, People, University & Credentials, Cash Reserve
5. **Capability-Mediated Returns:** Money builds capabilities; different investments have different payoff speeds and diminishing returns
6. **Segment Personalities:** Consumer (fast/large), Enterprise (slow/sticky), University (slow/retention), AI-native (explosive/threshold)
7. **Core Capabilities:** Consumer, Enterprise, AI, Talent, Credential, Customer Success, Product Quality, Trust, Execution
8. **Organizational Capacity:** Finite transformation capacity; multiple initiatives create load that reduces execution effectiveness
9. **Leading/Lagging Indicators:** Students see leading signals early; lagging outcomes materialize with delay
10. **Q1–Q8 Quarter Architecture:** Each quarter has distinct theme and mechanics; Q8 is active decision, not passive score
11. **Q4 Strategic Destinations:** Five options (Consumer AI, Enterprise AI, Premium Human+AI, University Credentials, Balanced); Q5–Q8 respond to choice
12. **Liquidity and Financing:** Investment funded from profit/liquidity/financing; no arbitrary insolvency patch yet
13. **Scoring Architecture:** Financial, Strategic, Organizational dimensions with viability gates (catastrophic failure in one cannot be offset)
14. **Asymmetric Leadership Information:** Five roles (CEO, CFO, Product, People, Growth) receive role-specific private indicators
15. **Core Design Philosophy:** No universally correct strategy; outcomes depend on market evidence + investments + capabilities + execution + finances
16. **Student Experience:** Simple interface (10–12 KPIs) hiding complex economics; easy interface, difficult decisions

### Key Principles

- **Cash is real:** No operating-profit-delta semantics; no artificial floor
- **No direct investment conversion:** Money builds capabilities; capabilities drive revenue (not 1:1 mapping)
- **Strategic focus matters:** Organizational capacity limits simultaneous initiatives; focus creates economic value
- **Evidence-based adaptation:** Switching strategies based on new evidence is pragmatic but carries realistic costs
- **Viability gates prevent absurdity:** Financial catastrophe cannot be offset by strong culture; forces all-or-nothing outcomes realistic

### Documentation Preserved

- ECONOMICS_AUDIT_PHASE1.md (full analysis)
- ECONOMICS_AUDIT_SUMMARY.md (executive brief)
- ECONOMICS_AUDIT_TABLES.md (detailed tables)
- PHASE_1D_CASH_TRACE.md (code path analysis)
- PHASE_1D_FINDINGS.md (semantic violations)
- DIAGNOSTICS_PHASE1B.md (how to run tests)
- PHASE_1C_DIAGNOSTIC_OBSERVABILITY.md (observability setup)
- PHASE_1_CLOSURE.md (audit closure)
- **ECONOMICS_V2_ARCHITECTURE.md** (approved specification)

---

## NEXT: ECONOMICS V2 QUANTITATIVE CALIBRATION

**No production code changes until calibration is complete.**

Quantitative calibration will define:
- Solvency thresholds (when does < $0M trigger consequences?)
- Segment revenue models (exact payoff curves for each segment)
- Capability growth curves (ROI for each investment type)
- Transformation load mechanics (capacity curves, cost multipliers)
- Scoring gates and thresholds (financial/strategic/organizational viability limits)
- Role-specific information metrics (what does each role see?)
- Q4 destination economics (specific Q5–Q8 multiplier/effect curves per destination)
- Financing options mechanics (equity dilution %, debt terms, partnership costs)

**Timeline:** Phase 1 complete; Phase 1D complete; Economics V2 Architecture locked; ready for quantitative calibration.

---

## FILES AT A GLANCE

| File | Purpose | Read When |
|------|---------|-----------|
| ECONOMICS_AUDIT_PHASE1.md | Full formula diagnosis | Need detailed proof |
| ECONOMICS_AUDIT_SUMMARY.md | Executive brief | Quick overview |
| ECONOMICS_AUDIT_TABLES.md | Detailed tables | Deep analysis |
| AUDIT_PHASE1_COMPLETE.md | Completion guide | Next steps reference |
| DIAGNOSTICS_PHASE1B.md | How to run diagnostics | About to run tests |
| PHASE1B_SUMMARY.md | Instrumentation summary | Before running diagnostics |
| STATUS.md | This file | Current status |

---

## BLOCKERS FOR PHASE 2

None. Ready to proceed with diagnostics immediately.

**All code is:**
- ✓ Built successfully
- ✓ No breaking changes
- ✓ Only logging added
- ✓ Ready for test lab execution

---

## PHASE 1 COMPLETION CHECKLIST

- [x] Formula diagnosis and reverse-engineering (Phase 1)
- [x] Diagnostic instrumentation added (Phase 1B–1C)
- [x] Cash state reconciliation traced (Phase 1D)
- [x] Semantic violations identified (Q7, Q8)
- [x] Audit reconstruction errors resolved (terminal score discrepancies)
- [x] Execution behavior explained (null guard works)
- [x] Architecture assessment complete
- [x] V1 baseline frozen and documented
- [x] Economics V2 design prerequisites identified

---

## CURRENT GIT STATE

```bash
$ git log --oneline | head -5
c8f246e Add: Phase 1D Findings - Cash State Reconciliation Complete
d8a7940 Phase 1D: Cash State Reconciliation - Code Trace Analysis
1dc1935 Add: Phase 1C diagnostic observability guide and validation checklist
bb6f880 Phase 1C: Fix diagnostic observability - cash ledger and financial components
28b2b6c Restore: Original execution alignment behavior for diagnostic baseline
```

**Branch:** main  
**Engine Version:** V1 Audited (frozen)  
**Build Status:** ✓ Clean  
**Next Phase:** Economics V2 Design (approval required)


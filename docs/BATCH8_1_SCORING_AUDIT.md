# Batch 8.1 — Executive scoring audit

## Scope and sources

| | |
|---|---|
| Model before | NXLN-EXEC-1.0 (Batch 8) |
| Model after | **NXLN-EXEC-1.1** (`src/production/v2/insights/executive.ts`) |
| Evidence | 28 eight-quarter strategies run through the frozen engine and the production replay path (`src/production/v2/testing/auditStrategies.ts`) |
| Generated data | `docs/BATCH8_1_AUDIT_DATA.md`, regenerated with `AUDIT_WRITE=1 npx vitest run scripts/analysis/batch81-audit.test.ts` |
| Regression tests | `src/production/v2/batch81.scoring.test.ts` |

The scorecard evaluates **how the company performed under each function's responsibilities**. It never measures an individual student's contribution, and every scorecard screen says so.

## 1. Findings on NXLN-EXEC-1.0 (measured, not assumed)

| # | Finding | Evidence (v1.0) |
|---|---|---|
| F1 | Cross-team awards were dominated by one team | In 300 simulated five-team classrooms at Q8, one team won ≥ 5 of 6 awards in **68%** of classrooms. The mean was 1.72 distinct winning teams. The top share price swept every functional award in 37%. |
| F2 | The 40% company component is identical for every role in a team | Each of the five role awards counted shareholder value again. At 70/30 sweeps were still 64%; at 50/50, 73%. |
| F3 | The same outcome was measured in two roles | CEO operating profit vs CFO operating margin: r = 0.98. CFO capital efficiency (revenue-based) vs CGO revenue: r = 0.96. CEO average load vs CPeO load: r = 0.89. |
| F4 | The same outcome was measured twice within a role | CPO AI capability vs AI readiness: r = 1.00. CPeO organizational capacity vs talent: r = 1.00. |
| F5 | The CEO score largely duplicated the share price | CEO functional vs share price: Spearman 0.92. |
| F6 | Product could score highly on capability that customers never paid for | Both AI metrics measured capability, not adoption or revenue. |
| F7 | An insolvent company's CEO outscored a solvent cash-hoarder's CEO | Insolvency strategy: CEO functional 69, executive 53. Cash100: 41 / 39. Nothing in the CEO scorecard reflected solvency. |
| F8 | **CFO conservatism (the screenshot question).** Liquidity, debt, ownership and liquidity-warning metrics all read 100 for any healthy company: 35% of the CFO functional score. | These four do not distinguish between healthy companies; they only penalise stressed ones. Pure hoarding was **not** disproportionately rewarded: Cash100 CFO 48, rank 23 of 28, below the median of active strategies. Capital efficiency (held cash counts as deployed capital earning nothing) and margin counterbalance it. |
| F9 | The People scorecard does not reward avoiding change | Cash100 People 49–50; Conservative 33–36; active, people-investing strategies 71–77. The target norm gives idle capacity 40, not 100. |
| F10 | The Growth scorecard does not reward revenue alone | Revenue is 30%. Retention, CAC, pipeline, win rate and renewals make up 70%. Example: the strategy that grew into the recession with no response reached Growth 59 on revenue $214M, below the paired strategies at 70+. |

## 2. Corrections made (NXLN-EXEC-1.1)

Each correction is narrow and addresses a finding above. The V2 engine is untouched; this is the presentation-layer scoring model.

| Change | Fixes | Rationale |
|---|---|---|
| **Role awards rank the functional score.** The team award still ranks the average 60/40 executive score. | F1, F2 | Shareholder value is identical for every role in a team, so it cannot distinguish one function from another. It now decides only Best Overall Leadership Team. |
| CEO: replaced operating profit (duplicated the CFO) and average load (duplicated People). New metrics: **net revenue delivered by the strategy** (growth in the strategy's target businesses less any decline elsewhere, as % of Q4 2022 revenue) and **strategic focus retained** (1 − focus dilution). Readiness now uses the engine's own destination-readiness function. | F3, F5 | The CEO is accountable for whether the chosen strategy is ready and is delivering, without hollowing out the rest of the company. |
| CFO: capital efficiency is now **return on capital deployed**: operating profit above the Q4 2022 run-rate, summed, ÷ capital deployed (invested or held). | F3 | It no longer duplicates Growth's revenue metric. Held cash still counts as deployed capital with no return, so hoarding is not rewarded. |
| CPO: replaced AI capability with **AI product revenue** (customers paying for AI products). | F4, F6 | Capability that customers do not pay for is no longer fully credited. |
| CPeO: removed organizational capacity (identical to talent in the engine) and reweighted: culture 30%, talent 30%, execution 15%, load 25%. | F4 | Removes the double count. |
| **Survival gates:** if the company has been insolvent, the CEO and CFO functional scores are capped at 30. While it is distressed, they are capped at 45. | F7 | Those two functions are accountable for solvency. The gate is shown on the scorecard and marked with * on the facilitator table. |
| The CFO liquidity, debt, ownership and warning metrics are **kept unchanged**. | F8 | Retaining cash during uncertainty can be correct, so cash is not penalised. Above $40M it earns nothing extra, and capital efficiency charges idle capital. Evidence: Cash100 CFO 48 (rank 21 of 28); Conservative (cost-cutting while holding cash) 65 (rank 13), which is prudent management that the Growth scorecard (34) correctly separates. |

## 3. Results after correction

| Measure (Q8, 28 strategies) | v1.0 | v1.1 |
|---|---:|---:|
| Classrooms where one team wins ≥ 5 of 6 awards (300 five-team draws) | 68% | **32%** |
| Mean distinct winning teams per classroom | 1.72 | **2.45** |
| Top share price sweeps every functional award | 37% | **7%** |
| CEO functional vs share price (Spearman) | 0.92 | 0.80 |
| CEO vs CFO functional (Pearson) | 0.83 | 0.70 |
| CEO vs Growth functional (Pearson) | 0.87 | 0.68 |
| Cross-role metric pairs with \|r\| ≥ 0.95 | 2 | **0** (enforced by a regression test) |
| Insolvent company: CEO / CFO functional | 69 / 39 | **30 / 30** |

Remaining correlations are real business linkages, not duplicates:
- Within the CFO scorecard, margin and return on capital (r = 0.98) are both profitability measures.
- CEO strategy delivery and Growth revenue (r = 0.93) coincide for balanced strategies, whose target is all revenue.
- Product trust and Growth renewals (r = 0.91): trust drives renewals in the engine.

These are documented, not corrected.

## 4. Every executive formula (NXLN-EXEC-1.1)

```
executive score   = 60% functional + 40% company
company component = clamp(50 + (share price − $100) / 2, 0, 100)
functional        = Σ weight · metric score over measurable metrics ÷ Σ their weights, then the survival gate (CEO, CFO)
```

**Metric score normalisations**
- `change`: 50 = Q4 2022. ±range from start maps to 100 or 0. Scored on the sustained value: the average of this quarter and the previous one.
- `band`: linear between the thresholds; nothing beyond the top.
- `target`: 100 inside the range; falls to 0 at the maximum, and to 40 at zero load.

### CEO — Enterprise leadership

| Metric | Business meaning | Data source | Transformation | Weight | Baseline | Threshold | Direction | Overlap | Exploit risk |
|---|---|---|---|---:|---|---|---|---|---|
| Readiness of the chosen strategy | Are the capabilities the strategy needs in place? | `destinationReadiness(committed id, state)` (engine); before Q4 2023, the best destination | change ±30 pts | 35% | Q4 2022 readiness of the same destination | — | higher | CPO readiness r ≈ 0.6 | Building capability without customers: offset by delivery (35%) |
| Net revenue delivered by the strategy | Is the strategy producing business, without hollowing out the rest? | `segmentRevenue` of the destination's target businesses (market-access uplift), plus any decline elsewhere | change ±15% of Q4 2022 revenue; null before commitment | 35% | 0 | — | higher | Growth revenue r = 0.93 for balanced strategies | Choosing a narrow target: losses elsewhere are subtracted |
| Pricing power | Market position | `commercial.pricingPower` | change ±15 | 15% | 50 | — | higher | CPO quality r = 0.77 | — |
| Strategic focus retained | Avoiding off-strategy commitments | 1 − `destination.focusDilution` | band 70% → 100% | 15% | 100% | Nothing above 100% | higher | none | Accepting no contract keeps 100%; the opportunity cost shows in delivery |
| Survival gate | Solvency is the CEO's responsibility | `solvency` | cap at 30 (insolvent) / 45 (distressed) | — | — | — | — | — | — |

### CFO

| Metric | Business meaning | Data source | Transformation | Weight | Baseline | Threshold | Direction | Overlap | Exploit risk |
|---|---|---|---|---:|---|---|---|---|---|
| Operating margin | Cost discipline and profitability | OP ÷ revenue | change ±10 pts | 35% | 15% | — | higher | Return on capital r = 0.98 (within role) | Deep cuts raise margin; People scorecard and board verdict show the cost |
| Cash | Liquidity | `cash` | band $15M → $40M | 15% | $60M (100) | Nothing above $40M | higher | Debt and warnings (risk group) | Hoarding earns nothing above $40M |
| Return on capital deployed | Productive use of capital | Σ(OP − $30M) ÷ Σ(strategic investment + held reserve) | band −0.25 → 0.50 | 30% | — (needs one quarter) | — | higher | Margin (within role) | Holding cash counts as deployed capital with no return |
| Debt | Leverage risk | `financing.debt` | band $0 → $100M | 7% | $0 | — | lower | Warnings (risk group) | Never borrowing is free here, but liquidity and growth carry the cost |
| Ownership retained | Dilution | `financing.ownership` | band 70% → 100% | 6% | 100% | — | higher | — | Same as debt |
| Quarters in liquidity warning or worse | Liquidity risk management | `solvency.status` history | band 0 → 50% of quarters | 7% | 0 | — | lower | Cash | — |
| Survival gate | Solvency | `solvency` | cap 30 / 45 | — | — | — | — | — | — |

### CPO — Product

| Metric | Business meaning | Data source | Transformation | Weight | Baseline | Threshold | Direction | Overlap | Exploit risk |
|---|---|---|---|---:|---|---|---|---|---|
| Product quality | Core product competitiveness | `productQuality` | change ±20 | 30% | 70 | — | higher | Pricing r = 0.77 | — |
| AI commercial readiness | Innovation readiness | `commercial.aiCommercialReadiness` | change ±40 | 20% | 7.6 | — | higher | Monetization r = 0.90 | Capability without customers: offset by monetization |
| AI product revenue | Customers paying for AI products | `segmentRevenue.aiNative` | change ±$12M | 20% | $4M | — | higher | Growth revenue r = 0.83 | — |
| Customer trust | Trust and resilience | `trust` | change ±20 | 30% | 70 | — | higher | Renewals r = 0.91 | — |

### CGO — Growth

| Metric | Business meaning | Data source | Transformation | Weight | Baseline | Direction | Overlap |
|---|---|---|---|---:|---|---|---|
| Revenue | Top-line growth | `revenue` | change ±$50M | 30% | $200M | higher | CEO delivery r = 0.93 |
| Consumer retention | Commercial quality | `commercial.consumerRetention` | change ±8 pts | 20% | 85% | higher | CAC r = 0.82 |
| Cost to win a customer | Acquisition efficiency | `commercial.consumerCacIndex` | change ±30 | 15% | 100 | **lower** | Retention |
| Enterprise pipeline | Future revenue | `commercial.enterprisePipeline` | change ±$80M | 15% | $80M | higher | Win rate r = 0.79 |
| Enterprise win rate | Conversion | `commercial.enterpriseWinRate` | change ±10 pts | 10% | 25% | higher | Pipeline |
| University renewals | Institutional retention | `commercial.universityRenewalRate` | change ±8 pts | 10% | 90% | higher | CPO trust |

**Exploit check.** Revenue bought with weak retention or rising CAC loses up to 70% of the score.

### CPeO — People

| Metric | Business meaning | Data source | Transformation | Weight | Baseline | Threshold | Direction | Overlap | Exploit risk |
|---|---|---|---|---:|---|---|---|---|---|
| Culture | Organizational health | `culture` | change ±15 | 30% | 72 | — | higher | Execution r = 0.86 | — |
| Talent | People capability | `capabilities.talent` | change ±25 | 30% | 55 | — | higher | — | — |
| Execution capability | Delivery reliability | `capabilities.execution` | change ±20 | 15% | 60 | — | higher | Culture | — |
| Change load vs capacity | Sustainable workload | load ÷ capacity | target 60–95% | 25% | — | 0 at 130%; 40 at no change | lower beyond range | — | Avoiding change scores 40 on this metric, not 100 |

**Market context.** Commercial metrics show the cumulative market contribution recorded by the engine. It is context only: every team faces the same market.

## 5. Weight sensitivity (60/40 retained)

| Weights | Mean r between roles' executive scores | Mean Spearman (executive vs share price) | Max executive score with share price < $100 | One team wins ≥ 5 of 6 at Q8 (if awards used executive) |
|---|---:|---:|---:|---:|
| 100/0 | 0.53 | 0.74 | 79 | 32% |
| 70/30 | 0.77 | 0.86 | 69 | 57% |
| 65/35 | 0.81 | 0.88 | 68 | 61% |
| **60/40** | 0.84 | 0.90 | 66 | 64% |
| 50/50 | 0.90 | 0.93 | 63 | 72% |

**60/40 is retained for the executive score shown on the scorecard.** It keeps weaker companies from implausibly high overall executive scores: the maximum is 66 below a $100 share price, against 79 at 100/0. It still leaves functional differences visible.

The award-concentration problem came from using the shared company component in role awards. That is fixed by ranking role awards on the functional score, so it was not necessary to change the weights.

## 6. Award distribution (Batch 8.1 engine)

300 five-team classrooms drawn from 27 strategies; the insolvent strategy is excluded from the pool and tested separately.

| Quarter | One team wins ≥ 5 of 6 awards | Mean distinct winning teams | Top share price sweeps every role award |
|---|---:|---:|---:|
| Q4 | 20% | 2.69 | 1% |
| Q6 | 27% | 2.63 | 3% |
| Q8 | 32% | 2.45 | 7% |

When one team still wins most awards, its functional scores are each highest. That is no longer because the same shareholder-value number was counted five times.

- **Ties:** a lead of less than 1 point is shared (tested).
- **Insolvency:** insolvent teams are excluded at every quarter after they become insolvent (tested).
- **Equal footing:** teams are always compared at the latest quarter every team has completed (tested).

## 7. Recommendations

1. Keep NXLN-EXEC-1.1 for the pilot. Collect facilitator feedback on whether the role awards match their observation of team discussion.
2. Do not use executive scores for grading individuals. The platform cannot observe individual contributions.
3. After the pilot, revisit the CFO risk group (35% of the CFO score, which only penalises stress) if facilitators find it uninformative between healthy teams.

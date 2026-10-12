# Executive scoring methodology — NXLN-EXEC-1.0 (Batch 8 · Stage 2)

Code: `src/production/v2/insights/executive.ts`. Tests: `src/production/v2/batch8.intelligence.test.ts`.

## Three separate measures

| Measure | What it is | Source |
|---|---|---|
| Business performance | The simulation's own terminal evaluation of the company (financial, strategic, organizational) | `engineV2Scoring` — frozen, unchanged |
| Shareholder value | The simulated NXLN share price | `insights/valuation.ts` (NXLN-VAL-1.0) |
| Executive performance | Five functional scorecards | This module |

- Executive scores never feed the engine or the terminal score.
- They evaluate how the team handled each executive **function**, not any individual student. The platform cannot observe who contributed what, and in teams of three or four one student may hold several roles.

## Formula

```
executive score = 60% functional component + 40% company component
company component = shareholder value: share price $0 → 0, $100 → 50, $200 → 100 (clamped; the same for every role)
functional component = weighted average of the role's metric scores (0–100)
```

## Normalisation (no raw values)

| Kind | Rule | Why |
|---|---|---|
| `change` | 50 = the Q4 2022 position. A move of ±range in the favourable direction scores 100 (or 0 the other way). Lower-is-better metrics are inverted. The score uses the **sustained** value: the average of this quarter and the previous one. | Considers starting conditions (every team starts from the same company). A one-quarter spike earns half credit; sustained improvement earns full credit. |
| `band` | Absolute thresholds, e.g. cash $15M → $40M. Nothing above the top of the band earns more. | Unused cash is not rewarded. Distress (cash near $15M) is penalised. |
| `target` | Full credit inside a sustainable range (change load 60–95% of capacity). Falls to 0 at 130%, and to 40 when no change is attempted. | Overload is penalised; idle capacity is not rewarded. |

## Metrics (each appears in exactly one scorecard — no double counting)

| Role | Area | Metric | Norm | Weight |
|---|---|---|---|---|
| CEO (Enterprise leadership) | Financial performance | Operating profit | change ±$20M | 30% |
| | Strategic alignment | Average of the capabilities the committed strategy relies on | change ±30 pts | 30% |
| | Strategic position | Pricing power | change ±15 | 15% |
| | Organizational sustainability | Average load vs capacity, Q1 to now | target 60–95% | 25% |
| CFO | Operating profitability | Operating margin | change ±10 pts | 35% |
| | Liquidity | Cash (credit up to $40M) | band $15M → $40M | 15% |
| | Capital efficiency | Annualised revenue gained ÷ capital deployed (envelope invested **or held**) | band −$0.50 → $1.00 | 30% |
| | Financing risk | Debt | band $0 → $100M (lower better) | 7% |
| | Financing risk | Ownership retained | band 70% → 100% | 6% |
| | Financing risk | Share of quarters in liquidity warning or worse | band 0 → 50% (lower better) | 7% |
| CPO (Product) | Product quality | Product quality | change ±20 | 30% |
| | Innovation readiness | AI commercial readiness | change ±40 | 20% |
| | Capability | AI and product capability | change ±40 | 20% |
| | Trust and resilience | Customer trust | change ±20 | 30% |
| CGO (Growth) | Revenue | Revenue | change ±$50M | 30% |
| | Retention | Consumer retention | change ±8 pts | 20% |
| | Acquisition efficiency | CAC index (lower better) | change ±30 | 15% |
| | Pipeline and conversion | Enterprise pipeline | change ±$80M | 15% |
| | Pipeline and conversion | Enterprise win rate | change ±10 pts | 10% |
| | Retention | University renewals | change ±8 pts | 10% |
| CPeO (People) | Culture | Culture | change ±15 | 25% |
| | Talent | Talent | change ±25 | 25% |
| | Execution capacity | Execution capability | change ±20 | 15% |
| | Execution capacity | Organizational capacity | change ±20 | 15% |
| | Organizational load | Load vs capacity this quarter | target 60–95% | 20% |

## Safeguards

| Requirement | How it is met |
|---|---|
| Not reward unused cash | Cash is a band capped at $40M. Capital efficiency counts held reserve as deployed capital with zero return. |
| Not reward investment without results | Spending is never scored. Only outcomes are scored: capability levels, indicators, profit and revenue. |
| Penalise distress | The CFO liquidity, debt, ownership and warning-quarter metrics. The company component inherits the valuation's distress discount. |
| Delayed effects | Capabilities are scored as realised (the engine's maturation). Sustained-value averaging stops a single quarter dominating. The scorecard shows the previous quarter beside the current one. |
| Market movement | Commercial metrics show the cumulative market contribution recorded by the engine as context. Every team faces the same conditions, so cross-team comparisons stay fair. |
| Configurable and versioned | `EXECUTIVE_METRICS`, `EXECUTIVE_WEIGHTS` and `AWARD_RULES` are exported constants. The version string appears on every scorecard. |

## Awards (facilitator view: Leadership and awards)

Awards cover Best CEO, Best CFO, Best Product, Best Growth, Best People and Best Overall Leadership Team (the average of the five executive scores).

**When awards are shown**
- At least 3 teams.
- All teams are compared at the same quarter: the latest quarter every team has completed.
- Every team must have completed at least 4 quarters.

**Eligibility and ties**
- Teams that ever became insolvent are excluded.
- A lead of less than 1.0 point produces a shared award.

**Who an award belongs to**
- Awards are announced as "Team X — Chief Financial Officer role".
- The facilitator may assign individuals in class.

## Calibration evidence

See `docs/BATCH8_CALIBRATION_DATA.md`, section "Executive scores at Q8".

**Lowest scores**
- Cash preservation (Cash100) has the lowest average executive score of the strategies that stay solvent (≈40).
- Its Growth score is the lowest of all runs (27 functional).
- Financing-refusing concentrated strategies that end distressed score lowest on the CFO scorecard (33–38 executive).

**Highest scores**
- Paired, adaptive and capability-led strategies score highest (CEO functional 85–93).

**People scorecard pattern**
- For aggressive and paired strategies the People scorecard is the weakest (load above the sustainable range).
- Capability-led strategies score well on People.
- So no single strategy tops every role.

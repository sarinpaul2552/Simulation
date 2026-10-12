# NXLN simulated share price — methodology NXLN-VAL-1.0 (Batch 8 · Stage 3)

| | |
|---|---|
| Code | `src/production/v2/insights/valuation.ts` |
| Tests | `src/production/v2/batch8.intelligence.test.ts` |
| Calibration | `scripts/analysis/valuation-calibration.test.ts` → `docs/BATCH8_CALIBRATION_DATA.md` |

## What it is, and what it is not

The share price is a separate, versioned, deterministic presentation model. It reads recorded V2 engine state after each quarter.

- **It never writes to the engine.** The frozen engine's own `stockPrice` field (a constant 100) is ignored and left untouched; a test checks this.
- **It plays no part in economics or scoring.** It does not influence the simulation, its economics or the terminal score (`engineV2Scoring`).
- **It is replayable.** The same inputs produce the same price path on any device: the price is a pure function of the replayed history.
- **It is not market data.** It is labelled "simulated" wherever it appears. No external benchmark or real-world market movement is used.

## Model

The share price starts at **P(Q4 2022) = $100**.

### Factor scores

Each factor score f ∈ [0, 1] is calculated from recorded state.

| Factor | Weight | Horizon | Definition |
|---|---:|---|---|
| Revenue growth | 25% | present | 0.75 × revenue vs Q4 2022, mapped −15% → +35%, plus 0.25 × quarter-on-quarter growth, mapped −6% → +6% |
| Profitability | 25% | present | Operating margin, mapped −5% → 30% |
| Strategic readiness | 20% | future expectations | 0.5 × strategic fit + 0.5 × commercial traction (see below) |
| Retention and trust | 15% | present | Mean of consumer retention (75 → 95%), university renewals (80 → 97%) and trust (40 → 90) |
| Financial health | 15% | present | 0.6 × liquidity (cash $15M → $40M) + 0.4 × (1 − debt / $120M) |

- **Strategic fit** is the average of the capabilities the committed strategy relies on. Before Q4 2023 it is the best such average across the available strategies.
- **Commercial traction** is the mean of four mapped indicators: enterprise pipeline ($0–200M), AI adoption (0–60), university pipeline ($0–60M) and win rate (10–45%).

### Steps from factors to price

```
fundamentals  F(t) = 1 + M · Σ w_i (f_i(t) − f_i(Q4 2022)),  M = 2.4          (F = 1 at the start)
distress      d(t) = 0.25 insolvent | 0.12 distressed | 0.05 liquidity warning, + 0.04 covenant breach
dilution      D(t) = ownership(t) ^ 0.6
fair value    V(t) = $100 · F(t) · (1 − d(t)) · D(t)
price         P(t) = P(t−1) + clamp(V(t) − P(t−1), ±20% · P(t−1)),  floor $5
```

## Requirements and how they are met

| Requirement | Mechanism |
|---|---|
| Explainable contributions | The valuation bridge decomposes each quarter's change exactly: factor lines, distress discount, dilution, catch-up of earlier smoothing and the volatility limit. Displayed lines are rounded so that they sum to the displayed total. |
| Bounded volatility | No quarter moves more than 20%. Any excess carries forward as "catch-up". |
| No reward for cash hoarding | Liquidity credit stops at the $40M comfort level; a test shows +$200M cash changes nothing. Hoarding also lowers growth and readiness. |
| Penalise distress | An explicit distress discount and a financial-health factor. Distress-test strategies end at $60–70. |
| Do not mechanically reward AI | AI capability counts only when the chosen strategy relies on it (test). Readiness without commercial traction earns at most half of its factor (test). |
| Present performance vs future expectations | Readiness is labelled "future expectations"; the other four factors are "present performance". The board report shows each group's contribution. |
| Do not modify V2 economics | The module is read-only. The engine diff against `003f697` is empty. |

### Bridge identity

Write G = (1 − d)·D for the combined distress-and-dilution multiplier. For each quarter:

```
P(t) − P(t−1) =   Σ_i 100·M·w_i·(f_i(t) − f_i(t−1))·G(t−1)       factor contributions
                + 100·F(t)·D(t−1)·(d(t−1) − d(t))                   distress discount
                + 100·F(t)·(1 − d(t))·(D(t) − D(t−1))               dilution
                + (V(t−1) − P(t−1))                                 catch-up of earlier smoothing
                + (P(t) − V(t))                                     volatility limit / floor
```

Reconciliation is exact (tested to 1e-9 for every quarter of every calibration run).

## Known simplifications

- **Not a discounted-cash-flow valuation.** It is a transparent scoring-to-price mapping, chosen so students can see why the price moved.
- **Dilution is approximate.** It uses the ownership exponent 0.6, because the cash raised is partly credited through financial health.
- **The weights are starting weights.** Calibration found no reason to change them. The multiplier 2.4 and the factor ranges were tuned so that the spread across strategies is meaningful ($60–$165 at Q8) and rank-consistent with the frozen terminal score (Spearman ≥ 0.6, test).

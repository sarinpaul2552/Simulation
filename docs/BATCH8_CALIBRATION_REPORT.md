# Calibration report — share price and executive scorecards (Batch 8 · Stage 3)

Full tables: `docs/BATCH8_CALIBRATION_DATA.md`. They are regenerated with:

```
VAL_WRITE=1 npx vitest run scripts/analysis/valuation-calibration.test.ts
```

## Strategies

There are 19 eight-quarter runs, all played through the production replay path with the frozen engine:

- **15 Test Lab arc strategies** that start from the real company:
  - cash preservation: Cash100, Conservative;
  - concentrated: Consumer100, Enterprise100, AI100, People100, University100;
  - diversified: Balanced;
  - paired: Consumer + AI, Enterprise + AI;
  - adaptive: Evidence-responsive, Deliberately wrong-way;
  - capability-led: Premium builder, Credential builder;
  - aggressive growth: Aggressive spender.
- **Four financing-refusing variants** (distress tests).

## Results at Q4 2024

| Group | Share price | Notes |
|---|---|---|
| Consumer + AI, Enterprise + AI, Evidence-responsive, Premium builder, Aggressive spender | $145–$165 | Revenue +14–21%, margin up, healthy liquidity |
| Deliberately wrong-way, Credential builder | $129, $107 | Off-target or slow-to-commercialise investment |
| Balanced diversified | $137 | |
| Concentrated strategies | $75–$127 | Concentrating on enterprise or people alone drags margin and liquidity |
| Cash preservation | $74 (Cash100), $96 (Conservative) | Revenue −10%; $200M+ cash idle |
| Distress tests | $60 and $70 for the two that became distressed | Distress discount and financial-health loss visible in the bridge |

- Only the distressed companies reach the ±20% limit (Q7).
- Strategies whose liquidity deteriorated (People100, Enterprise100) fall up to 17.5% in Q7.
- Healthy strategies move by at most 14% in a quarter.

## Tests run

| Test | Result |
|---|---|
| Sensitivity: each weight +10% | No Q8 price moves more than 6% |
| Distress | A distressed run is priced below the same allocation without distress; the distress line appears in the bridge |
| Revenue decline / margin improvement | Lowers growth / raises profitability (unit tests on states) |
| High cash | +$200M cash: financial factor unchanged |
| Growth with weak retention | The same growth path with retention and renewals at the floor gets a lower fair value |
| Readiness without commercialisation | The readiness factor is capped at 0.5 |
| AI not mechanically rewarded | Raising AI to 100 under a strategy that does not rely on AI leaves strategic fit unchanged |
| Replay consistency | Identical price paths from repeated replays |
| Reconciliation | Every bridge sums to the quarter's change (exact, and when rounded) |
| Rank agreement | Spearman rank correlation with the frozen terminal score ≥ 0.6 |

## Bias and limitations found

1. **Early quarters are flat.** Q1–Q3 prices stay within about ±6% for every strategy, because investment matures over 1–3 quarters. Students should be told that the price reacts with a lag, like capability.
2. **Margin can flatter retrenchment.** The Conservative strategy's cost cuts lift margin while revenue falls 9.5%, so its price ($96) sits above Cash100 ($74) despite similar revenue. This is economically defensible (profitability is real), but it should be discussed in debriefs.
3. **University-led strategies are carried by the expectations factor.** University100 and Credential builder score well on readiness and retention but show flat revenue. Their price (~$107–111) shows that expectations without growth are only partly rewarded.
4. **Market movement is common to all teams.** The price has no separate market factor. The engine's market effects reach the price only through the company's own results, so cross-team comparisons are fair. Absolute prices, however, include the scenario's recession dip (Q6–Q7).
5. **Executive scorecards favour sustained change.** People scorecards penalise load above 95% of capacity, so aggressive strategies (high share price) can still have a weak People score. This is intended: the measures are separate.
6. **One run is not distinct.** The university financing-refusing variant never needed financing, so it is identical to University100.

No weights were changed from the starting weights (25/25/20/15/15).

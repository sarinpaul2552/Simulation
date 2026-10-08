# Batch 7.5 — Strategic balance analysis (analysis only)

**Scope.** Controlled eight-quarter runs with the frozen V2 engine through the Test Lab arc runner
(`scripts/analysis/strategic-balance.test.ts`; raw tables in `BATCH7_5_STRATEGIC_BALANCE_DATA.md`). Nothing in the
engine, the scoring or the calibration was changed. Each allocation pattern was held constant for eight quarters,
committed to a fitting Q4 destination, and used the Test Lab's default Q5–Q8 policies (contract fit, recession
response, crisis response, best earned final option). Every run was repeated with management that refuses outside
financing and with the default liquidity policy.

Allocations tested (per quarter, $30M envelope):

| Family | Variants |
|---|---|
| Cash preservation | hold all $30M (→ Balanced; → Consumer AI); hold $20M + $10M AI |
| Concentrated Consumer | $30M Consumer; $15M Consumer + $15M AI |
| Concentrated Enterprise/AI | $15M Enterprise + $15M AI; $30M Enterprise; $30M AI |
| Diversified | $5M ×5 + $5M reserve; $6M ×5 |
| People / capability-led | $30M People; $15M People + $8M AI + $7M Enterprise |

## Results (overall terminal score, out of 100)

| Rank | Strategy | Score | Revenue Q8 | Op. profit Q8 | Cash Q8 | Failure flags |
|---|---|---|---|---|---|---|
| 1 | $15M Consumer + $15M AI → Consumer AI | 81.6 | $241.5M | $57.9M | $110.8M | — |
| 2 | $6M in each of five buckets → Balanced | 78.7 | $223.8M | $42.3M | $58.4M | — |
| 3 | $15M People + $8M AI + $7M Enterprise → Premium Human+AI | 77.6 | $226.7M | $40.0M | $59.9M | — |
| 4 | $5M ×5 + $5M reserve → Balanced | 76.8 | $217.7M | $39.0M | $90.3M | — |
| 5 | $15M Enterprise + $15M AI → Enterprise AI | 75.0 | $229.4M | $43.6M | $44.3M | — |
| 6 | $30M AI → Enterprise AI | 67.7 | $222.6M | $40.0M | $63.3M | — |
| 7 | Hold $20M + $10M AI → Balanced | 67.1 | $208.5M | $36.8M | $213.2M | — |
| 8 | $30M Consumer → Consumer AI | 61.8 | $203.9M | $34.7M | $56.4M | — |
| 9 | $30M People → Premium Human+AI | 52.5–53.8 | $193.5M | $18.0M | $5.0M (refuse) / $25.0M with debt | distressed when refusing financing |
| 10 | $30M Enterprise → Enterprise AI | 51.7–53.6 | $193.2M | $22.3–33.5M | $13.4M (refuse) / $25.0M with debt | distressed when refusing financing |
| 11 | Hold all $30M → Balanced / Consumer AI | 48.3–51.8 | $176.0–180.3M | $14.2–17.4M | ~$240M | — |

Starting company: revenue $200.0M, operating profit $30.1M, cash $60.1M.

## Findings

1. **No single dominant strategy.** The top five scores (75.0–81.6) come from four different strategic families
   and four different destinations. The spread between the best two-priority focus and the best diversified plan is
   under 3 points. Strategy choice matters less than *coherence*: a destination supported by two to five funded
   capabilities.
2. **Extreme concentration is punished.** Putting the full $30M into one bucket every quarter scores 52–68,
   against 75–82 for balanced pairs or mixes. Diminishing returns on the calibration curves and overload of
   execution capacity drive this; $30M People and $30M Enterprise also drain cash to distress.
3. **Hoarding cash is not rewarded.** Keeping the entire budget gives the highest cash ($240M) but the lowest scores
   (48–52): revenue shrinks about 10% and capabilities stall. The scoring does not reward idle liquidity.
4. **A mild "cash-heavy" path is viable but mid-table.** Holding $20M and investing $10M in AI scores 67 with $213M
   of cash. That is defensible (low risk, modest growth), but it ranks below every coherent investing strategy.
5. **Financing policy rarely changes outcomes.** Refusing outside financing only matters for the two distressed
   single-bucket strategies, where borrowing avoids distress (+1.3 points for People, about −2 for Enterprise because
   of debt). No strategy diluted ownership under the default policy.
6. **Possible scoring/indicator observations (not changed):**
   - Destination strength ramps to 100% by Q8 for every committed strategy, regardless of capability. The terminal
     *strategic score* still differentiates (it weighs capability in the focus areas). The Batch 7 dashboard's
     "Strategic readiness" relied on strength alone and showed 100 for every team at Q8. Batch 7.5 changes that
     **dashboard interpretation only** to 50% strategy established + 50% average of the capabilities the strategy
     relies on.
   - Talent can exceed 100 under sustained People investment (120 at Q8 in the $30M People run). This is engine
     behaviour; the report clamps nothing and shows the recorded value.
   - The organizational dimension clusters around 57 for any strategy without People investment. Organizational
     health is mostly earned by People spending, which is consistent with the design.
   - The top-ranked Consumer + AI pair benefits from consumer revenue scale. A facilitator may want to discuss
     whether defending the core while adding AI is the "obvious" answer in this scenario arc. The margin over
     balanced and people-led mixes is small, so this is a discussion point, not a balance defect.

**Conclusion.** No economically questionable behaviour (hoarding, single-bucket all-in, reckless borrowing) is
rewarded by the frozen scoring. Coherent, moderately focused strategies win, with several distinct winning
shapes. No rebalancing is recommended from this analysis.

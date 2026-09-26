# Economics V2 — Autonomous Build Batch 1 Audit (Phases 3A–3C)

**Date:** 2026-09-26 · **Base:** Phase 2D `5c4f1e5` · Code source of truth: GitHub `main`. Audit ledger: Notion
"🧭 Economics V2 — Locked Architecture & Company Model" → *Autonomous Build Batch 1*.

## Verdict

**PASS — recommend proceeding to scenario economics**, with two design items to decide first (below).
All hard gates hold: 253 tests green; accounting identity exact (===) in every quarter of every run; no NaN/Infinity/
negative revenue or cost; baseline exactly $200M / $170M / $30M / 15%; strategic investment never expensed in-quarter;
no investment→revenue path; V1 and production gameplay untouched.

## What was checked (Phase 3C)

32 stress cases: zero investment; $30M/qtr maximum (broad 6×5); five concentrated strategies; Balanced; Consumer+AI;
Enterprise+AI; quarterly switching; low Execution (30); low Trust (40); low Talent (30); low Customer Success (10);
capability saturation (all capabilities 100); high (100) and low (30) Organizational Capacity; 16-quarter continuation;
40-quarter extreme runs for 10 strategies (competitive) and 4 (static neutral).

Automated detectors (`src/testlab/utils/v2StressAudit.ts`): every engine invariant; non-finite values; negative
revenue/cost; in-quarter expensing of investment; runaway growth (> 8%/qtr); revenue scale (> 2× baseline);
margin band (−25% … 40%); cost vanishing with revenue (from peak, > 60% of the revenue decline); Consumer/AI/Enterprise
revenue growth without a commercial cause.

## Findings and dispositions

| # | Finding | Disposition |
|---|---|---|
| 1 | **Runaway compounding beyond Q8.** Before calibration, 40-quarter Balanced reached $618M (51% margin) and Enterprise100's Enterprise segment $276M. Cause: no addressable-market limit; Enterprise expansion (up to 2.5%/qtr) exceeded churn (0.75%/qtr) once CS was strong, so NRR > 100% compounded without bound. | **Fixed by calibration** within the architecture ("market saturation / base approaching limit"): named, injectable `market.segmentCapacity` (Consumer $300M, Enterprise $120M, University $40M, AI-native $80M per quarter). Growth flows scale by headroom ÷ baseline headroom (exactly 1 at start; all fixed points preserved). 40-quarter Balanced now $403M; no segment can exceed capacity (tested). |
| 2 | **Long-run margin drift** to 40–52% at 2–3× scale. | **Fixed by calibration:** semi-fixed ratchet 0.10 → 0.20 of revenue above $200M. Max margin across all stress runs now 37%. |
| 3 | People commitment too heavy (People100 cash-negative by Q8 at 0.10/$). | **Fixed in 3A:** 0.10 → 0.06 per $. |
| 4 | Runway indicator numerically extreme near break-even (10,886 quarters). | Cosmetic; engine keeps exact value, Test Lab shows "> 40 q (near break-even)". |
| 5 | Detector false positives: AI growth via the Product-Quality/Execution channel; cost decline from segment mix shift. | Detectors refined (not engine changes). |
| 6 | **Structural long-horizon advantage of breadth.** At 16–40 quarters broad/Balanced/switching lead because concentrated strategies saturate capability at 100 by ~Q4 (further spend is visible waste) while competitor benchmarks keep rising, and each segment has its own market ceiling. Within Q1–Q8 no strategy dominates structurally (Consumer+AI leads revenue/OP; Cash100 leads cash). | **Unresolved — design decision.** Candidates: capability maintenance/obsolescence economics above the benchmark, and Q4 destination effects that raise the ceiling for the chosen segment. Not a calibration fix. |
| 7 | People100 spends itself insolvent (first negative cash Q10; −$376M by Q40). | Allowed at this stage (financing/solvency not yet built). Economic cause: carrying cost without commercial conversion. |
| 8 | Sustained neglect: competitive Cash100 erodes to $158M revenue and ≈ break-even by Q40 (never > 1%/qtr decline). | Intended behaviour of competitor progress. |

No free money, no double-counted cost or investment, no negative costs, no revenue without commercial cause, no
cost disappearing with revenue after refinement.

## Calibration changes in this batch

- People commitment 0.10 → 0.06 per $ (3A).
- Semi-fixed ratchet 0.10 → 0.20 of revenue above baseline (3C).
- New market parameter `segmentCapacity` (3C; affects the frozen Phase 2D revenue module's growth flows only via headroom).
  Q8 effects vs Phase 2D approval: Consumer+AI 238.2 → 234.9; AI100 218.2 → 216.3; Consumer100 219.6 → 217.5; Balanced 223.8 → 222.5.

## Unresolved questions

1. Capability ceiling/maintenance economics (finding 6).
2. Should strategic commitments partly convert into permanent fixed cost when the capability is retained?
3. Working capital: operating cash generation currently equals operating profit.
4. Addressable-market capacities are Draft 1 values; scenario phases (Q2 disruption, recession) should move them.

### Integrated Q1 / Q4 / Q8 — competitive

| Strategy | Q | Revenue | Op. cost | Op. profit | Margin | Strategic inv. | Closing cash | Runway |
|---|---|---|---|---|---|---|---|---|
| Consumer100 | Q1 | 200.3 | 170.1 | 30.2 | 15.1% | 30 | 60.2 | self-funding |
|  | Q4 | 205.6 | 171.6 | 34.0 | 16.5% | 30 | 67.3 | self-funding |
|  | Q8 | 217.5 | 176.0 | 41.5 | 19.1% | 30 | 102.5 | self-funding |
| Enterprise100 | Q1 | 200.0 | 170.0 | 30.0 | 15.0% | 30 | 60.0 | self-funding |
|  | Q4 | 200.9 | 173.9 | 27.1 | 13.5% | 30 | 54.0 | 18.6 q |
|  | Q8 | 207.0 | 179.6 | 27.4 | 13.2% | 30 | 39.8 | 15.2 q |
| AI100 | Q1 | 200.0 | 170.0 | 30.0 | 15.0% | 30 | 60.0 | self-funding |
|  | Q4 | 204.4 | 176.2 | 28.1 | 13.8% | 30 | 54.8 | 29.5 q |
|  | Q8 | 216.3 | 184.6 | 31.7 | 14.6% | 30 | 53.8 | self-funding |
| People100 | Q1 | 200.0 | 170.0 | 30.0 | 15.0% | 30 | 60.0 | self-funding |
|  | Q4 | 200.5 | 175.5 | 25.0 | 12.5% | 30 | 49.9 | 10.0 q |
|  | Q8 | 202.5 | 183.4 | 19.1 | 9.4% | 30 | 14.9 | 1.4 q |
| University100 | Q1 | 200.0 | 170.0 | 30.0 | 15.0% | 30 | 60.0 | >40 q |
|  | Q4 | 200.4 | 170.1 | 30.3 | 15.1% | 30 | 60.4 | self-funding |
|  | Q8 | 202.5 | 170.7 | 31.9 | 15.7% | 30 | 65.1 | self-funding |
| Cash100 | Q1 | 200.0 | 170.0 | 30.0 | 15.0% | 0 | 90.0 | self-funding |
|  | Q4 | 199.5 | 169.9 | 29.6 | 14.9% | 0 | 179.3 | self-funding |
|  | Q8 | 197.7 | 169.4 | 28.4 | 14.3% | 0 | 295.0 | self-funding |
| Balanced | Q1 | 200.1 | 170.0 | 30.1 | 15.0% | 25 | 65.1 | self-funding |
|  | Q4 | 203.0 | 173.2 | 29.9 | 14.7% | 25 | 78.8 | self-funding |
|  | Q8 | 222.5 | 181.5 | 41.0 | 18.4% | 25 | 120.8 | self-funding |
| Consumer + AI | Q1 | 200.2 | 170.0 | 30.1 | 15.0% | 30 | 60.1 | self-funding |
|  | Q4 | 207.4 | 174.5 | 32.9 | 15.9% | 30 | 63.5 | self-funding |
|  | Q8 | 234.9 | 185.6 | 49.3 | 21.0% | 30 | 113.4 | self-funding |
| Enterprise + AI | Q1 | 200.0 | 170.0 | 30.0 | 15.0% | 30 | 60.0 | >40 q |
|  | Q4 | 203.4 | 175.2 | 28.2 | 13.9% | 30 | 55.0 | 30.7 q |
|  | Q8 | 219.1 | 184.1 | 35.0 | 16.0% | 30 | 60.6 | self-funding |
| Enterprise100, weak CS (pinned) | Q1 | 199.7 | 169.9 | 29.8 | 14.9% | 30 | 59.8 | >40 q |
|  | Q4 | 198.8 | 173.3 | 25.4 | 12.8% | 30 | 50.4 | 11.1 q |
|  | Q8 | 198.5 | 177.1 | 21.3 | 10.7% | 30 | 19.7 | 2.3 q |
| AI100, weak Talent/Execution | Q1 | 199.6 | 169.9 | 29.7 | 14.9% | 30 | 59.7 | >40 q |
|  | Q4 | 201.0 | 175.5 | 25.5 | 12.7% | 30 | 49.4 | 11.0 q |
|  | Q8 | 206.5 | 182.0 | 24.4 | 11.8% | 30 | 26.2 | 4.7 q |
| University100, weak Trust | Q1 | 198.7 | 169.7 | 29.0 | 14.6% | 30 | 59.0 | >40 q |
|  | Q4 | 194.1 | 168.5 | 25.5 | 13.2% | 30 | 49.2 | 11.0 q |
|  | Q8 | 189.1 | 167.3 | 21.8 | 11.5% | 30 | 21.3 | 2.6 q |

### Q8 segments and indicators — competitive

| Strategy | Consumer | Enterprise | University | AI-native | Cons/Ent/CS/AI/OrgCap | Retention | Pipeline | Win % | AI adoption | Renewal |
|---|---|---|---|---|---|---|---|---|---|---|
| Consumer100 | 157.8 | 39.7 | 16.0 | 4.0 | 100/30/30/10/60 | 91.2 | 70 | 24.7 | 10.0 | 89.8 |
| Enterprise100 | 138.4 | 48.6 | 16.0 | 4.0 | 55/100/64/10/60 | 84.1 | 155 | 32.6 | 10.0 | 89.8 |
| AI100 | 140.5 | 39.7 | 16.0 | 20.1 | 55/30/30/100/60 | 84.7 | 70 | 24.7 | 62.8 | 89.8 |
| People100 | 142.5 | 39.8 | 16.0 | 4.2 | 55/30/30/10/100 | 85.9 | 70 | 25.8 | 10.0 | 89.8 |
| University100 | 140.9 | 40.7 | 16.9 | 4.0 | 55/30/30/10/60 | 85.9 | 70 | 25.8 | 10.0 | 95.4 |
| Cash100 | 138.1 | 39.7 | 16.0 | 4.0 | 55/30/30/10/60 | 84.1 | 70 | 24.7 | 10.0 | 89.8 |
| Balanced | 152.5 | 42.1 | 16.2 | 11.7 | 89/69/36/54/81 | 91.9 | 115 | 28.9 | 42.3 | 91.4 |
| Consumer + AI | 162.0 | 39.7 | 16.0 | 17.2 | 100/30/30/100/60 | 94.4 | 70 | 24.7 | 57.8 | 89.8 |
| Enterprise + AI | 140.5 | 45.3 | 16.0 | 17.3 | 55/100/48/100/60 | 84.6 | 143 | 33.4 | 58.0 | 89.8 |
| Enterprise100, weak CS (pinned) | 138.4 | 40.1 | 16.0 | 4.0 | 55/100/20/10/60 | 84.1 | 127 | 25.0 | 10.0 | 89.8 |
| AI100, weak Talent/Execution | 140.0 | 37.6 | 16.0 | 12.9 | 55/30/30/100/60 | 84.6 | 70 | 22.8 | 49.8 | 89.8 |
| University100, weak Trust | 132.3 | 37.7 | 15.1 | 4.0 | 55/30/30/10/60 | 82.3 | 70 | 23.4 | 10.0 | 88.4 |

### Integrated Q1 / Q4 / Q8 — static-neutral

| Strategy | Q | Revenue | Op. cost | Op. profit | Margin | Strategic inv. | Closing cash | Runway |
|---|---|---|---|---|---|---|---|---|
| Consumer100 | Q1 | 200.3 | 170.1 | 30.2 | 15.1% | 30 | 60.2 | self-funding |
|  | Q4 | 206.1 | 171.8 | 34.3 | 16.7% | 30 | 67.9 | self-funding |
|  | Q8 | 219.7 | 176.8 | 43.0 | 19.5% | 30 | 107.0 | self-funding |
| Enterprise100 | Q1 | 200.1 | 170.0 | 30.0 | 15.0% | 30 | 60.0 | self-funding |
|  | Q4 | 201.4 | 174.0 | 27.4 | 13.6% | 30 | 54.6 | 21.3 q |
|  | Q8 | 209.1 | 180.3 | 28.8 | 13.8% | 30 | 44.2 | 36.0 q |
| AI100 | Q1 | 200.0 | 170.0 | 30.0 | 15.0% | 30 | 60.0 | self-funding |
|  | Q4 | 204.9 | 176.4 | 28.5 | 13.9% | 30 | 55.5 | 36.8 q |
|  | Q8 | 218.6 | 185.4 | 33.2 | 15.2% | 30 | 58.5 | self-funding |
| People100 | Q1 | 200.1 | 170.0 | 30.0 | 15.0% | 30 | 60.0 | self-funding |
|  | Q4 | 201.0 | 175.7 | 25.3 | 12.6% | 30 | 50.5 | 10.9 q |
|  | Q8 | 204.8 | 184.2 | 20.7 | 10.1% | 30 | 19.7 | 2.1 q |
| University100 | Q1 | 200.0 | 170.0 | 30.0 | 15.0% | 30 | 60.0 | self-funding |
|  | Q4 | 200.9 | 170.2 | 30.6 | 15.3% | 30 | 61.1 | self-funding |
|  | Q8 | 204.8 | 171.5 | 33.4 | 16.3% | 30 | 69.7 | self-funding |
| Cash100 | Q1 | 200.0 | 170.0 | 30.0 | 15.0% | 0 | 90.0 | self-funding |
|  | Q4 | 200.0 | 170.0 | 30.0 | 15.0% | 0 | 180.0 | self-funding |
|  | Q8 | 200.0 | 170.0 | 30.0 | 15.0% | 0 | 300.0 | self-funding |
| Balanced | Q1 | 200.1 | 170.0 | 30.1 | 15.0% | 25 | 65.1 | self-funding |
|  | Q4 | 203.5 | 173.3 | 30.2 | 14.8% | 25 | 79.4 | self-funding |
|  | Q8 | 224.6 | 182.3 | 42.4 | 18.9% | 25 | 125.0 | self-funding |
| Consumer + AI | Q1 | 200.2 | 170.0 | 30.1 | 15.1% | 30 | 60.1 | self-funding |
|  | Q4 | 207.9 | 174.7 | 33.2 | 16.0% | 30 | 64.1 | self-funding |
|  | Q8 | 237.0 | 186.3 | 50.7 | 21.4% | 30 | 117.7 | self-funding |
| Enterprise + AI | Q1 | 200.0 | 170.0 | 30.0 | 15.0% | 30 | 60.0 | self-funding |
|  | Q4 | 203.9 | 175.3 | 28.6 | 14.0% | 30 | 55.7 | 38.5 q |
|  | Q8 | 221.3 | 184.9 | 36.4 | 16.5% | 30 | 65.1 | self-funding |
| Enterprise100, weak CS (pinned) | Q1 | 199.7 | 169.9 | 29.8 | 14.9% | 30 | 59.8 | >40 q |
|  | Q4 | 199.3 | 173.5 | 25.8 | 13.0% | 30 | 51.1 | 12.2 q |
|  | Q8 | 200.5 | 177.7 | 22.8 | 11.4% | 30 | 24.5 | 3.4 q |
| AI100, weak Talent/Execution | Q1 | 199.7 | 169.9 | 29.7 | 14.9% | 30 | 59.7 | >40 q |
|  | Q4 | 201.5 | 175.6 | 25.8 | 12.8% | 30 | 50.1 | 12.0 q |
|  | Q8 | 208.7 | 182.8 | 25.9 | 12.4% | 30 | 30.9 | 7.6 q |
| University100, weak Trust | Q1 | 198.8 | 169.7 | 29.1 | 14.6% | 30 | 59.1 | >40 q |
|  | Q4 | 194.6 | 168.7 | 25.9 | 13.3% | 30 | 49.9 | 12.1 q |
|  | Q8 | 191.3 | 167.9 | 23.4 | 12.2% | 30 | 26.2 | 3.9 q |

### Q8 segments and indicators — static-neutral

| Strategy | Consumer | Enterprise | University | AI-native | Cons/Ent/CS/AI/OrgCap | Retention | Pipeline | Win % | AI adoption | Renewal |
|---|---|---|---|---|---|---|---|---|---|---|
| Consumer100 | 159.7 | 40.0 | 16.0 | 4.0 | 100/30/30/10/60 | 92.0 | 80 | 25.0 | 10.0 | 90.0 |
| Enterprise100 | 140.3 | 48.8 | 16.0 | 4.0 | 55/100/64/10/60 | 85.0 | 156 | 32.9 | 10.0 | 90.0 |
| AI100 | 142.5 | 40.0 | 16.0 | 20.1 | 55/30/30/100/60 | 85.6 | 80 | 25.0 | 62.8 | 90.0 |
| People100 | 144.5 | 40.1 | 16.0 | 4.2 | 55/30/30/10/100 | 86.8 | 80 | 26.1 | 10.0 | 90.0 |
| University100 | 142.9 | 41.0 | 17.0 | 4.0 | 55/30/30/10/60 | 86.9 | 80 | 26.2 | 10.0 | 95.6 |
| Cash100 | 140.0 | 40.0 | 16.0 | 4.0 | 55/30/30/10/60 | 85.0 | 80 | 25.0 | 10.0 | 90.0 |
| Balanced | 154.4 | 42.3 | 16.2 | 11.7 | 89/69/36/54/81 | 92.7 | 120 | 29.1 | 42.3 | 91.5 |
| Consumer + AI | 163.9 | 40.0 | 16.0 | 17.2 | 100/30/30/100/60 | 95.0 | 80 | 25.0 | 57.8 | 90.0 |
| Enterprise + AI | 142.5 | 45.5 | 16.0 | 17.3 | 55/100/48/100/60 | 85.6 | 144 | 33.7 | 58.0 | 90.0 |
| Enterprise100, weak CS (pinned) | 140.3 | 40.2 | 16.0 | 4.0 | 55/100/20/10/60 | 85.0 | 128 | 25.1 | 10.0 | 90.0 |
| AI100, weak Talent/Execution | 141.9 | 37.9 | 16.0 | 12.9 | 55/30/30/100/60 | 85.5 | 80 | 23.1 | 49.8 | 90.0 |
| University100, weak Trust | 134.2 | 38.0 | 15.1 | 4.0 | 55/30/30/10/60 | 83.2 | 80 | 23.8 | 10.0 | 88.5 |

### Stress audit

| Case | Qs | Q8 rev | Final rev | Final Cons/Ent/Univ/AI | Final OP | Margin range | Max qtr growth | Final cash | First neg. cash | Detector hits |
|---|---|---|---|---|---|---|---|---|---|---|
| zero-investment | 16 | 197.7 | 190.7 | 133/38/15.7/4.0 | 23.1 | 12.1–15.0% | -0.04% | 500 | — | none |
| max-investment-broad | 16 | 226.2 | 300.4 | 189/57/18.1/36.3 | 88.6 | 14.5–29.5% | 4.08% | 398 | — | none |
| concentrated-consumer100 | 16 | 217.5 | 231.3 | 174/38/15.7/4.0 | 48.3 | 15.1–20.9% | 1.47% | 232 | — | none |
| concentrated-enterprise100 | 16 | 207.0 | 231.4 | 133/78/15.7/4.0 | 43.5 | 12.7–18.8% | 1.54% | 91 | — | none |
| concentrated-ai100 | 16 | 216.3 | 229.2 | 137/38/15.7/38.8 | 39.9 | 13.8–17.4% | 1.49% | 113 | — | none |
| concentrated-people100 | 16 | 202.5 | 209.1 | 150/39/15.7/4.7 | 21.3 | 8.7–15.0% | 0.46% | -69 | 10 | none |
| concentrated-university100 | 16 | 202.5 | 211.4 | 144/42/21.1/4.0 | 37.6 | 15.0–17.8% | 0.61% | 106 | — | none |
| balanced-16 | 16 | 222.5 | 293.9 | 187/55/17.8/34.7 | 85.8 | 14.6–29.2% | 3.92% | 454 | — | none |
| consumer-ai-16 | 16 | 234.9 | 280.7 | 190/38/15.7/37.2 | 76.2 | 14.8–27.1% | 3.36% | 405 | — | none |
| enterprise-ai-16 | 16 | 219.1 | 258.4 | 137/68/15.7/37.3 | 60.5 | 13.9–23.4% | 2.33% | 220 | — | none |
| switching | 16 | 219.1 | 285.2 | 184/54/16.9/30.7 | 79.1 | 14.4–27.7% | 3.67% | 316 | — | none |
| low-execution | 16 | 215.8 | 278.6 | 186/49/17.8/25.2 | 75.5 | 14.1–27.1% | 3.54% | 367 | — | none |
| low-trust | 16 | 202.3 | 248.5 | 154/47/12.6/34.7 | 58.0 | 11.9–23.4% | 2.79% | 217 | — | none |
| low-talent | 16 | 213.4 | 224.0 | 136/38/15.7/34.0 | 36.4 | 13.2–16.2% | 1.25% | 81 | — | none |
| low-cs | 16 | 200.4 | 218.6 | 133/65/15.7/4.0 | 35.2 | 11.1–16.1% | 1.40% | 13 | — | none |
| saturation | 16 | 316.5 | 393.4 | 220/97/23.1/53.5 | 145.4 | 18.0–37.0% | 6.68% | 1271 | — | none |
| high-capacity | 16 | 229.3 | 303.9 | 191/58/18.3/37.1 | 90.7 | 14.6–29.9% | 4.15% | 423 | — | none |
| low-capacity | 16 | 209.3 | 267.3 | 174/49/17.1/27.3 | 68.6 | 13.7–25.7% | 3.67% | 208 | — | none |
| extreme40-cash100 | 40 | 197.7 | 157.8 | 113/27/13.9/4.0 | -1.8 | -1.1–15.0% | -0.04% | 757 | — | none |
| extreme40-consumer100 | 40 | 217.5 | 215.0 | 170/27/13.9/4.0 | 35.9 | 15.1–20.9% | 1.47% | 571 | — | none |
| extreme40-enterprise100 | 40 | 207.0 | 240.1 | 113/109/13.9/4.0 | 48.1 | 12.7–21.0% | 1.54% | 569 | — | none |
| extreme40-ai100 | 40 | 216.3 | 207.9 | 116/27/13.9/51.2 | 26.0 | 12.5–17.4% | 1.49% | 225 | — | none |
| extreme40-people100 | 40 | 202.5 | 191.2 | 144/28/13.9/5.1 | 8.2 | 4.3–15.0% | 0.46% | -376 | 10 | none |
| extreme40-university100 | 40 | 202.5 | 202.2 | 132/36/29.7/4.0 | 30.8 | 15.0–18.3% | 0.61% | 265 | — | none |
| extreme40-balanced | 40 | 222.5 | 402.6 | 225/96/26.6/54.9 | 146.0 | 14.6–36.3% | 3.92% | 2828 | — | revenue-scale ×2 |
| extreme40-broad6x5 | 40 | 226.2 | 411.3 | 227/102/27.1/55.5 | 150.3 | 14.5–36.5% | 4.08% | 2739 | — | revenue-scale ×5 |
| extreme40-consumerAi | 40 | 234.9 | 291.3 | 199/27/13.9/51.2 | 77.9 | 14.8–28.2% | 3.36% | 1655 | — | none |
| extreme40-enterpriseAi | 40 | 219.1 | 290.4 | 116/109/13.9/51.2 | 79.1 | 13.9–27.5% | 2.33% | 1334 | — | none |
| extreme40-static-consumer100 | 40 | 219.7 | 263.3 | 203/40/16.0/4.0 | 64.8 | 15.1–24.6% | 1.65% | 1022 | — | none |
| extreme40-static-ai100 | 40 | 218.6 | 251.0 | 144/40/16.0/51.2 | 52.0 | 13.9–20.7% | 1.68% | 640 | — | none |
| extreme40-static-consumerAi | 40 | 237.0 | 331.9 | 225/40/16.0/51.2 | 102.1 | 14.9–30.8% | 3.57% | 1994 | — | none |
| extreme40-static-cash100 | 40 | 200.0 | 200.0 | 140/40/16.0/4.0 | 30.0 | 15.0–15.0% | 0.00% | 1260 | — | none |

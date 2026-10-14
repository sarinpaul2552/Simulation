# Batch 10F — Economic validation (V3)

**Source:** `docs/v3lab/tables.md` (T1–T12) and `docs/v3lab/results.json`. Regenerate with:

```
V3LAB_WRITE=1 npx vitest run scripts/lab/v3/lab.test.ts
```

Every game is a full eight-quarter game played through the production adapters, so the same validation runs as in the classroom.

Assessment is against the hypotheses in `docs/BATCH10_V3_VALIDATION_PLAN.md` (H1–H13), which define success as **credible, context-dependent consequences, not parity**.

## 1. Integrity (automated, every run)

| Check | Result |
|---|---|
| V2 engine and adapter unchanged since `003f697` | Pass (asserted by two test files) |
| Accounting identity in every quarter of every game: V2 and V3; paths A, B, C; default policy and maximum expansion | Pass |
| Every snapshot replays exactly | Pass |
| V3 with all mechanisms off equals V2, state for state | Pass |
| Determinism: identical inputs give identical metrics | Pass |
| **Impossible states** — 17 strategies × 3 paths × 2 policies. Checked: capabilities in [0, 125]; culture in [0, 100]; segment revenue ≥ 0; ownership in (0, 1]; finite cash; quarterly price move ≤ the documented 20% limit | Pass, none found |
| Insolvency under the default policy, any path | 0 games |
| Cash flows | Every quarter: the contract cost is counted once (claim test); expansion is funded only by net new capital (round-trip test); the cash bridge reconciles (browser assertion on every results screen) |

## 2. Hypotheses

| # | Hypothesis | Evidence | Verdict |
|---|---|---|---|
| H1 | AI importance becomes market-dependent | AI-only rank: A 15/21, B 17/21, C 17/21. AI-led: rank 4 of 17 in path A (target top-3). Every top allocation still includes AI. The AI marginal is the only positive operating-profit bucket in every path (+$3–10M), but it no longer raises the price at the margin (−$0.1 to −$3.5). | **Partly met.** AI-only is no longer dominant. AI-led is fourth, not top-3, in path A. AI remains valuable everywhere, as a capability rather than a winning formula. |
| H2 | Enterprise viable where conditions support it | Path B, among the named strategies: path-reading adaptive first, Enterprise + AI second, Premium builder third. Enterprise-led Enterprise revenue +72% ($69M). Enterprise-only rank 14/21, not last. | **Met** |
| H3 | University produces measurable revenue within the game | University-only $20.4M (+27%); University-led $19.6M (+23%); visible from Q5; largest step +$2.1M (limit +$4M) | **Met** (University-led just under the +25% mark) |
| H4 | Layoffs are a real choice | Deep cut vs protect (8 strategies): price −$19.3 to +$3.7 (6 of 8 negative; V2 was positive for 7 of 8); cumulative operating profit +$29–43M; CFO score up; culture −13 to −26. The design target was a healthy-company price advantage ≤ +$3; University-led is +$3.7. The Q12 check cannot be run (eight-quarter scope). | **Largely met**; one strategy slightly above the price target |
| H5 | People is worth funding under high load | The marginal $5M to People is the only positive-price bucket in path A (+$1.6). Overload erodes culture for broad plans (Diversified ends with culture 55). No separate paired test at load ≥ 0.8. | **Partly evidenced** |
| H6 | The contract has a real opportunity cost | Accept minus decline: Enterprise-led +$14.8, Enterprise-only +$11.8, Consumer-led −$6.8, AI-led +$0.7. Q5 outflow never exceeds the budget. | **Met** |
| H7 | Financing used selectively | The default policy never expands (0%). Maximum expansion lowers the price for every strategy tested and cuts net cash by about $30M per $5M of X. No insolvency. | **Met** |
| H8 | Recession stance is a genuine choice | The best stance by measure: protect → price, terminal and organization; slow → cash, terminal and organization; deep cut → cash, operating profit and price (one strategy); freeze → price and terminal. No stance wins all four of price, terminal, organization and cash for any strategy. Every stance is feasible, because the freeze moves People to cash. The targeted cut is never best on any measure. | **Met** |
| H9 | No universal winning formula | The best constant allocation differs by path: A Consumer + AI + People; B Enterprise + AI + People; C Consumer + AI + People, with the University and Enterprise variants $18 behind. Price-ranking Spearman A–B 0.94, A–C 0.95, B–C 0.90 (target A–C ≤ 0.7). | **Partly met.** The top allocation changes, but the overall ranking is stable across paths. |
| H10 | Adaptation pays | The path-reading adaptive team is the top named strategy and rank 2 overall in all three paths. Wrong-way is below the median everywhere (ranks 12, 16, 14 of 21). | **Met** |
| H11 | Insolvency only through risky choices | 0 default-policy insolvencies. The maximum-expansion policy shows lower prices and negative net cash, but no insolvency in eight quarters. | **First half met**; no tested policy reached insolvency |
| H12 | Saturation warning before waste | 9 of 10 wasting single-bucket games warn in an earlier quarter | **Met** (≥ 90%) |
| H13 | Teachability | The false "Culture paid for it" claim is replaced in V3 by recorded overload, recovery and strain values. The new contract, stance, expansion and ceiling consequence lines read recorded values only. | **Met** (manual review; no automated claim mapper) |

## 3. Dominant strategies and arbitrage

- **No single strategy dominates on every measure in any path.**
  - Path A: price leader "Consumer + AI + People focus" ($157.1); terminal leader the same; executive team score Adaptive.
  - Cumulative operating profit and cash leaders differ from the price leaders.
  - The dominant *pattern* is "AI + People + one focused market with the aligned destination". That is economically credible (AI is table stakes; capacity limits change; focus raises ceilings) and is what the debrief should discuss.
- **Arbitrage found and closed in 10F:**
  1. **Borrow-and-repay round trip.** Debt drawn and repaid in the same quarter could fund an expansion without new capital. It is now netted (`checkExpansion`), with a test.
  2. **"Slow" stance plus financed expansion.** This combination declared slowing while spending more. It is now rejected.
- **Arbitrage examined and not found:**
  - contract cost avoided by holding a reserve (the reserve is not spent);
  - freeze used to keep People spending (the engine rejects it; the UI moves People to cash);
  - expansion in Q8 (refused);
  - expansion beyond debt capacity (refused by financing limits);
  - share-price jumps (bounded at 20% a quarter).

## 4. Capability investments without meaningful returns

- From a balanced base, the marginal $5M to Consumer, Enterprise and University lowers the Q8 price in every path (T12). Within eight quarters, the buckets that build slowly (Enterprise pipeline, University partnerships) do not pay back at the margin from a balanced position. Their value shows in the focused strategies and in path B.
- This is a property of the eight-quarter horizon, not an accounting error.
- It is recorded as a known limitation. Changing it would be the "redesign because one strategy performs better" the brief rules out.

## 5. Conclusion

| Area | Status |
|---|---|
| Accounting | Sound |
| V2 | Preserved |
| V3 mechanisms | Work as designed |
| Arbitrage | Two holes closed |
| Most hypotheses (H2, H3, H6, H7, H8, H10, H12, H13) | Met |
| H1, H4, H5, H9 | Partly met |
| H11 | Half met |

The largest open item is cross-path ranking stability (H9). Paths change the best focus and reward reading the evidence, but they do not reorder the whole field.

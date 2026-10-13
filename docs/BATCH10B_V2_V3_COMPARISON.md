# Batch 10B — V2 vs V3 comparison

Same market (path A = the V2 arc), same player, same policies, same 17 strategies, eight quarters, played through the production adapters.

| Engine | Valuation | Executive scoring |
|---|---|---|
| V2 (frozen) | NXLN-VAL-1.0 | NXLN-EXEC-1.1 |
| V3 (`v3-econ-1.0`) | NXLN-VAL-1.1 | NXLN-EXEC-1.1 |

Full tables: `docs/v3lab/tables.md`. Raw data: `docs/v3lab/results.json`.

**Parity is not the goal.** The question is whether each difference is the one a mechanism was designed to create, and whether anything else moved.

## 1. Headline comparison (Q8)

| Strategy | Category | V2 price (rank) | V3 price (rank) | Δ | V2 → V3 revenue | V2 → V3 cumulative operating profit | V2 → V3 terminal | V3 culture |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Premium builder | People-heavy | 152.6 (1) | 152.3 (1) | −0.3 | 232 → 229 | 274 → 273 | 80.6 → 79.7 | 69 |
| Adaptive | Adaptive | 148.8 (2) | 150.3 (2) | +1.4 | 233 → 233 | 262 → 270 | 80.3 → 80.1 | 68 |
| Enterprise + AI | Enterprise-heavy | 145.3 (4) | 145.2 (3) | −0.1 | 229 → 230 | 254 → 267 | 75.0 → 75.9 | 67 |
| AI-led | AI-heavy | 148.5 (3) | 143.1 (4) | −5.4 | 235 → 229 | 278 → 273 | 80.5 → 78.6 | 69 |
| Balanced | Diversified | 136.9 (6) | 140.2 (5) | +3.3 | 218 → 218 | 247 → 251 | 76.8 → 76.8 | 69 |
| Diversified | Diversified | 143.8 (5) | 136.8 (6) | −6.9 | 226 → 224 | 273 → 275 | 76.7 → 70.2 | 55 |
| University-led | University-heavy | 110.9 (11) | 127.0 (7) | +16.1 | 198 → 203 | 214 → 228 | 63.7 → 68.3 | 72 |
| Wrong-way | Deliberately weak | 128.9 (7) | 121.7 (8) | −7.1 | 219 → 217 | 255 → 255 | 67.6 → 65.3 | 61 |
| University-only | University-heavy | 111.1 (10) | 121.6 (9) | +10.5 | 191 → 196 | 219 → 233 | 60.9 → 63.3 | 71 |
| Consumer-led | Consumer-heavy | 116.2 (9) | 118.3 (10) | +2.0 | 212 → 213 | 250 → 255 | 68.1 → 68.3 | 72 |
| AI-only | AI-heavy | 127.3 (8) | 117.5 (11) | −9.8 | 221 → 214 | 258 → 250 | 69.3 → 67.0 | 70 |
| Enterprise-led | Enterprise-heavy | 81.8 (14) | 112.6 (12) | +30.8 | 198 → 211 | 200 → 221 | 58.6 → 68.9 | 72 |
| Consumer-only | Consumer-heavy | 109.9 (12) | 107.3 (13) | −2.6 | 204 → 204 | 257 → 261 | 61.8 → 61.9 | 71 |
| Enterprise-only | Enterprise-heavy | 74.7 (15) | 104.1 (14) | +29.3 | 193 → 208 | 197 → 226 | 51.7 → 61.2 | 70 |
| Cash preservation | Cash preservation | 102.8 (13) | 100.3 (15) | −2.6 | 196 → 195 | 223 → 226 | 64.4 → 64.1 | 70 |
| People-only | People-heavy | 74.0 (16) | 79.8 (16) | +5.7 | 194 → 196 | 193 → 187 | 53.8 → 56.1 | 68 |
| All reserve | Deliberately weak | 73.8 (17) | 73.2 (17) | −0.6 | 180 → 180 | 198 → 202 | 51.8 → 51.8 | 70 |

- **Price ranking correlation V2 → V3 (Spearman): 0.95.**
- **Top by price:** Premium builder in both.
- **Top by terminal score:** V2 Premium builder; V3 Adaptive.
- **Top by cumulative operating profit:** V2 AI-led; V3 Diversified.

## 2. What changed, and whether it was intended

| Change | Intended? | Cause (mechanism attribution, T4) |
|---|---|---|
| AI-only −$9.8, AI-led −$5.4 | **Yes** (AI dominance) | E1 alone: −$6.3 / −$5.0. AI-native revenue is $33–34M instead of $39M. |
| Enterprise-only +$29.3, Enterprise-led +$30.8 | **Yes** (Enterprise conversion) | E2 alone: +$17.9 / +$25.1. Enterprise revenue $50–52M → $62–65M. The E5 claim adds +$1.2 / +$0.6 by keeping the contract affordable without over-investing in a saturated bucket. |
| University-led +$16.1, University-only +$10.5 | **Yes** (University conversion) | E3 alone: +$7.4 / +$10.4. University revenue $15M → $19.6–20.4M. |
| Diversified −$6.9, Wrong-way −$7.1 | **Yes** (organizational health) | E4 alone: −$4.2 / −$2.6. Three or more simultaneous initiatives push load above 0.6 of capacity; culture falls to 55 / 61. |
| Balanced +$3.3, Adaptive +$1.4 | Side effect of E2 and E3, which is acceptable | Both hold some Enterprise and University. |
| Consumer strategies ±$2.6 | Neutral in path A | E2 and E3 each cost about $1 for strategies that do not use them, because the competitor benchmarks and the market are shared. |
| Cash preservation −$2.6; All reserve −$0.6 | Correct: hoarding stays unrewarded | — |
| Small negative shifts of about −$1 for strategies that do not use a mechanism | Expected | VAL-1.1 reweights profitability and financial health (.25 → .20, .15 → .12) to fund the organization factor. |

No unintended movement over $3 was found that could not be traced to a mechanism.

## 3. Economic identity and integrity checks

| Check | V2 | V3 |
|---|---|---|
| Accounting identity, every quarter of every game | holds | holds |
| Snapshot replays exactly | yes | yes |
| V3 with all mechanisms off equals V2 (state-for-state) | — | yes, for all 17 laboratory strategies and all 22 Test Lab arc strategies |
| Frozen V2 engine and adapter vs `003f697` | no diff | — |
| Contract cost counted once (Q5 investment + implementation ≤ $30M) | n/a | yes (`v3mechanisms.test.ts`) |
| Expansion funded only by capital raised that quarter | n/a | yes (engine rule, tested) |

## 4. Dominance investigation

### Marginal $5M from a balanced base ($6M in each bucket, Balanced Marketplace), Q8 (T10)

| +$5M to | V2 Δ price | V3 Δ price | V2 Δ cumulative OP | V3 Δ cumulative OP |
|---|---:|---:|---:|---:|
| Consumer | −6.4 | −9.5 | −0.9 | −2.6 |
| Enterprise | −11.4 | −10.6 | −18.8 | −14.8 |
| AI/Product | **+3.9** | −0.1 | **+15.4** | **+10.3** |
| People | −4.2 | **+1.6** | −8.5 | −7.1 |
| University/Credentials | −5.4 | −3.5 | −9.1 | −7.3 |

**V2.** AI was the only bucket that raised both price and profit at the margin, the core of "AI dominance".

**V3:**
- AI no longer raises the price at the margin, but it remains the best operating-profit bucket in path A, an AI-disruption market.
- People becomes the only positive-price bucket, because organizational health is now priced and protects execution.
- No bucket dominates both measures.

### Across market variants (T6)

- The best strategy is Premium builder or Adaptive in every variant.
- AI-only ranges from rank 10 to rank 15 (no AI disruption).
- No single-bucket strategy is top-five anywhere.

### Executive scores (T3)

- The V3 team-mean leader is Adaptive (76.7).
- Enterprise strategies gain 12 points each, from 43.0/48.9 to 55.0/61.5.
- Diversified loses 2.8, because its People score falls from 62.9 to 53.5 when the organization is overloaded.

## 5. What V3 does not change in path A

- The broad shape of the ranking: AI-combined and adaptive play are at the top; single-bucket, cash-hoarding and People-only play are at the bottom.
- Consumer strategies remain mid-to-low in an AI-disruption market.
- Making strategies context-dependent across markets is the purpose of the authored paths (10D). It is measured in 10F, not here.

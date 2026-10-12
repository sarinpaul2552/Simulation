# Batch 8.1 — Strategy and share-price calibration

## How the evidence was produced

- **28 strategies.** The 15 Batch 8 strategies plus 13 added for coverage gaps, defined in `src/production/v2/testing/auditStrategies.ts`.
- **Valid decisions only.** Every strategy uses decisions available through the existing engine, played by the Test Lab arc runner and replayed through the production path. Outcomes are whatever the frozen engine produced; nothing is manufactured.
- **Full data:** `docs/BATCH8_1_AUDIT_DATA.md`. Section 1 gives Q8 outcomes and executive scores; section 2 gives quarterly revenue, profit, cash and share-price trajectories; sections 9–11 cover dynamics and diversity.

## 1. Strategies tested and Q8 outcomes

AI share is the AI/Product share of recorded strategic investment. It includes extra Q8 envelope the engine assigns under some final options, so Cash100 shows 21%. Executive scores are functional (v1.1).

| Required scenario | Strategy | AI share | Revenue | Op. profit | Cash | Liquidity | Share price | Terminal | CEO / CFO / CPO / CGO / CPeO |
|---|---|---:|---:|---:|---:|---|---:|---:|---|
| Hold most capital as cash | Cash100 | 21% | $180M | $17M | $242M | healthy | $74 | 52 | 46 / 48 / 50 / 27 / 50 |
| Hold most capital as cash | Hold $24M, $6M Consumer | 4% | $190M | $24M | $216M | healthy | $90 | 60 | 65 / 56 / 50 / 39 / 52 |
| Conservative financial management | Conservative spender | 25% | $181M | $30M | $203M | healthy | $96 | 54 | 63 / 65 / 57 / 34 / 36 |
| Concentrate on Consumer | Consumer100 | 3% | $204M | $35M | $56M | healthy | $110 | 62 | 74 / 68 / 51 / 54 / 58 |
| Concentrate on Enterprise | Enterprise100 | 0% | $193M | $22M | $25M | watch | $75 | 52 | 70 / 38 / 46 / 40 / 41 |
| Concentrate on AI/Product | AI100 | 97% | $221M | $39M | $60M | healthy | $127 | 69 | 87 / 69 / 79 / 43 / 59 |
| Concentrate on People | People100 | 0% | $194M | $18M | $25M | watch | $74 | 54 | 74 / 35 / 66 / 43 / 51 |
| Concentrate on University/Credentials | University100 | 0% | $191M | $25M | $37M | watch | $111 | 61 | 71 / 54 / 60 / 43 / 53 |
| Diversified allocation | Balanced ($5M each + reserve) | 20% | $218M | $39M | $90M | healthy | $137 | 77 | 86 / 67 / 78 / 63 / 74 |
| Aggressive growth with financing | Aggressive spender | 33% | $240M | $51M | $117M | healthy | $156 | 79 | 75 / 76 / 74 / 72 / 63 |
| Early investment, then pivot | Consumer + AI → Enterprise at Q4 | 33% | $227M | $46M | $80M | healthy | $146 | 76 | 88 / 77 / 72 / 65 / 59 |
| Delayed investment, catch-up | Cash Q1–Q3 → $15M Consumer + $15M AI | 45% | $201M | $29M | $88M | healthy | $117 | 70 | 73 / 56 / 71 / 46 / 65 |
| Strong early growth into the recession | Consumer + Enterprise, no recession action, accepts contract | 0% | $214M | $35M | $38M | watch | $113 | 60 | 59 / 63 / 49 / 59 / 59 |
| Weak early, then recovery | University Q1–Q3 → diversified | 13% | $198M | $25M | $26M | watch | $102 | 61 | 74 / 45 / 68 / 51 / 67 |
| High investment with execution overload | $10M each Consumer/Enterprise/AI, no People, accepts contract | 33% | $236M | $49M | $62M | healthy | $154 | 78 | 94 / 75 / 72 / 71 / 63 |
| Becomes insolvent | $30M Enterprise, accepts contract, refuses financing | 0% | $199M | $31M | **−$6M** | **insolvent** | $58 | 30 | 30 / 30 / 46 / 43 / 44 |
| Survives but destroys value | Cash100 |  |  |  |  |  | $74 | 52 | 46 / 48 / 50 / 27 / 50 |
| Raises value, weakens the organization | Consumer + AI + Enterprise, deep cuts in recession | 40% | $228M | $63M | $119M | healthy (culture 51, talent 37) | **$162** | 69 | 88 / 95 / 72 / 68 / 35 |
| Improves the organization, sacrifices profit | People100 | 0% | $194M | $18M | $25M | watch (talent 120) | $74 | 54 | 74 / 35 / 66 / 43 / 51 |
| Succeeds without AI dominant | Balanced (20% AI) and Evidence-responsive (23% AI) | ≤ 25% | $218–233M | $39–47M |  | healthy | **$137–$149** | **77–80** | 86 / 67 / 78 / 63 / 74 · 94 / 72 / 76 / 70 / 74 |
| Succeeds with no AI at all | Consumer-led, no AI spend | 1% | $210M | $34M | $43M | healthy | $115 | 67 | 78 / 65 / 56 / 64 / 74 |

The table also covers the paired strategies (Consumer + AI $165, Enterprise + AI $145), capability-led strategies (Premium $153, Credential $107), the adaptive contrarian strategy ($129), the distress test (People, refuses financing, $60) and three more zero-AI specialisations (Enterprise $95, University $101, Diversified $111).

## 2. Share-price audit (NXLN-VAL-1.0, unchanged)

| Check | Result | Evidence |
|---|---|---|
| Deterministic | Yes | Identical paths on replay (tests) |
| Reproducible from recorded results | Yes | Pure function of replayed states |
| No look-ahead | Yes | The price at quarter q computed from results up to q equals the price in the full history, for every quarter of 12 strategies (test) |
| Bridge reconciles | Yes, exactly | All quarters of all 28 strategies, including insolvency (to 1e-9; display rounding sums exactly) |
| AI rewarded for being AI | No | AI capability counts only when the chosen strategy relies on it (test). AI-dominant AI100 ends at $127, below five strategies with 20–49% AI. |
| Idle cash creates value | No | No credit above $40M; Cash100 $74, cash-mostly $90 |
| Liquidity protection recognised | Yes | Cash below $40M lowers the financial factor (test) |
| Insolvency | Consistent | Distress discount and financial factor; the insolvent run ends at $58, below every solvent run |
| Financing, dilution and leverage | Represented | Debt in the financial factor; ownership^0.6 dilution line in the bridge |
| Duplicates the terminal score | Related, not duplicated | Pearson 0.91 at Q8, but they diverge where they should: the strategy that cut the organization ranks #2 on price ($162) but mid-table on the terminal score (69) |

**Feedback speed.** This is a finding to bring to the product owner, not a defect:

| Quarter | Mean absolute quarterly move | Price spread across strategies |
|---|---:|---|
| Q1 | 0.4% | $100–$101 |
| Q2 | 1.6% | $97–$101 |
| Q3 | 2.7% | $94–$107 |
| Q4 | 4.3% | $91–$120 |
| Q8 | 8.0% | $58–$165 |

Prices barely separate in Q1–Q2, because the engine's results barely separate. Capability matures over one to three quarters, and revenue and profit move little in the first two quarters. The price faithfully reflects that. Making it move more would require arbitrary volatility (rejected) or pricing expectations more aggressively. Students should be told that early quarters are about building; the Level 1 briefing's board question and the capability development carry the early feedback instead.

## 3. Strategic diversity

| Destination | Strategies | Best share price | Best terminal | Range |
|---|---:|---:|---:|---|
| Consumer AI | 8 | $165 | 82 | $110–$165 |
| Enterprise AI | 8 | $154 | 80 | $58–$154 |
| Premium Human + AI | 3 | $153 | 81 | $60–$153 |
| Balanced marketplace | 6 | $137 | 77 | $74–$137 |
| University/Credential infrastructure | 3 | $111 | 63 | $101–$111 |

| AI share of investment | Strategies | Best share price | Best terminal | Median price |
|---|---:|---:|---:|---:|
| 0–5% (no AI) | 13 | $115 | 69 | $101 |
| 5–30% (AI as one of several) | 5 | $149 | 80 | $102 |
| 30–60% | 8 | $165 | 82 | $154 |
| 60%+ (AI-dominant) | 2 | $129 | 69 | $129 |

**Conclusions**
1. **Several approaches succeed.** Four destinations reach a terminal score of 77–82 and a share price of $137–$165, with different capital needs, risks and organizational consequences:
   - Consumer AI: fastest commercialisation, highest price.
   - Enterprise AI: slower build, contract exposure.
   - Premium: people-intensive, highest Product score.
   - Balanced: lower risk, coordination cost.
2. **A non-AI-dominant strategy can succeed.** Balanced (20% AI) and Evidence-responsive (23% AI) are in the top tier. AI-dominant investment (AI100, 97%) ends mid-table ($127).
3. **No AI at all caps the outcome at mid-tier.** The best zero-AI strategy reaches $115 / terminal 69, against $165 / 82 at the top. This comes from the frozen economics: four of five destinations count AI/Product as an aligned capability, and readiness drivers include AI. AI is therefore a strong complement, not the only path. This is reported, not changed (**product-owner decision**).
4. **University/Credential infrastructure is the weakest destination** in the frozen economics: best terminal 63 and best price $111 across three different approaches. It is sticky and resilient but slow. This is also reported, not changed (**product-owner decision**).
5. **Disproportionately rewarded.** None dominates every lens. The cost-cutting variant of Consumer + AI gets the second-highest price ($162) while damaging the organization. The terminal score (69), People scorecard (35) and board verdict (organization: Weak) all flag it, so the separate lenses work as intended.

## 4. What was not changed

- The valuation model (NXLN-VAL-1.0).
- All engine parameters, investment returns, market dynamics, crises, maturation, financing and terminal scoring. The engine diff against `003f697` is empty.

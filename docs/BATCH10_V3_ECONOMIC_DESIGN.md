# Batch 10 — NexLearn V3 economic design

**Status:** proposed design. None of these changes is implemented. The frozen V2 engine is untouched.

**Evidence labels** are as in the educational review:
- **[Code]** verified in source;
- **[B9]** Batch 9 laboratory;
- **[B10-D]** Batch 10 diagnostics on the frozen V2 engine (`docs/batch10/diagnostics.json`);
- **[Proposed]** design;
- **[Hypothesis]** expected, untested.

The [B10-D] experiments *emulate* some proposals with existing V2 inputs. They show direction and magnitude, but they are not V3 results.

## 0. Design stance

The goal is **economically credible, context-dependent trade-offs**. Equal returns are not the goal. A change is justified only if it does one of these things:

- (a) corrects a mechanism that is not credible as business economics;
- (b) gives an executive's legitimate argument real consequences;
- (c) creates an opportunity cost that the lesson requires.

Batch 9's calibration package (PR) is **not** adopted as-is. It is used as evidence that the conversion levers work. Several proposals below replace calibration with a mechanism.

**Constraints:**
- V2 stays frozen.
- V3 is a **separate engine version** (section 11).
- The starting company, including the revenue mix, is unchanged.
- The executive scorecards (NXLN-EXEC-1.1) are unchanged.
- One valuation change is proposed with evidence (E9).

## 1. Current economic weaknesses (summary)

| # | Weakness | Evidence |
|---|---|---|
| 1 | AI-native revenue compounds as a per-quarter flow. New monetization is added every quarter in proportion to the adoption level (`0.08 × (adoption − 10) × demand × quality`), and churn is low. AI-only's AI-native revenue goes $4M → $39M by Q8, with **$8.8M of new revenue added in Q8 alone against $1.3M churn**. | [Code] `src/simulation/engineV2Revenue.ts:362–368, 483–491`; [B10-D] D1 path |
| 2 | AI is the best marginal investment in **all ten market scenarios**. Even with no AI disruption it adds the most revenue (+$15.6M); only then does Consumer match it on profit (+$22.6M vs +$19.7M). | [B10-D] D1 |
| 3 | Enterprise capability does not convert. Capability goes 30 → 120 while the win rate moves 25% → 29% and revenue $40M → $46M. A recurring 4% commitment makes the marginal profit negative (−$7.4M). Demand ×1.2 adds $3. | [B9]; [B10-D] D1 |
| 4 | University revenue stays at about $15–17M through Q12, even with double the market capacity and 1.3× demand. The binding constraint is conversion: the institutional win rate depends only on Trust, and wins go live over Q+2 to Q+5. | [B10-D] D7; [Code] `engineV2Revenue.ts:352–355`; `:62–69` (recognition) |
| 5 | Organizational health is invisible to the share price. A deep layoff raises the Q8 price for most strategies, entirely through the profitability factor (+$12–14), while culture drops about 20 points and talent 11–17. At Q12 the deep cut still leads on price and cumulative operating profit. | [Code] `insights/valuation.ts:94–111`; [B10-D] D2 |
| 6 | The engine has no overload → culture link, though the results text claims one. | [Code] `engineV2Capabilities.ts:552`; `adapter.ts:539` |
| 7 | Organizational capacity rarely binds. Peak load is 0.43–0.68 of capacity for the main strategies, and absorption losses are small. People's value comes mostly from talent (AI readiness) and premium fit, not from execution capacity. | [B10-D] D3 |
| 8 | The contract costs cash only. It never reduces investment capacity. | [B9]; [Code] `engineV2Opportunity.ts:199, 222` |
| 9 | The recession response is optional. A hiring freeze throws when People is funded. | [Code] `engineV2Management.ts:163`; `adapter.ts:334` |
| 10 | Financing never expands investment. Most strategies never need it. | [B9]; [Code] `adapter.ts:259–263` |
| 11 | Capability saturation wastes 45–55 points for single-bucket plans from Q5–Q7, with no warning. | [B10-D] D5 |
| 12 | One deterministic market path. The ranking of strategies is identical in 9 of 10 Batch 9 variations. Enterprise-only and Enterprise-led never move off the bottom two places. | [B9] sensitivity |

## 2. Proposed changes — mechanism level

### E1 · AI-native revenue: adoption sets a revenue *level*, not a perpetual flow [Proposed]

- **Mechanism.** AI-native revenue moves part of the way toward a target each quarter:

  `target = base + m × max(0, adoption − 10) × demand × quality`

  It moves at speed `s` (e.g. 0.35). So the revenue level tracks the adoption level, instead of adoption adding new revenue every quarter forever.
  - Churn is implicit in the convergence.
  - Capacity still caps it.
  - Readiness, Product Quality and Execution still gate it, so commercialization risk stays.
- **Why.** As a business mechanism, "more adopters → a larger recurring base" is credible. "The same adopters create new revenue every quarter" is not.
- **Educational benefit.** AI stays essential in an AI-driven market, because adoption still drives growth. But its payoff now depends on the demand path, so the Product officer has to argue rather than win by default.
- **Expected consequence [Hypothesis].**
  - AI-led and AI-only still lead in the current "AI-first" path, by a smaller margin.
  - AI returns fall clearly below Consumer and Enterprise+AI in a slow-adoption path.
  - The calibration targets (`m`, `s`) are set in the lab (validation plan, H1).
- **Alternatives considered:**
  - Lower the flow coefficient (Batch 9's 0.08 → 0.05): **rejected as the primary fix**, because the compounding structure stays and only the rate changes.
  - Raise AI churn with adoption: makes the model harder to explain.
  - Add an AI competitor price-compression term in some paths: kept as an option for the market paths (E10).
- **Complexity:** medium. One function in the V3 revenue module, plus calibration.

### E2 · Enterprise: capability converts, bookings land within the game, delivery is a real limit [Proposed]

- **Mechanism:**
  1. **Win rate responds to relative Enterprise capability** (Batch 9 lever `winPerRelCapability` 0.08 → about 0.2–0.3), and pipeline inflow amplitude rises (1.2 → about 2–3).
  2. **Recognition** moves from 25/50/25% over three quarters to 50/50% over two.
  3. **The recurring delivery commitment** drops from 4% to about 2%. It stays a commitment, because implementation teams cost money.
  4. *(Optional, for the "delivery capacity" lesson.)* **New go-live per quarter is capped by Customer Success capability.** This makes CS (Enterprise bucket secondary, contract learning) the limit on how fast bookings convert.
- **Evidence:**
  - Batch 9 package P2/PR moved Enterprise-led from 9th to 5th. Enterprise-only went from $75 to $106 [B9].
  - In the B9 sweep, levers 1–3 together raised Enterprise-only's Q8 Enterprise revenue from $52M to $65M.
- **Educational benefit.** Enterprise becomes a credible slow-payback, recurring-revenue strategy with real implementation constraints, and a real argument for the Growth officer and CEO.
- **Risk.** Enterprise + contract + financing could become dominant once financing expands the envelope (E7). This must be tested jointly (validation H2, H7).
- **Complexity:** low for 1–3 (calibration in the V3 fork); medium for 4.

### E3 · University: Credential drives institutional wins; partnerships land within the game [Proposed]

- **Mechanism:**
  1. **The institutional win rate depends on relative Credential capability as well as Trust.** Today it depends on Trust only [Code].
  2. **The University pipeline responds more strongly to Credential** (inflow amplitude 0.8 → about 3–4).
  3. **Wins go live over Q+1 to Q+3** instead of Q+2 to Q+5.
- **Evidence.**
  - Market size is *not* the constraint: doubling capacity and raising demand 1.3× moves Q8 University revenue from $15.1M to only $15.4M [B10-D D7].
  - Batch 9's pipeline-only lever moved it to about $16.7M [B9].
  - So the missing link is conversion: Credential → wins.
- **Expected consequence [Hypothesis].** University-led reaches roughly +25–50% University revenue by Q8 (about $20–24M). That is visible, but not instant. The value of the destination stays partly strategic (credential-network spillovers).
- **Alternative considered:** a University partnership *event*, a new Q-decision for credential-strong teams. **Rejected for now**, because it adds a decision. Revisit if 1–3 fail validation.
- **Complexity:** medium. The win-rate function signature gains Credential in the V3 fork.

### E4 · People and organizational health have commercial consequences [Proposed]

- **Mechanism (minimal):**
  1. **Overload erodes culture.** When the load ratio is above about 0.9, culture falls by `k × (ratio − 0.9)`. This makes the existing results text true, and the text should be fixed in V2 now regardless.
  2. **Culture below its starting level slowly reduces Execution and Customer Success**, and therefore absorption, delivery and retention. Culture already scales effective capacity ([Code] `engineV2Capabilities.ts:440–444`); this extends its reach to the commercial capabilities.
  3. **Layoff aftershocks extend to customer-facing capabilities** for two quarters.
- **Evidence:**
  - With a deep cut, culture stays about 20 points lower through Q12.
  - Revenue is only $7–14M lower at Q12, and cumulative operating profit is still about $66–97M higher than with no action [B10-D D2].
  - The organization absorbs the damage almost for free.
- **Educational benefit.** The People officer's warnings carry real economic weight. "Short-term savings, long-term cost" becomes visible.
- **Risk.** Making the organization too fragile would turn every recession into an obvious "protect" decision. The target is a real choice: a deep cut should remain attractive for a cash-strained team, and become a net loss over the long run for a healthy one (validation H4).
- **Complexity:** medium.

### E5 · Contract upfront cost is a claim on the strategic envelope [Proposed]

- **Mechanism.** When the team accepts, the implementation + customization cost is deducted from that quarter's $30M envelope. The cost is recorded **once**, as a strategic-investment line ("Contract implementation"), and **not** as an event cost. This avoids double counting in the cash bridge. The delivery team stays a recurring operating commitment.
- **Emulation [B10-D D4].** The emulation moves the upfront amount out of the Q5 investment into reserve, keeping total Q5 outflow at $30M.

  | Measure | Accept (envelope claim) vs accept (V2) |
  |---|---|
  | Q8 price | −$0.1 to −$1.9 |
  | Terminal score | about the same |
  | Net cash | +$7–9M higher for most strategies (less is spent); −$1–2M for Enterprise-led and Consumer-led |

- **Interpretation.** The *economic* effect is modest, because one quarter's lost investment matters little once capabilities saturate. The *decision* effect is large: the contract now visibly costs "$9.6M of your $30M".
  - **Verified V2 behaviour:** the contract adds +$2–7 to the Q8 price for every strategy tested except Consumer-led, where it costs $5.6.
- **Alternative considered:** keep the cash-only cost and display it as a share of the envelope. Weaker, because the trade-off is shown but not felt.
- **Complexity:** low–medium. The V3 adapter computes the envelope, and the V3 ledger gets a category.

### E6 · Mandatory recession stance; every option always feasible [Proposed]

- **Mechanism.** In Q6 the team must choose one stance:
  - **Protect:** keep investing. The CFO's forecast is shown, and the team acknowledges it.
  - **Slow:** move at least $5M of planned investment to reserve.
  - **Cut:** any of hiring freeze, targeted reduction, deep reduction or marketing cut.

  If People investment is planned, a hiring freeze automatically **moves the People allocation to reserve** (shown to the team), instead of throwing.
- **Emulation [B10-D D6].** "Freeze + People to reserve" is feasible for every People strategy. It is often the best or near-best on both price and terminal score (University-led: $116.8 vs $110.9; terminal 66.5 vs 63.7).
  - **Protect** and **Slow** are nearly identical in outcome today, because of saturation.
  - **Deep cut** gives the highest CFO score and price (before E9) but the lowest People score and organizational score.
- **Educational benefit.** Every team must articulate a recession stance. The three stances produce distinct, defensible profiles across the CFO and People scorecards.
- **Complexity:** low. V3 adapter and UI only, apart from the freeze conversion.

### E7 · Financing can expand current-quarter investment, within limits [Proposed]

- **Mechanism:** `Envelope(t) = $30M + min(X, new capital raised in quarter t)`, for Q2–Q7. Q8 options keep $45M and $60M. Every dollar above $30M must be funded by debt drawn or equity issued that quarter. Limits:

  | Limit | How it applies |
  |---|---|
  | Debt | Existing capacity `min(2.5 × annual operating profit, 0.4 × annual revenue) − debt`, and covenants (leverage ≤ 4) [Code `engineV2Financing.ts:211–216, 47`] |
  | Interest | An operating cost; rate rises with leverage [Code :218–223] |
  | Equity | At most 50% of pre-money per raise; dilution flows into the price through `ownership^0.6` [Code :58–59; valuation] |
  | Cash floor | The CFO forecast must show closing cash ≥ $25M after the expanded plan, otherwise the expansion is refused |
  | Absorption | The extra spend adds transformation load; the absorption curve penalizes over-expansion [Code `engineV2Capabilities.ts:272–281`] |

- **X is not fixed.** It is tested at $0, $5M, $10M and $15M (validation H7). Do not assume $15M.
- **Educational benefit.** The CFO has a live decision every quarter: leverage for growth, or financial flexibility. It also gives long-payback strategies (Enterprise, University) a funding path that costs something.
- **Risks:**
  - Runaway spending, mitigated by the cash floor and absorption.
  - Dilution-driven price falls that students do not understand. The valuation bridge already itemizes dilution [Code].
  - Stronger strategies "buying" further dominance.
- **Complexity:** medium. The V3 adapter computes the envelope, plus the UI and validation rules. A lab runner extension is needed first.

### E8 · Saturation warning (qualitative) [Proposed]

- **Mechanism.** A bucket shows "close to what the organization can use" when the targeted capability plus its pending maturation is within about 5 points of its ceiling. No formulas are shown.
- **Evidence.** Single-bucket plans waste 45–55 capability points from Q5–Q7 [B10-D D5].
- **Complexity:** low. UI plus an insight function; it can ship on V2 because it reads state only.

### E9 · Valuation NXLN-VAL-1.1: organizational health enters the share price [Proposed, needs approval]

- **Mechanism.** Add an organizational-health component, culture and talent relative to start, at a weight of about 0.08–0.10. The weight is taken proportionally from profitability and financial health.
- **Calibration target.** It is not "layoffs never pay". The targets are:
  - A deep cut's Q8 price advantage for a healthy company is ≤ +$3.
  - It is negative by Q12.
  - A cash-strained company can still rationally cut.
- **Evidence.**
  - The deep-cut price gain comes entirely from profitability (+$12–14), while culture −20 and talent −11 to −17 are not priced [B10-D D2].
  - Rough sizing: culture 72 → 52 on a 50–80 ramp is −0.67. At weight 0.08 and multiplier 2.4, that is about −$13 a share, which offsets the profitability gain. **[Hypothesis]**: to be calibrated in the lab.
- **Scoring impact.** The executive scores' company component reads the price, so the CFO/People conflict becomes balanced rather than tilted. The scorecard formulas stay unchanged.
- **Complexity:** low code, high sensitivity. It must be versioned (VAL-1.1) and validated across all cohorts.

### E10 · Market paths (scenario uncertainty) [Proposed]

- **Mechanism.** Three authored paths share Q1 and the narrative beats:

  | Path | Description |
  |---|---|
  | **A · AI-first** | The current arc |
  | **B · Enterprise-led AI** | Enterprise AI demand stronger and longer; consumer AI adoption slower; AI-native capacity lower |
  | **C · Slow adoption** | Consumer erosion milder; AI-native demand about 1.0–1.2; enterprise neutral |

- **How it works.**
  - One path per session, the same for every team.
  - It is chosen by the facilitator, or sealed and derived from the session code so it is reproducible.
  - Signals are authored per path, so Q2–Q3 evidence genuinely differs.
  - The Q3 conflicting-signal design is kept in every path.
- **Evidence.** In the "no disruption" variation, the AI marginal profit return falls below Consumer's (+$19.7M vs +$22.6M) and the strategy ranking changes (Consumer-led 4th, Diversified 2nd) [B9, B10-D D1]. So paths change what is wise without randomness.
- **Engine support [Code].** The scenario functions already accept an `arc` parameter (`engineV2Scenario.ts:603–700`), but the production adapter hard-codes the default. V3 needs adapter dispatch and a session scenario field.
- **Fairness.**
  - Within a session, comparison is exact.
  - Across sessions, the path is recorded and shown in the board report.
  - No team is punished for information it could not have: every path's truth is signalled by Q2–Q3, and the Q3/Q4 reveal teaches the reading.
- **Complexity:** medium–high: authoring three arcs plus the signal content, and a migration.

## 3. What does not change

- The starting company and revenue mix (no approval sought).
- The five buckets and the $30M base envelope.
- The eight-quarter narrative.
- Destination definitions.
- Crisis types.
- Q8 options.
- Executive scorecard formulas (NXLN-EXEC-1.1).
- The terminal score.
- The V2 engine, which stays frozen and continues to serve existing V2 sessions.

## 4. Expected consequences (all [Hypothesis] until 10B/10C)

| Strategy family | V2 | V3 expectation |
|---|---|---|
| AI-led / AI-only | Top or near top in every scenario | Top in path A; middle in path C; never automatically best |
| Consumer + AI | Best constant allocation | Strong in A; Consumer-led competitive in C |
| Enterprise-led / Enterprise + AI | 9th and 10th everywhere (Enterprise-only, Enterprise-led) | Competitive in B, with contract and possibly financing; still slower to pay back |
| University-led | Middle on price, no revenue | Visible revenue growth in all paths; strongest relative position in long-horizon readings |
| Cash preservation | Low (hoarding unrewarded) | Unchanged (correct) |
| Adaptive | Wins 8 of 10 scenarios | Should win *across* paths more clearly: the reward for reading evidence |
| Deep cut in recession | Raises price | Small or no price gain; long-term cost visible |

## 5. Implementation complexity and order

| Item | Complexity | Engine fork needed | Can ship on V2? |
|---|---|---|---|
| E8 saturation warning | Low | No | **Yes** (UI/insight) |
| Text fix for "Culture paid for it"; Q6 truth notes | Trivial | No (content), or adapter text | **Yes, but the adapter is frozen.** The results text lives in `adapter.ts`. Fixing it needs either an approved exception to the freeze for text only (no economics), or a V3 adapter. **Product-owner decision.** |
| E5, E6, E7 | Low–medium | V3 adapter | No |
| E1, E2, E3, E4 | Medium | V3 engine fork | No |
| E9 valuation 1.1 | Low code | No (valuation is outside the engine) but versioned | Technically yes; recommended only with V3 |
| E10 market paths | Medium–high | V3 adapter + content + migration | No |

## 6. Risks and unintended consequences

1. **Overcorrection.** AI could become unimportant, or Enterprise dominant. Mitigation: acceptance criteria are about *context-dependence*, not equality (validation plan).
2. **Interaction effects.** E2 + E5 + E7 together might make "Enterprise + contract + leverage" a new universal optimum. Test them jointly.
3. **Teachability.** Every mechanism must be explainable in one sentence on the results screen. E1 and E4 replace hidden formula effects with intuitive ones, which helps teachability.
4. **Two engines to maintain.** V2 and V3 coexist. Mitigation: V3 is a fork with its own tests; V2 is frozen, so the maintenance cost is test runtime only.
5. **Facilitator comparability across sessions** (E10). Mitigation: path shown in the facilitator view and the report; the debrief compares within the session.
6. **Classroom time** (E6, E7 add choices). Mitigation: the stance is one tap; financing uses the existing panel; neither adds a screen.

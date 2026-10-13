# Batch 9 — NexLearn economic balance: decision report

| | |
|---|---|
| Workbook | `docs/batch9/NEXLEARN_ECONOMIC_BALANCE_STUDY.xlsx` (11 sheets, 1,904 formulas, 0 errors) |
| Raw results | `docs/batch9/lab-results.json` |
| Code | `scripts/lab/batch9/` (runner, strategies, experiments, proposals, workbook builder) |
| Verification | `scripts/lab/batch9/lab.test.ts` |
| Engine | V2 frozen engine; no diff against `003f697` |
| Models | Valuation NXLN-VAL-1.0; executive scoring NXLN-EXEC-1.1 |

Nothing in the engine, the production database or the deployed application was changed.

## How the numbers were produced

**One run** is a complete eight-quarter game. Each run goes through the Test Lab arc runner on the frozen engine and includes:
- the market path;
- the Q4 strategic commitment;
- the Q5 contract;
- the Q6 recession response;
- the Q7 crisis;
- the Q8 final option;
- the CFO liquidity forecast and financing.

The share price, executive scores and terminal score come from the production implementations. A test confirms that the lab reproduces the production replay path exactly for all ten strategies: price, executive scores, terminal score and cash.

**What was run (about 19,700 engine runs in total):**
- the ten required strategies plus four supplementary ones;
- every $30M allocation in $5M steps (462 allocations) under all five destinations (2,310 runs);
- ten market scenarios;
- three starting-revenue mixes;
- forced contract, recession and financing variants;
- six candidate calibration changes and seven packages of them.

**Event policy.** Every strategy uses the same event policy, so differences come from investment and destination.

**Market path.** The market path is deterministic: there is one authored scenario. Sensitivity therefore uses explicit market variations through the runner's supported override hook. No random outcomes were invented.

## Answers

### 1. Is Consumer investment disproportionately rewarded?

**Against Enterprise and University, yes. Against AI/Product, no.** Adding $10M a quarter to one bucket, from a light balanced base, gives these effects by Q8:

| Bucket | Q8 revenue | Cumulative operating profit | Q8 share price |
|---|---:|---:|---:|
| AI/Product | +$25.0M | +$44.9M | +$30.3 |
| Consumer | +$8.3M | +$20.2M | +$10.9 |
| People | +$9.7M | +$4.6M | +$11.2 |
| University | +$3.6M | +$6.7M | +$11.5 (through strategic readiness, not revenue) |
| Enterprise | +$2.0M | −$7.4M | +$3.1 |

Consumer outperforms Enterprise and University for three reasons:

1. **It defends the base.** Consumer is 70% of revenue. When a team funds neither Consumer nor People, the AI disruption erodes Consumer revenue by $11–19M by Q8.
2. **It has no ongoing cost.** Consumer investment creates no recurring cost commitment. Enterprise commits 4% of the investment for six quarters, AI 6% for six and People 6% for eight.
3. **It matures fastest.** 50% of the capability gain lands in the quarter invested.

### 2. Does a Consumer-only strategy outperform most alternatives?

**No.**
- **Among the required strategies:** 7th of 10 on Q8 share price ($109.9) and 8th on terminal score (61.8).
- **Across all 462 tested allocations:** 27th percentile on price, 13th on score.
- **Across scenarios:** 6th–7th in all ten market scenarios.
- **Over time:** close to the top only in Q1–Q2 (2nd–3rd, within $1 of the leader), then 5th–7th from Q3.

Consumer is valuable as AI's complement. Consumer + AI ($15M each, Consumer AI destination) is the best constant strategy at $164.5 (99th percentile), and nine of the top ten allocations combine $10–15M Consumer with $10–20M AI.

### 3. Are Enterprise, University and AI commercially viable choices?

**AI: yes, and dominant.**
- **AI is in every winner.** Every destination's best allocation includes $10M AI/Product.
- **Without it, outcomes drop sharply.** The best allocation without AI reaches $116–133; with AI it reaches $156–166.
- **AI-native revenue compounds.** It grows $4M → $39M under AI-only, because new monetization accrues every quarter from the adoption level with little churn.

**Enterprise: not as a lead investment.**
- **The capability is built but not monetized.** Enterprise capability reaches the 120 ceiling. Even so, the win rate moves only 25% → 29% and Enterprise revenue only $40M → $46M ($52M with the contract).
- **It finishes at the bottom everywhere.** Enterprise-only is last and Enterprise-led 9th in all ten scenarios.
- **Extra Enterprise spend lowers the outcome.** Each additional $5M lowers the average Q8 price: $130 at $0 down to $84 at $30M.
- **More demand barely helps.** An Enterprise demand boom adds only $3.
- **It works only paired with AI.** Enterprise + AI + People reaches $148.

**University: viable on share price and score, not commercially.**
- **The capability is built but revenue does not move.** University revenue stays near $16M through Q8 even though Credential reaches 120.
- **Why:** wins go live only 10/30/30/30% over Q+2 to Q+5, and the University market is small (capacity $40M).
- **Where its value comes from:** University-led's $111 comes from strategic readiness and credential-network spillovers.

**Destinations are balanced at their best play.** The best result for each destination falls within $156–166. The imbalance is at the investment-bucket level, not the destination level.

### 4. Does the starting revenue mix create the imbalance, or the investment-return formulas?

**Mostly the formulas; the mix amplifies Consumer over Enterprise.**

**The engine cannot simply take a new mix.** Changing only the four starting revenues produces drift within three quarters with no investment:
- Consumer +$9M (Alternative A) and +$14M (Alternative B);
- AI-native −$3M to −$5M.

This happens because every flow is calibrated to the baseline mix.

**What a valid re-base requires.** Nine constants plus the fixed cost pool must change proportionally (listed on the *Starting revenue distribution* sheet). With them, both alternatives become steady states.

**What the valid re-based runs show (AI growth reward held absolute):**
- **AI/Product is still the top-return bucket in every mix.** It adds +$27–28M of Q8 revenue for $10M a quarter. This is a formula effect.
- **Enterprise's return stays weak.** Cumulative operating profit is still negative at Q8. This is also a formula effect: slow conversion plus cost commitments.
- **Consumer's return shrinks with its base.** Cumulative operating profit falls from +$20M to +$13M to +$10M. This is a mix effect.
- **Enterprise-only improves with a smaller Consumer base.** Its price rises from $75 to $96 (A) and $112 (B), mainly because less revenue is exposed to the consumer-side disruption. This is also a mix effect.

If the AI reward scaled with the AI base instead, AI-led strategies would reach $171–182 and the imbalance would become extreme. Any future mix change should keep the AI reward absolute.

### 5. What is the smallest set of economic changes for credible trade-offs?

The recommended package **PR** has five calibration changes, seven constants in all:

| # | Change | Constant | Current | Proposed |
|---|---|---|---|---|
| 1 | Moderate the AI adoption reward | `revenue.aiNative.monetizationPerPointAbove` | 0.08 | 0.05 |
| 2 | Enterprise capability converts to bookings | `commercial.enterprise.winPerRelCapability` | 0.08 | 0.30 |
| 2 | (same) | `commercial.enterprise.inflowCapabilityAmplitude` | 1.2 | 3.0 |
| 3 | Enterprise bookings go live faster | `revenue.enterprise.recognition` | 25/50/25% over 3 quarters | 50/50% over 2 quarters |
| 4 | Lower Enterprise delivery commitment | `costs.commitments.enterprise.perDollar` | 0.04 | 0.02 |
| 5 | University pipeline responds to Credential | `commercial.university.inflowCapabilityAmplitude` | 0.8 | 4.0 |
| 5 | (same) | `commercial.university.resolutionRate` | 0.2 | 0.4 |

Every change acts only through capability gains, timing or commitments, so the starting company is unchanged (verified by test).

**Tested effects in the authored market:**

| Measure | Now | With PR |
|---|---|---|
| Lead-family Q8 price range (Consumer-, Enterprise-, AI-, University-led) | $82–149 | $114–135 |
| Enterprise-led rank among the ten | 9th | 5th |
| Enterprise-only rank among the ten | last | 9th |
| AI-only percentile in the grid | 49th | 17th |
| Consumer-only percentile in the grid | 27th | 13th |
| Average Enterprise in the top-5% allocations | $1.0M | $4.6M |
| Spread of destination bests | $10.4 | $10.5 |

The narrowing holds in all six scenarios tested. A seventh candidate, faster University go-live, added nothing and was dropped.

**Still open after PR:**
- **AI remains part of every winning allocation.** This is defensible for an AI-disruption scenario, but it is your design decision.
- **University revenue still barely moves within eight quarters.** Fixing that needs a structural change (a larger University market, or Credential in the institutional win rate), not calibration.

### 6. How should contract costs, recession actions and financing interact with the investment budget?

**What happens today (verified in the engine):**
- **The envelope is a hard cap.** It is $30M a quarter, regardless of cash; $40M inside a $30M envelope is rejected. Only the Q8 options raise it, to $45M or $60M.
- **The contract only costs cash.** It costs $6.6–10.4M of Q5 cash, plus a $1.5M-a-quarter delivery team for six quarters, plus 0.07–0.25 on the load ratio. It never reduces investment capacity: teams invest the full $30M and accept in the same quarter.
- **Financing adds cash, never investment capacity.** Only the Enterprise strategies needed any.
- **Recession actions are optional.** A hiring freeze is infeasible for the 5 of 10 strategies that fund People.
- **The share price rewards cuts.** A deep reduction raises the price for 8 of 10 strategies (by up to +$16), while culture falls by about 20 points and the terminal score by 2–12.

**Proposed rules (documented only, not implemented):**

1. **The contract claims capital.** Its upfront cost comes out of that quarter's strategic envelope, and the delivery team appears as committed spend in later plans. Accepting with no envelope room requires financing (rule 3).
2. **The recession response is required and always feasible.** The team chooses Protect, Slow (at least $5M to reserve) or Cut. A hiring freeze with People planned becomes "freeze and move People to reserve". In addition, the valuation gains an organizational-health term (NXLN-VAL-1.1), so deep cuts are no longer a free share-price gain.
3. **Financing can expand investment, within limits.** Envelope(t) = $30M + min($15M, new capital raised in quarter t), for Q2–Q7. The limits are:
   - **Debt:** within the existing debt capacity and covenants.
   - **Equity:** within the existing maximum share of pre-money; dilution flows into the price through ownership^0.6.
   - **Cash floor:** the CFO forecast must show closing cash of at least $25M after the expanded plan, or the expansion is refused.
   - **Absorption:** the extra spend adds transformation load, which the existing absorption curve penalizes.

   This gives long-payback strategies a funding path that has a visible cost.

## Secondary observations

- **Wasted spend at the ceiling.** A single bucket funded at $30M a quarter hits the 120 capability ceiling by Q6–Q7, and later spend is wasted. A "near ceiling" flag on the decision screen would help.
- **Cash hoarding is correctly unrewarded.** Cash preservation ends with $187M, but the price ignores cash above $40M (by design).
- **University-led's price is readiness, not revenue.** Its $111 comes from strategic readiness, and the board report should say so.

## Recommended next step

Prototype package PR and the three rules on a lab branch, re-run this study, and compare the two workbooks before touching the frozen engine.

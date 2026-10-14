# Batch 10C — Executive decision mechanics (V3)

**Status:** implemented on `feature/nexlearn-v3-integration` (local only).

| Area | Location |
|---|---|
| Engine rules | `src/simulationV3/engineV3.ts` (switches in `engineV3Config.ts`) |
| Adapter | `src/production/v3/adapter.ts` |
| UI | `src/production/v2/ui/stages/DecisionStage.tsx`, `DecisionSummary.tsx`, `CommitStage.tsx` |
| Explanations | `insights/consequences.ts` |
| Saturation insight | `insights/saturation.ts` |

**V2 behaviour is preserved:**
- The V2 engine and adapter are unchanged.
- Every new control and rule appears only for V3 games (`isV3(snapshot)`). The one exception is the saturation warning (E8), which reads state only and is deliberately shown in both engines, as the design allowed.
- The facade rejects V3-only fields (`recessionStance`, `expansion`) for V2 games.

## 1. Q5 enterprise contract (E5) — cost counted once, opportunity cost visible

| Element | V2 | V3 |
|---|---|---|
| Upfront cost (implementation plus customization × (1 − product readiness)) | Paid in cash **on top of** the $30M investment | Paid **from** the $30M strategic budget. The team must keep at least that amount as cash in the plan. |
| Ledger | Event costs `[opportunity]` | The same event-cost lines, recorded once and tagged "paid from the strategic budget". Investment is reduced by the same amount, so total Q5 outflow ≤ $30M. |
| Delivery team, workload, roadmap diversion, focus dilution, delivery risk, SLA penalties, cancellation | Unchanged | Unchanged |
| Student view | Upfront cost shown as a fact | "Accepting uses $X of your $30M budget … at most $Y is left to invest." If too little is kept as cash, one button reduces every investment in proportion. |
| Results | "It cost $X upfront" | "Its $X implementation cost came out of this quarter's $30M budget (counted once), leaving $Y invested." |

**Enforcement.** The engine rejects acceptance when the cash kept in reserve is below the upfront cost (tolerance $0.01M). The error names the amount.

**Tests** (`src/production/v3/v3mechanisms.test.ts`):
- the rejection;
- the valid case: investment = 30 − cost; the event cost equals the upfront amount, recorded once; the identity holds.

**Is acceptance automatically superior?** No. Q8 price, accept minus decline (T9):

| Strategy | V3 Δ price |
|---|---:|
| Enterprise-led | +$14.8 |
| Enterprise-only | +$11.8 |
| Enterprise + AI | +$5.3 |
| Diversified | +$3.1 |
| Adaptive | +$3.8 |
| AI-led | +$0.7 |
| Consumer-led | **−$6.8** |

The default policy accepts only when the contract is aligned and deliverable.

## 2. Q6 recession (E6) — an explicit stance, every option feasible

**V3 requires one stance in Q6**, enforced by the adapter and the engine:

| Stance | Rule | What it means |
|---|---|---|
| **Protect** | No cost cuts | Keep investing; accept a thinner cash cushion |
| **Slow** | At least $5M of the budget kept as cash; no cost cuts | Hold back; capability builds more slowly |
| **Cut** | At least one cost action (hiring freeze, targeted or deep workforce reduction, lower marketing, close weak offerings) | Lower running costs; staff actions weigh on talent, culture and delivery |

- Pricing actions are allowed under any stance.
- **Hiring freeze with People funded:** V2 threw an error, which made the freeze infeasible for every People-funded plan. In V3 the UI moves the People allocation to cash when the freeze is chosen, and says so on screen. The engine still rejects an inconsistent submission.
- **UI.** A required "Recession stance" card sits above the existing "Recession response" card:
  - cost actions are disabled unless the stance is Cut;
  - Slow offers a one-click "Move $X to cash";
  - the board resolution, decision summary and results all state the stance.
- **Not a moral quiz.** Price, cumulative operating profit and culture against Protect (T7):
  - Protect usually leads on price.
  - Cut leads on cumulative operating profit (+$12–43M) and the CFO score.
  - A deep cut still raises the price for University-led (+$3.7) and Consumer-led (+$0.3), but lowers it for the other six strategies tested (down to −$19.3).
  - Slow holds cash with a small price cost.
  - Each stance is best on at least one measure for some strategy.
- **Tests:**
  - stance required in Q6 only;
  - each stance's rule;
  - freeze rejected with People funded and accepted with People = 0;
  - a deep cut schedules execution and customer-success aftershocks.

## 3. Financing and the investment budget (E7)

**Rule.** In Q2–Q7 the budget may be expanded:

> Budget = $30M + expansion, where expansion ≤ min($10M, debt + equity raised **in the same quarter**)

- The expanded plan must leave closing cash ≥ $25M.
- Q8 keeps its option-specific budgets ($45M / $60M).
- Expansion is not available in Q1 or Q8.
- Two arbitrage guards were added in 10F: debt repaid in the same quarter is netted against the capital raised (no borrow-and-repay round trip), and a "slow" recession stance cannot be combined with a financed expansion.
- Every limit is enforced by the engine (`checkExpansion`) with a named error.

**No unlimited spending.** Spending is bounded by:
1. the $10M per-quarter cap;
2. existing debt capacity and covenants;
3. equity limits and dilution;
4. the cash floor;
5. absorption: extra load reduces how much investment becomes capability.

**Counterfactual forecasts.** The CFO forecast ("before financing") and the solvency counterfactual evaluate the plan without the raise, so they never fail on the expansion rule.

**X tested at 0 / 5 / 10 / 15** (T8):
- With proportional spending, expansion **reduced** the Q8 price for all 7 strategies at X = 10 (−$3.8 to −$11.3). Net cash fell by about $30–36M for each $5M step in X, because the expansion repeats in each of six quarters. The smallest effect was Adaptive's: −$0.6 at X = 5.
- In path A, extra investment mostly lands on capabilities near their ceilings, and debt costs interest.
- **The default policy never uses expansion** (H7: at most 30%).
- **X = $10M is the release value.** It keeps a real CFO decision (leverage against flexibility) while bounding the downside: −$59M net cash for the most leveraged strategy at X = 15 was judged too large for a classroom default.

**UI.** In the CFO financing panel: "Invest more than the base budget". The panel shows:
- the amount available (capped by what is being raised);
- the limit and the cash floor;
- the interest and dilution consequences.

The budget heading shows "including $X financed this quarter". The board resolution adds "Add $X of the new money to this quarter's investment budget".

**Server dependency.** The current server check requires the allocation to total the base budget. V3 sessions get a V3 input check in the 10D migration.

## 4. Capability ceilings (E8)

- **Warning (both engines).** A bucket shows "Close to what the organization can use … More here is likely to be wasted" when its main capability plus gains still maturing from earlier investment is within 5 points of next quarter's ceiling (100, or the destination's raised ceiling). No formula is shown.
- **Feedback.** When matured capability is lost at a ceiling, the results list a "ceiling" consequence: which capability, how many points, and that a strategy commitment can raise the ceiling.
- **Validation (H12).** In the 10 single-bucket games where waste occurs (5 strategies × 2 engines), the warning appears in an earlier quarter in **9 of 10** (`scripts/lab/v3/lab.test.ts`). Target ≥ 90%: met.

## 5. Decision transparency

| Event | The decision | Information available | Known costs | Key uncertainty / opportunity cost |
|---|---|---|---|---|
| Q4 destination | Five destinations with personality and exposures | Briefings, signals, 10A evidence picks | Transition load (shown after commitment) | "Whether the market rewards this direction is still unknown" |
| Q5 contract | Accept / decline | Value per year, upfront cost, delivery team, workload, roadmap diversion, delivery readiness, fit to strategy | V3: "$X of your $30M budget" | Delivery strain; capacity taken from your own strategy |
| Q6 recession | Stance (V3) plus actions | CFO forecast, cash, capacity gauge | Savings and one-off costs, shown in results | "How long the downturn lasts decides…" |
| Q7 crisis | Remediate / contain / absorb | Severity for your company, description | Cash per response | Reputational memory |
| Q8 final | Earned options only | Lock reasons for unavailable options | Budget and cap per option | Outside the simulation |
| Financing (any quarter) | Borrow / shares / partner / restructure / expansion (V3) | Terms on offer | Interest rate, valuation, dilution | Shown as consequences next quarter |

Future consequences are not revealed in advance. The results "consequence" lines are built only from recorded engine values.

## 6. Tests

- `src/production/v3/v3mechanisms.test.ts`: 20 tests for E1, E3, E4, E5, E6, E7, V2 rejection of V3 fields, and snapshot version and replay.
- `scripts/lab/v3/lab.test.ts`: identities, replay, parity, determinism, E8 warning before waste.
- Full unit suite after 10C: 754 passed, 20 skipped; type-check clean; production build passes.
- Browser tests of the V3 decision UI need a V3 session (10D migration) and are run in 10F.

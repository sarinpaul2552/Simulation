# NexLearn V3 — executive decision brief

**For:** product owner. **Status:** design for approval; nothing implemented.
**Detail:**
- `BATCH10_EDUCATIONAL_DESIGN_REVIEW.md`
- `BATCH10_V3_ECONOMIC_DESIGN.md`
- `BATCH10_V3_VALIDATION_PLAN.md`
- `BATCH10_IMPLEMENTATION_ROADMAP.md`

## The answer first

**Will V3 create a better executive decision-making experience, or merely a more balanced financial game?**

**A better learning experience, if it is built in the recommended order. A more balanced game, if only the economics are changed.** The largest learning gap is not in the economics. Students already state their beliefs, risks and lessons, and V2 then drops most of it:

- Risks, confidence and notes never reappear after commit.
- Reflections are fetched but never shown to the facilitator.
- The board report uses none of it.

Closing that loop (stages 10A and 10E) turns the simulation from "make a decision and see a number" into "state what you believe, act, compare, and defend it". These stages need no engine change and no risky migration.

The economic changes serve the same goal: they make each executive's argument carry real consequences.
- **CFO:** financing can buy investment, at a price.
- **People officer:** organizational damage reaches the business and the share price.
- **Product officer:** AI returns depend on the market path instead of always winning.
- **Growth officer:** Enterprise and University become real, slower-paying choices.

They are not designed to make strategies score alike.

## What is working

- **The narrative:** eight quarters with a distinct challenge in Q4–Q8, and a well-designed Q3 conflicting-evidence moment.
- **Five roles with private briefs** and built-in tension, without recommendations.
- **Structured deliberation,** a team commitment statement, plain-language results and a board report with defence prompts.
- **Fair, deterministic comparison** within a session, with verified replay. Production is stable (Batch 8.1).

## What must change

1. **Close the intent loop.** Capture strategy, evidence and biggest risk in three taps; text is optional; nothing is AI-graded. Show it at results, to the facilitator and in the board report ("intended / did / happened / learned").
2. **Fit 90 minutes.** The current model estimate is about 130–150 minutes on a shared device and about 115–135 on individual devices. The fixes:
   - individual devices by default;
   - pre-filled allocation;
   - one risk instead of two;
   - fast and major quarters;
   - a facilitator timer.

   The target is about 90–100 minutes, to be confirmed by a stopwatch pilot.
3. **Make Q2 and Q3 distinct** through framing: Q2 is a stance on AI, Q3 an evidence citation. Add a facilitator-led **signal-versus-noise reveal**.
4. **Economics where roles are hollow** (V3, lab-validated first):
   - **AI:** revenue follows the adoption *level* instead of compounding as a perpetual flow. AI is the top marginal investment in all ten market variations tested.
   - **Enterprise:** capability converts to bookings within the game. Today capability reaches its ceiling while revenue moves only $40M → $46M.
   - **University:** Credential drives institutional wins. Today revenue is flat even when the market doubles, so conversion is the constraint.
   - **Organization:** culture has commercial consequences, and the share price sees organizational health. Today a deep layoff *raises* the Q8 price for 8 of 10 strategies, by up to +$16, and in all four strategies followed to Q12 it still leads there.
   - **Contract:** the upfront cost uses the quarter's investment budget.
   - **Recession:** the response becomes mandatory, and a hiring freeze is always feasible. Today it is impossible for half the strategies.
   - **Financing:** it can expand investment, within debt, dilution, cash-floor and capacity limits. The amount is to be tested, not assumed to be $15M.
   - **Saturation:** a plain warning before wasted spend. Single-bucket plans waste 45–55 capability points from Q5–Q7.
5. **Three authored market paths,** the same for every team in a session, with signals that differ by path. This creates context-dependent best strategies without randomness.
6. **Fix a false results message** ("Culture paid for it", for which no mechanism exists) and stale scenario notes.

## What should remain unchanged

- The starting company and revenue mix.
- The eight-quarter narrative and the four-stage flow.
- The five buckets and the $30M envelope.
- Destinations, crisis types and Q8 options.
- The executive scorecards (NXLN-EXEC-1.1) and the terminal score.
- The boardroom visual design, with no animations.
- The V2 engine stays frozen and keeps serving existing sessions. V3 is a separate engine version.

## Decisions requiring your approval

1. **Sequence:** ship 10A and 10E on V2 first (recommended), before any economics.
2. **Freeze exception:** a text-only correction to the frozen V2 adapter, to remove the false "Culture paid for it" message (recommended), or wait for V3.
3. **V3 as a separate engine version** coexisting with V2, chosen per session (recommended).
4. **AI revenue model change (E1):** "adoption sets a revenue level" replaces the compounding flow.
5. **Valuation NXLN-VAL-1.1 (E9):** organizational health enters the share price, at a weight of about 0.08–0.10 to be calibrated. This changes the share-price model.
6. **Contract claims the investment budget (E5); mandatory recession stance with freeze → reserve (E6).**
7. **Financing-expanded investment (E7):** approve in principle; the limit is set by validation.
8. **Market paths (E10):** three paths; whether the facilitator chooses the path or it is sealed per session; whether it is revealed in the board report (recommended: revealed).
9. **University:** approve the conversion change (E3). If validation fails, choose between adding a partnership event or positioning University explicitly as a long-horizon strategy.
10. **Classroom defaults:** individual devices recommended; mandatory taps but optional text; one risk instead of two.
11. **Facilitator rubric:** manual and optional, with one small database migration (10E).

## Uncertainties

- All V3 economic effects are **hypotheses** until the 10B and 10C laboratory runs. Only V2 behaviour and V2 emulations have been measured.
- The timing model is an estimate. Only a classroom pilot can confirm 90 minutes.
- Learning gains cannot be proven in the lab. The pilot includes a small pre/post check and comprehension questions, which are indicative only.
- Interaction risk: Enterprise + contract + financing may become a new universal optimum. Validation tests these together (H2, H7, H9).

## Recommended next implementation batch

**Batch 10A: educational experience and decision rationale, on V2.** It needs no engine change and no migration, and it delivers the largest learning gain. It is followed by **10E** (facilitator and board report). The V3 economic laboratory (10B) can start in parallel once decisions 3–5 are approved.

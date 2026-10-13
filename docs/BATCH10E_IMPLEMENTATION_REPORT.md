# Batch 10E — implementation report: Facilitator Experience and Board Report

**Branch:** `feature/batch10e-facilitator`, based on `feature/batch10a-student-learning` (3f7fd16).

**Status:** implemented and tested; ready for review. Not pushed, merged or deployed.

## Approved decisions and how each is implemented

| # | Decision | Implementation |
|---|---|---|
| 1 | Integrate Compare Teams into Class Discussion, retaining financial comparisons | The "Class discussion" tab (tab id kept as `compare`) contains the quarter comparison and, in a fold, the existing revenue, cash, operating profit and final score meters (`v2-fac-compare`) |
| 2 | Q3 assessments hidden until every participating team has completed Q4; no override | `q3RevealOpen()`: at least one started team, and every started team has `completed_quarter ≥ 4`, from the server overview. No control exists to open it early, in any mode. The panel shows progress ("1 of 2 teams"). Assessments are removed from the data (not only hidden in the UI) when the gate is closed. |
| 3 | Anonymised labels in projector mode; reflections hidden by default; facilitator selects individual reflections | `teamLabels()` gives "Team A, B, …" in projector view across every tab, including Live, Leadership and awards, and the financial meters. Team codes are hidden in projector view. Written reflections never appear by default: in normal view the facilitator reviews them under "Review written reflections" and ticks individual notes. Projector view shows only ticked notes, with anonymised labels. The selection is kept for the browser session. |
| 4 | $5M or 15 pp indicators; account for budget changes, event constraints and forced reallocations; neutral | `changeIndicators()`. With the same budget, a move of ≥ $5M or ≥ 15 pp of the budget is flagged. When the budget changes (Q8 options) or a decision caps investment ("stabilize and restructure", $10M), only shares of the money invested are compared, and the context is stated ("lower amounts were required, not necessarily chosen"). Stated priorities are compared only between quarters that ask the same question (Q4–Q8). |
| 5 | Defer the rubric | Not implemented |
| 6 | Optional facilitator-only stage clock | `insights/stageClock.ts`, a pure reducer with no imports; `StageClock` sits under the tabs. Presets 6, 9 and 20 minutes; start, pause and reset; shows "Time" at zero. It cannot call the API. |
| 7 | Distinguish continuity, adaptation and potential misalignment without scores | `teamTimeline()`: starting position / continuity / adaptation per quarter. Potential misalignment is raised only by explicit, displayed rules (`ALIGNMENT_RULES`) for priorities with a clear money signature, phrased as a question ("the team may have had reasons"). No score, colour verdict or ranking. |
| 8 | Reuse the existing facilitator data request; no migration | All data comes from `v2_facilitator_debrief` (already returns inputs, deliberations, reflections, votes and agreements for resolved quarters). The facilitator previously discarded reflections; they are now used. **No migration, RPC or RLS change.** |
| 9 | Preserve the frozen economics, valuation, executive scoring and existing sessions | The freeze diff is empty. `valuation.ts`, `executive.ts`, `database/` and `package.json` are unchanged. Outcomes are replayed with the frozen engine. Older sessions without 10A fields show "Not recorded". |
| 10 | Tests | See `BATCH10E_TEST_REPORT.md` |

## What the facilitator sees

- **Class discussion.** A quarter picker (defaults to the latest quarter every team has completed). Below it:
  - the class pattern line (stances or priorities, Q3 signals cited, events, largest investment area);
  - one row per team with **Intended / Decided / Happened / Learned**;
  - the Q3 signals panel (when Q3 is selected);
  - reflection review and the financial comparison.
- **Team timelines.** For each team:
  - a factual path summary ("Changed direction in Q3. Held course in Q2, Q4…");
  - an eight-quarter table with a Direction column (pattern, changes, context, potential misalignment);
  - the earlier debrief content (decisions, commitments, votes, trajectory) folded below;
  - the rules, stated once ("How directions are described").
- **Final debrief.**
  - The suggested 20-minute running order (5 / 8 / 7).
  - Where teams ended (existing figures only).
  - The biggest changes of direction (one entry per team and quarter).
  - Q3 evidence → Q4 commitment, with assessments once the gate is open.
  - "What would you do differently?": learning-choice counts plus reflection review.
  - A partial-data note while some teams are unfinished.
- **Live progress.** A new "Last committed intent" column (from resolved quarters only; never drafts), and the stage clock.

## Student board report

- **"Intent and outcome"** section: eight rows of what we intended, decided, saw happen and learned. It uses the same model as the facilitator view.
- **"Questions from your own recorded reasoning"**, up to three:
  - the Q3 signals the team cited → its Q4 commitment, with the assessments, which the team has already seen after Q4;
  - its largest change of direction;
  - a potential misalignment or a "different call" reflection.

## Files

| Type | Files |
|---|---|
| New | `insights/facilitator.ts`, `insights/stageClock.ts`, `insights/intentOutcome.ts`, `ui/FacilitatorDiscussion.tsx`, `batch10e.test.ts`, `e2e/batch10e.e2e.ts` |
| Modified | `ui/V2Facilitator.tsx`, `ui/stages/FinalStage.tsx` |
| Docs | `BATCH10E_IMPLEMENTATION_PLAN.md`, this report, `BATCH10E_TEST_REPORT.md`, `BATCH10E_FACILITATOR_GUIDE.md`, `BATCH10E_HANDOFF.md`, `SEC-001_TECHNICAL_DESIGN.md` |

## Deviations from the plan

- **Belief-topic change** is not used as a change indicator. Beliefs are quarter-specific questions, so a topic change was mostly noise.
- **Tab ids** `compare` and `debrief` are kept for stability (they now mean Class discussion and Team timelines). `final` is new. No E2E test needed changing.
- **"Last committed intent"** reloads the debrief data whenever any team completes a quarter (triggered by the existing 5-second overview poll), not on every poll.

## Known limitations

- A team that joined but abandoned the game keeps the Q3 assessments closed, because the gate requires every participating team. The panel shows which teams are pending.
- The reflection selection is stored in the facilitator's browser session only, by design: no database change.
- SEC-001 is unchanged: scenario truth is still in the bundle. The facilitator gate is a classroom-flow control, not a security boundary. See `SEC-001_TECHNICAL_DESIGN.md`.

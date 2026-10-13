# Batch 10A — handoff

**Status:** approved in principle; correction applied; implemented and tested on branch `feature/batch10a-student-learning`. It is **not pushed, not merged and not deployed**, pending product-owner approval. Do not begin 10E until approved.

## What changed

See `BATCH10A_STUDENT_EXPERIENCE_CHANGES.md`. In short:
1. A structured rationale: priority (or stance) → evidence → **one** biggest risk.
2. Distinct Q1, Q2 and Q3 framing, including a Q3 evidence citation.
3. The gated Q3 signal reveal after Q4.
4. Expected / decided / happened / learned on the reflection card.
5. The reflection is saved while it is written, with a counterfactual prompt.
6. Three misleading texts are corrected.
7. Optional, explicit allocation prefill.

## Files

| Type | Files |
|---|---|
| New | `content/decisionFraming.ts`, `content/signalAssessments.ts`, `insights/signalReveal.ts`, `insights/accountability.ts`, `insights/prefill.ts`, `batch10a.test.ts`, `e2e/batch10a.e2e.ts` |
| Modified | `types.ts` (two optional deliberation keys), `content/deliberationContent.ts` (one learning chip), `ui/useV2Team.ts` (`persistReflection`), `ui/stages/DecisionStage.tsx`, `DecisionSummary.tsx`, `CommitStage.tsx`, `ResultsStage.tsx`, `ui/ds/ds.css` (reveal layout only), `insights/report.ts`, `insights/explain.ts`, `insights/briefing.ts`, `e2e/helpers.ts` (one risk; priority; Q3 evidence; reflection refresh check) |
| Docs | `docs/BATCH10A_*.md` (5), `docs/SECURITY_ISSUE_SEC-001_SCENARIO_DATA_IN_BROWSER.md` |

All application paths are under `src/production/v2/`.

**Not changed:**
- `src/simulation/*` and `src/production/v2/adapter.ts` (freeze diff is empty);
- `database/*`, RLS, RPCs;
- `package.json`;
- environment variables, Vercel and Supabase.

## Product-owner decisions (approved in principle) and how they are applied

| # | Decision | Status |
|---|---|---|
| 1 | Keep the Q3 signal-source executive names visible in the reveal | Kept as built ("CFO brief", "Growth brief"…) |
| 2 | Single biggest risk | Confirmed as built; older two-risk records still display |
| 3 | One required structured learning choice | Kept: "Save and continue" stays disabled until one choice is made; the written line is optional |
| 4 | Q8 prefill must never offer a plan that breaks the investment cap; no silent changes | **Fixed in the correction commit**, see below |
| 5 | Preserve engine, database and scoring | Freeze diff empty; no database, RLS, RPC or scoring change |
| 6 | Browser exposure of future scenario data | Recorded as **SEC-001**, a release blocker for commercial use (`SECURITY_ISSUE_SEC-001_SCENARIO_DATA_IN_BROWSER.md`) |
| 7 | 90-minute timing with at least 20 minutes for the board report and debrief | `BATCH10A_CLASSROOM_TIMING_PLAN.md` revised; on-screen pace hints now 6 and 9 minutes per quarter |

### Q8 prefill correction

- In Q8, prefill is offered only **after** a final option is chosen, because the budget and the cap depend on it.
- The offered plan is fitted to the lower of the option's budget and its investment cap ($10M for "stabilize and restructure").
- Switching the option after prefilling never rewrites the plan. Prefill is not re-offered over an entered plan, and the engine's existing message asks the team to reduce the plan if it exceeds the new cap.
- **Tests:**
  - for every strategy and every available final option, the offered plan passes the engine's own validation;
  - for a distressed company where "stabilize and restructure" is available, the old uncapped plan fails the engine's cap and the new capped plan passes.

### Reliability fix (found while verifying)

On individual devices, a background poll could overwrite picks that were still being saved. That could leave "Review and commit" disabled. The fix keeps local edits until the save completes, and merges each pick into the latest draft. It touches only `ui/useV2Team.ts` and `DecisionStage.tsx`; there is no server change. See the test report.

## Security notes

- **SEC-001 (open, blocks commercial release).** Future scenario data, hidden truth, design notes and role-private brief content are in the production JS bundle because the V2 engine runs in the browser. This predates 10A and was verified on a production build. The reveal gate is UI-level, using the authoritative server `completed_quarter`. The resolution plan and acceptance criteria are in `SECURITY_ISSUE_SEC-001_SCENARIO_DATA_IN_BROWSER.md`.
- **Proposed for later (needs RPC and migration approval, so it is not done here):** a `SECURITY DEFINER` RPC `v2_get_signal_reveal(team_code)` that returns the assessments only when the team's `completed_quarter ≥ 4`, plus stripping `truthReference` and `designNotes` from the client build. The latter needs either a build-time transform or moving the scenario truth server-side; it touches the frozen scenario file, so it should be decided together with V3.
- No new write path. Reflection saves use the existing `v2_save_reflection` RPC with the team code: no phase restriction, and the quarter must be resolved.
- Nothing here exposes future-quarter information: the reveal uses Q3 truth plus the team's Q3–Q4 records only, and is tested to be identical at Q4 and Q8.

## Push procedure (prepared, not executed)

The GitHub proxy returned 403 for this repository in earlier batches, so the push is prepared as a bundle:

1. Copy `nexlearn-batch10a.bundle` and `BATCH10A_PUSH.ps1` into `C:\Users\sarin\Simulation`.
2. Review: `git bundle verify nexlearn-batch10a.bundle`.
3. Run `powershell -ExecutionPolicy Bypass -File .\BATCH10A_PUSH.ps1`. It fetches the branch from the bundle and pushes **only** `feature/batch10a-student-learning`. It does not touch `main` and does not deploy: Vercel deploys `main` only.

**After approval, deploying would require:**
- a review and merge into `main` (which also brings in the Batch 9 and Batch 10 documents and lab code on this branch's history);
- the normal Vercel deploy;
- no database step.

## Next

**10E** (facilitator and board report): show priority, evidence and reflections to the facilitator; timer; an "Intent and outcome" section; risk → outcome mapping. Not started.

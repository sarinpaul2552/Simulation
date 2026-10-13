# Batch 10A — handoff

**Status:** implemented and tested on branch `feature/batch10a-student-learning`. It is **not pushed, not merged and not deployed**, pending product-owner approval. Do not begin 10E until approved.

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
| Docs | `docs/BATCH10A_*.md` (5) |

All application paths are under `src/production/v2/`.

**Not changed:**
- `src/simulation/*` and `src/production/v2/adapter.ts` (freeze diff is empty);
- `database/*`, RLS, RPCs;
- `package.json`;
- environment variables, Vercel and Supabase.

## Decisions for the product owner

1. **Role-private signals in the reveal.** After Q4 the reveal names the brief each Q3 signal came from (for example "CFO brief"), so the whole team sees what each role was told in Q3. **Approve or ask for anonymized sources.**
2. **One risk instead of two.** This is a requirement change, made as the Batch 10 brief recommended. Old two-risk records still display.
3. **Reflection requirement kept.** At least one learning chip is still required to continue; text stays optional. Relaxing it to fully optional is a one-line change, if wanted.
4. **"Culture paid for it" (`adapter.ts:539`).** No freeze exception is needed: the text is never rendered (verified; a guard test is added). Recommendation: leave the frozen file untouched and remove the string in V3.
5. **Prefill in Q8.** Prefill copies only buckets, but some Q8 final options cap investment. The engine's existing validation still blocks an over-cap plan with a plain message. Accept, or hide prefill in Q8.

## Security notes

- **Pre-existing: scenario truth ships in the client bundle.** The V2 engine runs in the browser, so `engineV2Scenario.ts`, including `truthReference`, is in the JS bundle, as it was before 10A. The reveal gate is UI-level, using the authoritative server `completed_quarter`.
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

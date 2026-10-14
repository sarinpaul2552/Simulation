# Batch 10A — review guide (pull-request description)

**Branch:** `feature/batch10a-student-learning` → review target `main`. **Do not merge yet.**

**Status:** accepted for development. The four product decisions are approved, including the corrected Q8 prefill. The branch is not pushed, merged or deployed.

## Commits under review

| Commit | Summary |
|---|---|
| c5011f8 | Student decision rationale, Q1–Q3 framing, Q3 signal reveal, reflection persistence |
| aac1a6b | Correction: Q8 prefill respects the final option's cap; 90-minute plan; SEC-001; draft-save race fix |
| d7ca7cf | Test report: strategy count |
| (this commit) | Review guide |

**Diff:** 19 source and test files (+927 / −47) and the Batch 10A documents, relative to `bac387b`. The branch history also contains the Batch 9 (lab) and Batch 10 (design documents) commits, which are not yet on `main`. Reviewers of `main` will see those too.

## What to review

1. **Rationale and framing.** `content/decisionFraming.ts`, `ui/stages/DecisionStage.tsx`, `DecisionSummary.tsx`, `CommitStage.tsx`.
2. **Signal reveal.** `content/signalAssessments.ts` (wording against the authored truth notes), `insights/signalReveal.ts` (gate), `ResultsStage.tsx`.
3. **Accountability and reflection.** `insights/accountability.ts`, `ResultsStage.tsx` (debounced save), `ui/useV2Team.ts` (`persistReflection`, `updateDeliberation`, in-flight save guard).
4. **Prefill.** `insights/prefill.ts` and the Q8 gating in `DecisionStage.tsx`.
5. **Text corrections.** `insights/report.ts`, `insights/explain.ts`, `insights/briefing.ts`.
6. **Tests.** `src/production/v2/batch10a.test.ts`, `e2e/batch10a.e2e.ts`, `e2e/helpers.ts` (one risk replaces two, as a deliberate requirement change).

## Review checklist

- [ ] The frozen engine is unchanged: `git diff --stat 003f697 -- src/simulation src/production/v2/adapter.ts` is empty.
- [ ] No migration, RLS or RPC change: `git diff bac387b -- database` is empty.
- [ ] No dependency change: `git diff bac387b -- package.json package-lock.json` is empty.
- [ ] Every new deliberation key is optional; old records display "Not recorded".
- [ ] No Q3 evidence label contains figures or reliability hints.
- [ ] The reveal is unreachable before `completed_quarter ≥ 4`.
- [ ] Reveal wording is graded (not right/wrong) and quotes no figure absent from the scenario.
- [ ] The Q8 prefill is offered only after the final option is chosen, and is fitted to the cap.

## How to verify locally

```
npm ci
npm run type-check && npx vitest run && npm run build
bash scripts/v2-local/up.sh
export V2_DB_KEY=$(node scripts/v2-local/anon-key.mjs local-dev-jwt-secret-at-least-32-characters-long)
npm run test:db
npx playwright test -c e2e/playwright.config.ts
```

Results from this environment are in `BATCH10A_TEST_REPORT.md`:
- 708 unit tests passed, 18 skipped;
- 14 of 14 database tests passed;
- the full E2E runs each had one environment stall, and every affected test file passed on re-run.

## Known open items

- **SEC-001** (future scenario data in the browser bundle): pre-existing, blocks commercial release, and is not part of 10A. See `SECURITY_ISSUE_SEC-001_SCENARIO_DATA_IN_BROWSER.md`.
- **Classroom timing** is an estimate until a stopwatch pilot is run.

## Push (requires approval)

From `C:\Users\sarin\Simulation`, run `powershell -ExecutionPolicy Bypass -File .\BATCH10A_PUSH.ps1`. This pushes this branch only. After the push, open a pull request to `main` using this file as its description. Do not merge until approved.

# Batch 10A — test report

Every result below was **executed** in this session on branch `feature/batch10a-student-learning`, against the local Supabase stack (`scripts/v2-local/up.sh`). Nothing was run against production.

## Summary

| Check | Command | Result |
|---|---|---|
| Type-check (app + E2E) | `npm run type-check` | Pass |
| Unit and integration (vitest) | `npx vitest run` | **704 passed**, 18 skipped, 0 failed. Before 10A: 687 passed, 18 skipped. The 17 new tests are in `batch10a.test.ts`. |
| Database integration | `npm run test:db` | **14 passed** |
| Production build | `npm run build` | Pass. Only the pre-existing chunk-size warning. |
| Engine freeze | `git diff --stat 003f697 -- src/simulation src/production/v2/adapter.ts` | **Empty** |
| E2E (Playwright), full run 1 | `npx playwright test -c e2e/playwright.config.ts` | 22 passed, 1 skipped (compat, needs the old schema), **1 failed**: `stage1 › NexLearn introduction…`. |
| ↳ re-run | `… e2e/stage1.e2e.ts` | 3 passed |
| E2E full run 2 (final code, including `batch10a.e2e.ts`) | same | 23 passed, 1 skipped, **1 failed**: `integrity › facilitator switches a live session to private voting…`. |
| ↳ re-run | `… e2e/integrity.e2e.ts` | 8 passed |
| Accessibility (after final UI edits) | `… e2e/a11y.e2e.ts` | Passed |

**About the two E2E failures.** Each failure was in a different test, each passed on immediate re-run, and both happened before any Batch 10A screen was reached.
- Run 1 failed on the Q1 briefing → decide transition. The page showed "TypeError: Failed to fetch", and the test stalled for 9.6 minutes.
- Run 2 failed in `joinTeam`, waiting for the team screen, after 2.0 minutes.

They are recorded as transient local-stack network failures rather than regressions, but they *are* failures and are reported, not hidden. The same tests passed in the other full run.

## New unit tests (`src/production/v2/batch10a.test.ts`)

| Area | What is verified |
|---|---|
| Framing | Q1, Q2 and Q3 have distinct headings and priority sets; Q1–Q3 are fast and Q4–Q8 major; event quarters keep their event headings. |
| Neutrality | Q2 options are exactly accelerate / maintain / reconsider. No priority or evidence label in any quarter uses "correct / best / recommended / wrong". |
| Q3 evidence | The options equal the authored Q3 signal ids, and the labels contain no digits and no reliability words. |
| Validation | Priority, belief, confidence and one risk are required; Q3 needs one or two signals (three is rejected); an older two-risk record still validates. |
| Backward compatibility | Accountability rows render old (no priority, two risks) and missing (`null`) deliberations with "Not recorded". |
| No false causality | Accountability text, for all ten strategies × eight quarters, contains no causal wording (because, caused, led to, paid for…). |
| Reveal gate | Closed for completed quarters 0–3 and NaN, open for 4–8. `buildSignalReveal` returns `null` below Q4 **even when later records are present** (the component-state case), and `null` when the Q4 record is missing. |
| Reveal content | Covers every authored Q3 signal. The headline equals the scenario text, and the basis equals the authored truth note (`null` for the People signal → "not-assessed"). **Every number in the assessment text appears in the authored signal or note.** Verdicts are graded, not binary. |
| No spoilers | The output at Q8 equals the output at Q4 (only Q3 truth and Q3–Q4 records are used). The cited marker works. |
| Prefill | Offered only with a previous allocation and an empty draft. Fits every envelope in $0.5M steps and never exceeds the previous amounts. Copies only allocation keys. A prefilled Q2 input resolves in the engine for every strategy. |
| Reflection | The new chip; encode/decode round trip; legacy text is still decoded. |
| Guard | No `ui/`, `insights/` or `content/` module reads `.explanation` (the frozen adapter's false "Culture paid for it" stays unrendered). The corrected phrases cannot reappear. |

## E2E changes

**`e2e/helpers.ts`:**
- `fillDiscussion` now picks a priority, picks two signals in Q3 (checking that a third is blocked), a belief, a confidence and **one** risk (checking that a second click replaces the first).
- The refresh check expects one risk, one priority and two Q3 signals.
- Results checks: the accountability rows are filled; the reveal count is 0 before Q4 and 1 from Q4.
- With `refreshEveryPhase`, the reflection is checked to **survive a refresh**.

The two-risk assertion was replaced because the requirement changed (documented), not to hide a regression.

**`e2e/batch10a.e2e.ts` (new):**
1. Q1 heading and no prefill.
2. Q2: stance heading; prefill copies the amounts, disappears afterwards and does not enable commit; the rationale and prefilled draft survive a refresh; the resolution shows the stance; no reveal.
3. Q3, refreshed at every phase: evidence persists and the fold shows "2 signals cited"; no reveal after a results refresh.
4. Q4: the reveal is open with 8 signals, 2 marked "you cited this" and 1 "not assessed"; no horizontal scroll at 1366px and 375px; it survives a refresh.
5. Q5: the reveal is present and collapsed.

The full-game E2E (`gameplay.e2e.ts`: two teams, Q1→Q8, refresh at every phase, exact economics) passed in both runs with the new rationale flow, so economics are unchanged end to end.

## Visual review (Phase 5)

Screenshots were reviewed at 1366px and 375px:
- the Q2 decision screen with the stance, evidence and risk steps;
- the Q4 reveal.

The reveal was first built as a four-column table, which was cramped at 375px. It was changed to stacked rows (three columns on wide screens, one on phones) and re-verified. No animation, badge or modal was added; the existing fold and type styles are used.

## Not tested

- Classroom timing (estimates only; see the timing plan).
- Concurrent reflection edits from several individual devices beyond "last save wins".
- Production deployment (not performed).

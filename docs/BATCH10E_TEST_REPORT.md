# Batch 10E — test report

Every result below was **executed** in this session on `feature/batch10e-facilitator`, against the local Supabase stack. Nothing was run against production.

## Summary

| Check | Command | Result |
|---|---|---|
| Type-check (app + E2E) | `npm run type-check` | Pass |
| Unit tests | `npx vitest run` | **727 passed**, 18 skipped, 0 failed (+19 in `batch10e.test.ts`) |
| Database integration | `npm run test:db` | **14 passed** |
| Build | `npm run build` | Pass (pre-existing chunk-size warning only) |
| Engine freeze | `git diff --stat 003f697 -- src/simulation src/production/v2/adapter.ts` | **Empty** |
| No database, dependency, valuation or scoring change | `git diff --stat 3f7fd16 -- database package.json package-lock.json src/production/v2/insights/valuation.ts src/production/v2/insights/executive.ts src/simulation` | **Empty** |
| New E2E | `e2e/batch10e.e2e.ts` | First development run failed on a test-helper step (the evidence fold was collapsed); after that fix it passed in 2 development runs and in the full run. |
| Full E2E | `npx playwright test -c e2e/playwright.config.ts` | 24 passed, 1 skipped (compat: needs the pre-migration schema), **1 failed**: `integrity › team commitment: one device commits…` failed at its first step (`joinTeam`: the team screen never appeared), before any Batch 10E code runs. This is the same local-stack stall seen in the 10A runs. |
| Re-run | `… e2e/integrity.e2e.ts --repeat-each 2` | **16 passed** |

## Unit tests (`src/production/v2/batch10e.test.ts`)

| Area | Verified |
|---|---|
| Data model | Each team replays exactly (revenue per quarter equals the engine replay; prices equal the existing valuation). JSON and legacy plain-text reflections decode. Older sessions (no priority or evidence, two risks, no reflections) and teams with no quarters build without errors. |
| **Projector privacy** | Labels are "Team A, B…" in projector view and real names otherwise, with no real name in projector labels and unique labels for 30 teams. Free-text reflections: **none** in projector view until selected; normal view lists all of them, unselected by default; selection is per note and per quarter. |
| **Q3 reveal gate** | Closed with no teams, with only non-started teams, or with any started team below Q4. Open only when every started team has completed Q4. While closed, **no assessment appears in any output** (panel and Q3→Q4 table). Citation counts equal the recorded evidence picks. |
| **Change indicators** | Moves of ±$4M (13 points of a $30M budget) are not flagged. A $5M move is flagged. ±$4.5M (15 points of $30M) is flagged by share. A bigger budget with the same mix gives no change, plus a stated budget context. A forced cut under a $10M cap with the same mix gives no change, plus a stated cap context. Priorities are not compared Q1→Q2 (different questions) but are compared Q5→Q6. The approved thresholds are asserted. |
| **Continuity / adaptation / misalignment** | A stated-rule mismatch ("resilience" with nothing kept as cash) is phrased as a question. Q2 stances have no rule. Across 6 strategies × 8 quarters, all wording is free of grade words and causal claims. Patterns are only starting position, continuity or adaptation. |
| **Team comparisons** | The default quarter is the latest one every team has completed. Class-pattern counts add up to the number of teams. The four columns are filled for every team and quarter (Q3 shows two signals). Q3→Q4 rows. Biggest changes are ordered, with one entry per team and quarter, and use neutral wording. Learning-choice counts. |
| **Stage clock** | Countdown, pause, resume, "Time" at zero, reset, presets 6, 9 and 20. **The module has no imports and no API, phase or quarter calls.** |
| **Board report** | "Intent and outcome" equals the facilitator timeline for the same data. Rationale prompts quote the team's own cited signals, number at most three, and are neutral. |

## E2E (`e2e/batch10e.e2e.ts`)

The test uses two teams with different priorities, Q3 signals and a Q3 change of direction.

1. **Class discussion at Q3:** both rows; the "Signals cited" pattern; the Q3 panel `closed` (0 of 2), with no verdict cells and no override control; the financial comparison is present.
2. **Gate:** after one team completes Q4 it is still closed (1 of 2) with no verdicts; after both, it is open with 8 verdicts.
3. **Projector privacy:** Class discussion shows "Team A". The page text contains no team names, team codes or reflection text. Zero reflections are shown until one note is ticked in normal view; afterwards exactly that note appears, labelled "Team A". The Live table shows anonymised labels and no codes. No horizontal scroll at 1920px.
4. **Stage clock:** the 9:00 preset counts down, pauses and resets. After it ran, the teams' progress and phases are unchanged.
5. **Team timelines:** two team cards. Beta's Q3 is `adaptation` and Q2 `continuity`. No grade words appear. The rules note is present.
6. **Board report** (team finishes Q8): 8 "Intent and outcome" rows; the rationale question "In Q3 you cited…"; no horizontal scroll at 375px.
7. **Final debrief:** the partial-data note (1 of 2 finished), a 3-item running order, 2 ending rows, the Q3→Q4 table, and the "what would you do differently" section.

**Existing E2E tests were not changed.** The tab ids `compare` and `debrief` were kept. Their content is now Class discussion and Team timelines, and `v2-fac-compare` and `v2-debrief-team` are still present.

## Visual review

Screenshots were reviewed:
- Class discussion at 1366px;
- projector view at 1920px;
- a team timeline;
- the final debrief;
- the board report's Intent and outcome table and rationale questions at 375px.

Two fixes followed: the biggest changes were grouped into one entry per team and quarter, and the team label no longer wraps in the projector table.

## Not tested

- Classroom timing (estimates only).
- More than six teams on the projector: no pagination yet, so the table scrolls inside its frame.
- Reflection selection across browsers or devices (by design, it is per facilitator browser session).

# Batch 10F — Test report

Branch `feature/nexlearn-v3-integration`. All runs on 2026-10-13 in the session's cloud workspace. The database is the disposable local PostgreSQL 16 + PostgREST stack (`scripts/v2-local/up.sh`, recreated on every run).

**No shared or production database was used.**

## 1. Results

| Suite | Command | Result |
|---|---|---|
| Type-check (app + e2e) | `npm run type-check` | **Pass** |
| Production build | `npm run build` | **Pass** (the existing chunk-size warning only) |
| Unit and integration (no DB) | `npx vitest run` | **769 passed, 27 skipped.** The skips are the DB-gated suites (21 tests, run below) and 6 env-gated tools (laboratory table writers, calibration sweep, diagnostics, migration check). |
| Database (local, with the V3 migration) | `npm run test:db` | **21 passed** (14 V2 + 7 V3) |
| Database (local, *without* the V3 migration) | V2 suite | **14 passed.** V2 is unaffected before the migration. |
| Browser, full suite (with the V3 migration) | `npm run test:e2e` | **27 passed, 1 skipped** (compat, which needs a pre-migration DB); 15.9 min |
| Browser, compatibility (pre-Batch 7 database, `V2_COMPAT=1`) | `compat.e2e.ts` | **2 passed.** Includes: choosing a V3 path on a pre-V3 database shows a clear message and creates nothing. |
| Browser, V2 suites on a pre-V3 database | `gameplay.e2e.ts`, `batch10e.e2e.ts` | **3 passed.** The new client works before the migration. |
| Economic regression (laboratory invariants) | `npx vitest run scripts/lab/v3/lab.test.ts` | **7 passed** (+1 env-gated writer): V2 freeze, identities, replay, V3-off = V2, impossible states (3 paths × 2 policies), E8 warning before waste, determinism, config restore |

**Historical baseline (Batch 10E report, not rerun as such):**

| Suite | Baseline |
|---|---|
| Unit | 727 passed, 18 skipped |
| DB | 14 passed |
| E2E | 24 passed, 1 skipped, 1 environment stall |

## 2. Browser coverage of the brief (§9.2)

| Requirement | Covered by |
|---|---|
| Multiple teams | `v3` (2 teams, path B); `classroom` (3 teams); `batch10e` (2); `gameplay` (2) |
| Five executive roles | `classroom` (3-, 4- and 6-person teams on individual devices); `integrity` (one device per player) |
| Different strategies and conditions | `v3` (Enterprise-led path B; Consumer-focused path C); laboratory (21 strategies × 3 paths) |
| All three market paths | Browser: B (full) and C (to Q6). Local DB, through the RPCs: A, B and C, Q1–Q8, each equal to the engine. |
| Desktop and mobile | `v3` (1366 px and 390×844, no horizontal scroll); `experience` (laptop, tablet, mobile, projector); `classroom` (mobile results) |
| Refreshes and reconnects | `v3` (refresh at every phase, path B mobile team); `gameplay` (refresh at every phase, facilitator reconnect, browser closed mid-quarter) |
| Invalid decisions | `v3` (contract without room blocked; slow stance without $5M blocked; cost actions disabled outside "cut"); unit tests (every V3 rule); DB (server rejects V3 fields in V2 sessions and an invalid expansion) |
| Simultaneous submissions | `integrity` (two devices plus a double click resolve once); DB (concurrent commit RPCs) |
| Facilitator progression | `v3` (facilitator opens every quarter, path B); `classroom`; `gameplay` |
| Board-report generation | `v3` (market and path contract named); `stage23`; `batch10e` (intent and outcome, defence questions) |

## 3. Batch 10E facilitator checks (§9.4)

| Check | Evidence |
|---|---|
| Class Discussion: accurate comparisons, intentions, decisions, outcomes, reflections | `batch10e` (V2 session); unit `batch10e.test.ts` (19 tests); V3: facilitator model replays with the session's engine and path (unit) |
| Q3 signals: correct per path; gated until every team finishes Q4 | `v3`: gate closed at "0 of 2 teams", then 8 verdicts in path B wording; `paths.test.ts`: assessments per path |
| Projector: anonymous labels; no PIN or codes; reflections hidden by default | `batch10e`; `v3` (no PIN or team codes in projector view) |
| Stage clock: independent; never advances or locks the game | `batch10e` |
| Board report: intent and outcome; defence questions from recorded reasoning; nothing invented | `batch10e`; `stage23`; unit `batch10e.test.ts` |

## 4. Defects found in 10F

| # | Class | Defect | Status |
|---|---|---|---|
| D1 | **P1** | The financing panel disappeared while the plan exceeded the base budget, so a financed expansion could not be entered (budget 30 + X). | **Fixed.** The CFO terms are computed on the plan scaled to the budget; browser test passes. |
| D2 | **P1** | Expansion arbitrage: a borrow-and-repay round trip in one quarter could fund an expansion; a "slow" stance could be combined with a financed expansion. | **Fixed** in the engine, with a unit test. |
| D3 | **P1** (pre-existing) | Session creation could fail with a duplicate-key error. Four-digit admin PINs must be unique among active access codes. | **Fixed in the V3 migration:** retry on collision, 300 consecutive creations tested. Ships with the migration, which needs approval. |
| D4 | P2 (a11y) | The market label in the facilitator top bar failed colour contrast. | **Fixed;** the a11y suite passes. |
| D5 | Test infrastructure | Recurring E2E "page never loads" stalls. Root cause found: browser contexts were never closed and accumulated across the suite (68 browser processes by the last files). | **Fixed:** contexts are closed after every test (`closeAllContexts`), and `joinTeam` fails within 60 s instead of 10 min. Before the fix: one stall per full run (two runs, different tests). After the fix: one clean full run in 15.9 min, down from 28 min. One clean run is evidence, not proof. |
| D6 | Test | Race in the new path C test (reload during the move to the next quarter). | **Fixed** (waits for the phase first). |

**No P0 defects were found. No P1 defects remain open.**

## 5. Not verified

- **A real classroom, or a timed rehearsal with people** (see `BATCH10F_CLASSROOM_TIMING_REPORT.md`).
- **Browser runs of path A in V3 and of path C beyond Q6.** These paths were verified Q1–Q8 through the RPCs on the local DB and in the laboratory, but not in a browser.
- **The production database.** The migration has not been applied anywhere shared.
- **Real phones.** Mobile is emulated by viewport size in Chromium.

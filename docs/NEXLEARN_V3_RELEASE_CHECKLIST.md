# NexLearn V3 — Release checklist

**Legend:**
- ☑ done and verified in this assignment
- ☐ requires the product owner (approval or action)

## Product

- ☑ Eight quarters work in all three paths. Verified by the browser test for path B (one team Q1–Q8); the local DB test (Q1–Q8 for A, B and C); and the laboratory (21 strategies × 3 paths).
- ☑ Five executive roles work. Verified by the shared-device and individual-device browser suites.
- ☑ Three market paths, selected per session and fixed once play starts.
- ☑ Major executive decisions:
  - Q4 destination;
  - Q5 contract with budget claim;
  - Q6 stance;
  - Q7 crisis;
  - Q8 option;
  - financing and financed expansion.
- ☑ Facilitator functionality (Batch 10E) on V2 and V3 sessions.
- ☑ Board reports, including market and path-specific contract wording.

## Economics

- ☑ V3 engine validated (`BATCH10F_ECONOMIC_VALIDATION.md`). Most hypotheses are met; partial items are listed in `NEXLEARN_V3_KNOWN_LIMITATIONS.md`.
- ☑ V2 engine and adapter unchanged (diff vs `003f697` is empty).
- ☑ Financial calculations reconcile: identities, replay, the cash bridge in the browser, contract cost counted once, expansion netted.
- ☑ Strategic choices produce credible, context-dependent consequences.

## Engineering

- ☑ Type-check (app and e2e).
- ☑ Production build.
- ☑ Unit tests: 769 passed, 27 skipped (the skipped tests are DB-gated suites run separately).
- ☑ Local DB tests: 21 passed (14 V2 + 7 V3).
- ☑ Browser tests: see `BATCH10F_TEST_REPORT.md` for the final run and any environment stall.
- ☑ No unresolved P0 defects.
- ☑ No unauthorized database changes. The V3 migration was applied only to the disposable local database.

## Education

- ☑ Student reasoning captured: priority, evidence, belief, confidence, risk, notes, reflections (10A), plus the Q6 stance.
- ☑ Decisions create meaningful trade-offs (stance study; contract by strategy; expansion study).
- ☑ Results support reflection: path-specific Q4 reveal; consequence lines for claim, stance, expansion and ceiling.
- ☑ Facilitators can compare teams: Class Discussion, timelines and final debrief, per path.
- ☐ A structured 90-minute session is supported by the product, but **not validated with a timed rehearsal**.

## Release (product owner)

- ☑ All changes committed locally on `feature/nexlearn-v3-integration`.
- ☑ Documentation completed.
- ☑ Deployment instructions prepared (`NEXLEARN_V3_DEPLOYMENT_PLAN.md`).
- ☑ Known limitations documented.
- ☑ No push, merge or deployment performed.
- ☐ Approve the release candidate.
- ☐ Approve and apply `MIGRATION_V3_MARKET_PATHS.sql` to production (with a backup).
- ☐ Push the branch, review the pull request, verify the preview, merge.
- ☐ Timed rehearsal before the first graded class.

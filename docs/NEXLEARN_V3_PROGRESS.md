# NexLearn V3 — progress record

Read `NEXLEARN_V3_MASTER_SPEC.md` first. Then check `git log` on `feature/nexlearn-v3-integration` against the checkpoints below.

## Current batch

**10B — V3 economic engine**: repository inspection complete; engine fork not started.

## Repository facts (verified at start)

| Item | Finding |
|---|---|
| Integration branch | `feature/nexlearn-v3-integration`, created from `7e103fa` (Batch 10E tip). It contains Batch 10A (c5011f8, aac1a6b, d7ca7cf, 3f7fd16), Batch 10 design (bac387b) and Batch 9 (4b79a02). |
| Preserved branches | `feature/batch10a-student-learning` (3f7fd16) and `feature/batch10e-facilitator` (7e103fa) are unchanged |
| Frozen V2 engine | `src/simulation/*` and `src/production/v2/adapter.ts`. The freeze test is `scripts/lab/batch9/lab.test.ts` (`git diff --stat 003f697 -- src/simulation src/production/v2/adapter.ts` must be empty). **The whole `src/simulation` directory is frozen, so the V3 fork lives in `src/simulationV3/`.** |
| Batch 9 lab | `scripts/lab/batch9/` (runner, strategies, experiments); `docs/batch9/`; `docs/BATCH9_ECONOMIC_BALANCE_REPORT.md` |
| Batch 10 design | `docs/BATCH10_V3_ECONOMIC_DESIGN.md` (E1–E10), `BATCH10_V3_VALIDATION_PLAN.md` (H1–H13), `BATCH10_IMPLEMENTATION_ROADMAP.md`, `docs/batch10/diagnostics.json` |
| Snapshot contract | `src/production/v2/snapshot.ts`: `engineVersion: 'v2-econ-batch4-frozen'`, strict `assertSnapshotContract` |
| Server | Supabase RPCs (`SECURITY DEFINER`; block-all RLS). `sessions.engine_version` CHECK ('v1','v2'). `v2__check_input` requires the allocation total to equal `v2__envelope` (30; Q8 45/60). The client resolves quarters and stores snapshots (SEC-002). |
| Local DB | `scripts/v2-local/up.sh`: PostgreSQL in `/tmp/v2pg`; the database is dropped and recreated on every run. **Confirmed disposable.** |
| Facilitator/board integration | `ui/V2Facilitator.tsx`, `ui/FacilitatorDiscussion.tsx`, `insights/facilitator.ts`, `insights/intentOutcome.ts`, `ui/stages/FinalStage.tsx` |

## Completed work

- [x] Master spec saved (`docs/NEXLEARN_V3_MASTER_SPEC.md`)
- [x] Repository inspection

## Git commits (this assignment)

_None yet._

## Test results

_Not run yet in this assignment._ The historical 10E baseline was 727 unit passed / 18 skipped; 14 DB; E2E 24 / 1 skipped / 1 environment stall.

## Known issues

- E2E environment stalls (a page never loads or a fetch hangs for minutes). They recur about once per full run, on a different test each time. To be investigated in 10F.

## Unresolved dependencies

- A V3 session needs database support: `engine_version 'v3'` and a market-path column. Migration to be prepared and tested locally; production application needs approval.

## Next implementation task

Fork the V2 engine into `src/simulationV3/` and implement the V3 mechanisms (E1–E4, E9).

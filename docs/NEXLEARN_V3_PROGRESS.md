# NexLearn V3 — progress record

Read `NEXLEARN_V3_MASTER_SPEC.md` first. Then check `git log` on `feature/nexlearn-v3-integration` against the checkpoints below.

## Current batch

**10C — executive decisions.** The engine rules for E5, E6 and E7 are already implemented and tested (done during 10B, because the laboratory needed them). Remaining for 10C:
- UI for the contract claim, recession stance and budget expansion;
- E8 saturation warning;
- decision transparency;
- the 10C report.

## Repository facts (verified at start)

| Item | Finding |
|---|---|
| Integration branch | `feature/nexlearn-v3-integration`, created from `7e103fa` (Batch 10E tip). |
| Preserved branches | `feature/batch10a-student-learning` (3f7fd16) and `feature/batch10e-facilitator` (7e103fa) are unchanged. |
| Frozen V2 engine | `src/simulation/*` and `src/production/v2/adapter.ts` (no diff vs `003f697`; asserted by `scripts/lab/batch9/lab.test.ts` and `scripts/lab/v3/lab.test.ts`). |
| V3 engine | `src/simulationV3/engineV3*.ts` (fork). Switches and constants: `engineV3Config.ts`. Paths: `engineV3Paths.ts` (A/B/C all equal the V2 arc until 10D). |
| V3 adapter | `src/production/v3/adapter.ts` (`engineVersion 'v3-econ-1.0'`, `marketPath`). |
| Facade | `src/production/v2/engine.ts`: every UI, insight and service call dispatches on the snapshot. `GameConfig` = `{engine:'v2'}` or `{engine:'v3', path}`. |
| Session config | `gameService.sessionConfig(session)` reads `econ_engine` and `market_path`; these columns come from the 10D migration and are absent today, which means V2. |
| Server | `v2__check_input` requires the allocation total to equal `v2__envelope` (30; Q8 45/60). E7 expansion therefore needs a V3 branch in the migration (10D). |
| Local DB | `scripts/v2-local/up.sh` recreates `/tmp/v2pg` on every run (disposable). |

## Completed work

- [x] Master spec saved
- [x] Repository inspection
- [x] V3 fork, facade and config-aware call sites (6681209)
- [x] 10B mechanisms E1–E4, valuation VAL-1.1 (E9), and engine rules E5–E7 (2b53e03)
- [x] V3 laboratory `scripts/lab/v3/` with tables `docs/v3lab/tables.md` and `results.json`
- [x] `docs/BATCH10B_V3_ECONOMIC_REPORT.md` and `docs/BATCH10B_V2_V3_COMPARISON.md`

## Git commits (this assignment)

| Commit | Content |
|---|---|
| 6681209 | V3 fork, engine facade, config-aware integration |
| 2b53e03 | E1–E4 economics, E5–E7 rules, V3 laboratory |
| (next) | 10B reports and progress update |

## Test results

| Run | Result |
|---|---|
| Unit (full suite, after 2b53e03) | 753 passed, 20 skipped |
| Laboratory invariants | 5 passed (plus the table writer under `V3LAB_WRITE=1`) |
| Type-check | clean |
| DB / E2E | not run yet in this assignment |

## Known issues

- E2E environment stalls: a page never loads, or a fetch hangs for minutes. They recur about once per full run, on a different test each time. To be investigated in 10F.

## Unresolved dependencies

- Database support for V3 sessions (`econ_engine`, `market_path`, `v3_create_session`, V3 input check with expansion). To be prepared in 10D and tested only on the local disposable database.

## Decisions taken (within the brief)

| Decision | Rationale |
|---|---|
| V3 sessions keep `engine_version='v2'` (the platform and RPC family), with a separate `econ_engine` column | No existing RPC or check changes for V2 sessions. |
| E5 contract claim | The upfront cost must be held in reserve: allocation still totals the budget, the cost is recorded once as an event cost tagged "paid from the strategic budget", and the tolerance is $0.01M. |
| E6 recession stance | A stance is required in Q6 (V3): `protect` means no cost cuts; `slow` means ≥ $5M reserve; `cut` means at least one cost action. A hiring freeze with People funded is still rejected by the engine; the UI moves People to reserve first. |
| E7 expansion | Budget = 30 + expansion, Q2–Q7 only, at most $10M. The expansion must be funded by debt or equity raised that quarter, and the expanded plan must keep closing cash ≥ $25M. |

## Next implementation task

10C UI:
1. Decision stage: stance selector in Q6 (with the freeze → People-to-reserve conversion shown).
2. Contract claim shown as "$X of your $30M".
3. Expansion control in the CFO financing panel (budget shown as 30 + X).
4. Saturation warning (E8) in both engines.
5. Decision summaries and the board resolution show stance, claim and expansion.
6. Report.

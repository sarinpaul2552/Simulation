# NEXLEARN V3 — FINAL RELEASE CANDIDATE REVIEW

**Release status: AMBER — release candidate ready for approval, not yet releasable.**
- All automated tests pass and no P0 or P1 defect is open.
- Two release conditions are outside this assignment's authority:
  1. the V3 database migration must be approved and applied to production;
  2. classroom timing has not been validated with people.
- One economic target (H9, cross-path ranking variety) is only partly met.

**Branch:** `feature/nexlearn-v3-integration` (local), from `7e103fa` (Batch 10E). **Not pushed, merged or deployed.** No shared or production database was touched.

## 1. Batch 10B — V3 economic engine

- **Separate engine.** `src/simulationV3/` (`v3-econ-1.0`) is a fork of the 14 V2 modules.
  - The V2 engine and adapter are byte-identical to `003f697`.
  - With every V3 switch off, V3 reproduces V2 state for state (unit and laboratory tests).
- **Engine facade.** `production/v2/engine.ts` dispatches by snapshot.
  - Existing V2 sessions replay exactly as before.
  - A session's engine is fixed at creation and never migrates.
- **Mechanisms:**
  - **E1** AI revenue converges to the level adoption supports.
  - **E2** Enterprise conversion: win rate, pipeline, faster recognition, lighter delivery commitment.
  - **E3** University conversion: Credential-driven wins, faster go-live.
  - **E4** Organizational health: overload erodes culture, recovery, strain, layoff aftershocks.
  - **E9** Valuation NXLN-VAL-1.1: an organizational-health factor at 8%; VAL-1.0 unchanged.
- **Laboratory** `scripts/lab/v3/`. It plays through the production adapters:
  - 17 strategies plus 4 probes;
  - sensitivity tests (±25%, Spearman ≥ 0.98);
  - market variants, stances, financing, contract and marginal returns;
  - three paths.
- Reports: `BATCH10B_V3_ECONOMIC_REPORT.md`, `BATCH10B_V2_V3_COMPARISON.md`.

## 2. Batch 10C — Executive decisions

- **Q5 contract (E5).** Its cost is claimed from the $30M budget and counted once. The screen shows "$X of your $30M"; a "make room" button helps.
- **Q6 recession stance (E6).** Required: protect, slow (≥ $5M kept) or cut.
  - A hiring freeze moves People to cash.
  - Cost actions are available only under "cut".
- **Financing (E7).** Financed budget expansion: at most $10M, Q2–Q7, funded by net new capital, cash floor $25M.
  - No borrow-and-repay round trip.
  - Not combined with "slow".
- **Capability ceilings (E8).** A warning before waste (9 of 10 wasting games warned in an earlier quarter) and a ceiling consequence in results.
- **Transparency.** The decision, information, known costs and uncertainty are stated for each event. Summaries, the board resolution and consequences reflect the claim, stance and expansion.
- Report: `BATCH10C_EXECUTIVE_DECISION_REPORT.md`.

## 3. Batch 10D — Three market paths

| Path | Story | Q5 offer | Downturn |
|---|---|---|---|
| **A · AI Acceleration** | The original arc: mass-market consumer AI; usage versus payment | $48M global contract | Recession in Q6 |
| **B · Enterprise Transformation** | Employers fund AI reskilling; self-paid consumer learning stops growing; delivery at scale decides | $64M consortium programme | Shallow squeeze |
| **C · Economic Pressure** | Early tightening, then a deep recession; free-tier AI; counter-cyclical credentials; partial recovery | $32M price-tight vendor contract | Deep, from Q5 |

- Eight coherent quarters in each path, with authored signals and path-specific student content (cards, chapters, role briefs, plain-language text, Q3 assessments).
- The facilitator chooses the path at session creation. It cannot be changed once a team starts (database trigger and RLS). The snapshot's engine and path must match the session (server check).
- 10A and 10E integration per path:
  - the same Q3 evidence options;
  - the path's Q4 reveal;
  - the Q3 panel and gate;
  - timelines and board report.
- Report: `BATCH10D_MARKET_SCENARIOS.md`.

## 4. Batch 10F — Validation results

| Suite | Result |
|---|---|
| Type-check (app + e2e) | Pass |
| Production build | Pass |
| Unit | 769 passed, 27 skipped (DB- and env-gated) |
| Database (local, with V3 migration) | 21 / 21 passed |
| Database (local, without V3 migration) | V2 14 / 14 passed |
| Browser, full suite | 27 passed, 1 skipped (compat), 15.9 min |
| Browser, compatibility (pre-Batch 7) | 2 / 2 passed |
| Browser, V2 suites (pre-V3 database) | 3 / 3 passed |
| Economic invariants | 7 / 7 passed. No impossible states across 3 paths × 17 strategies × 2 policies. 0 default-policy insolvencies. |

Details: `BATCH10F_TEST_REPORT.md`, `BATCH10F_ECONOMIC_VALIDATION.md`.

## 5. Batch 10A and 10E remain functional

- Their browser suites pass on V2 sessions: `batch10a`, `batch10e`, `classroom`, `gameplay`, `integrity`, `stage1`, `stage23`, `experience`, `a11y`.
- They also pass on a pre-V3 database.
- On V3, the path B browser test verifies:
  - the Q4 reveal in path B wording;
  - the facilitator Q3 gate (closed at 0 of 2 teams, then 8 verdicts);
  - the projector without PIN or codes;
  - the board report.
- Integration changes to 10A and 10E were limited to:
  - passing the session's engine and path;
  - three generalised Q3 source labels;
  - path-specific contract names.

## 6. V2 versus V3 (path A, same player and policies)

- Price-ranking correlation is 0.95. The changes are targeted:
  - AI-only −$9.8 and AI-led −$5.4;
  - Enterprise-only +$29.3 and Enterprise-led +$30.8;
  - University-led +$16.1;
  - Diversified −$6.9 (overload).
- Deep layoffs: V2 raised the price for 7 of 8 strategies; V3 lowers it for 6 of 8, while profit still rises.
- Cross-path findings:
  - The top constant allocation differs by path (Consumer focus in A and C; Enterprise focus in B).
  - A path-reading adaptive team is the top named strategy in every path.
  - The overall ranking stays similar (Spearman 0.90–0.95).

## 7. Database changes requiring approval

`database/MIGRATION_V3_MARKET_PATHS.sql` is **tested only on the disposable local database**. It is additive and idempotent. It adds or changes:
- `sessions.econ_engine` and `market_path`, with constraints and an immutability trigger;
- `v3_create_session`;
- the V3 input check and the snapshot-engine check;
- re-declared `v2_init_game`, `v2_resolve_quarter`, `v2__game_json`, `v2_facilitator_overview`;
- `v2_create_session` with the PIN-collision retry (defect D3).

No access-control semantics change. The only new public RPC is `v3_create_session`.

## 8. Known limitations

See `NEXLEARN_V3_KNOWN_LIMITATIONS.md`. The main ones:
- no rehearsal;
- H9 partly met;
- H1, H4 and H5 partly met;
- slow-building buckets do not pay back at the margin within eight quarters;
- SEC-001 and SEC-002 deferred;
- one clean full browser run since the stall fix.

## 9. Outstanding P0 / P1 defects

**None open.** Fixed in 10F:
- **D1** expansion entry blocked by the hidden financing panel;
- **D2** expansion arbitrage;
- **D3** session-creation PIN collision, pre-existing; the fix ships with the migration.

## 10. Classroom timing: actual versus estimated

- **Actual:** not measured. No timed rehearsal or pilot took place.
- **Estimated:** the 90-minute plan is unchanged; V3 adds about 1–2 minutes over eight quarters.
- Automated walk-throughs (no discussion time): 2 minutes for a two-team path B session.

See `BATCH10F_CLASSROOM_TIMING_REPORT.md`.

## 11. Git

| Commit | Content |
|---|---|
| 6681209 | V3 fork, engine facade, config-aware integration |
| 2b53e03 | E1–E4, E5–E7 rules, laboratory |
| ee504fa | 10B reports |
| 798fff5, 4f5ce19 | 10C UI, E8, report |
| af0c8c4, 7fc84a6 | 10D paths, content, migration, setup UI, report |
| 8282ad3, ff0f2aa, f307126 | 10F browser tests, fixes, validation and release documents |
| 2de6940 | handoff, test report and progress |

The preserved branches are unchanged: `feature/batch10a-student-learning` (3f7fd16) and `feature/batch10e-facilitator` (7e103fa).

## 12. Steps for final approval and deployment

1. Review this document, the known limitations and the validation report. Decide whether H9's partial result is acceptable for release.
2. **Approve the migration** `MIGRATION_V3_MARKET_PATHS.sql` for production. Take a backup first.
3. On your machine, run `NEXLEARN_V3_PUSH.ps1` from the `Simulation` folder. It fetches the bundle and pushes only the feature branch.
4. Open a pull request into `main`; Vercel builds a preview.
5. Apply the migration in Supabase (deployment plan §2), then verify on the preview:
   - a V2 session;
   - a path B session with two teams through Q6;
   - an in-progress older session.
6. Merge, then smoke-test production.
7. Run one timed rehearsal before the first graded class.

Full procedure: `NEXLEARN_V3_DEPLOYMENT_PLAN.md`.

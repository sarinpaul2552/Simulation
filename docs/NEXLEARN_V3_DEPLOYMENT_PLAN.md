# NexLearn V3 — Deployment plan

**Nothing in this plan has been executed.** No push, merge, migration or deployment was performed in this assignment. Every step needs the product owner's approval.

**Inputs:**
- local branch `feature/nexlearn-v3-integration`, based on `7e103fa` (Batch 10E);
- the bundle and push script prepared with the handoff.

## 0. Pre-requisites

- Approval of this release candidate (`NEXLEARN_V3_FINAL_HANDOFF.md`).
- **Approval to apply `database/MIGRATION_V3_MARKET_PATHS.sql` to the production Supabase project.** The migration:
  - is additive;
  - is idempotent;
  - changes no existing row's meaning;
  - re-declares `v2_init_game`, `v2_resolve_quarter`, `v2__game_json`, `v2_facilitator_overview` and `v2_create_session` with their prior behaviour, plus the V3 checks and the PIN-collision retry.
- A Supabase backup or point-in-time recovery marker taken immediately before the migration.

## 1. Publish the branch (product owner's machine)

1. Fetch the bundle into the local clone: `git fetch <bundle> feature/nexlearn-v3-integration:feature/nexlearn-v3-integration`.
2. Push the branch: `git push origin feature/nexlearn-v3-integration` (the prepared script does this; nothing is force-pushed).
3. Open a pull request into `main`. Vercel builds a preview deployment.

## 2. Database (production Supabase, approved window)

Apply the migrations in order. Batch 7 and 7.5 are already applied in production, according to earlier batches; verify first.

1. Verify the prerequisites:
   - `select column_name from information_schema.columns where table_name='sessions' and column_name in ('commitment_mode','presentation_mode');` must return 2 rows.
2. Run `database/MIGRATION_V3_MARKET_PATHS.sql` in the SQL editor.
3. Verify:
   - `select econ_engine, market_path, count(*) from sessions group by 1,2;` → only `v2 | null` rows.
   - `select proname from pg_proc where proname in ('v3_create_session','v3__check_input','v3__check_snapshot_engine');` → 3 rows.
4. Reload the PostgREST schema cache (Supabase does this automatically after DDL; otherwise restart the API).

**Rollback (if needed before any V3 session exists):**
1. Restore the previous function definitions by re-running `MIGRATION_V2_BATCH7_5_COMMITMENT.sql`. It re-declares `v2_create_session`, `v2_resolve_quarter`, `v2__game_json` and `v2_facilitator_overview`.
2. Re-run `v2_init_game` from `MIGRATION_V2_PRODUCTION.sql`.
3. Drop `v3_create_session` and the trigger.

The added columns can stay: they default to V2.

## 3. Preview verification (Vercel preview + production database)

1. Facilitator: create a **V2 ("Original NexLearn")** session; play Q1 with one team. This checks V2 compatibility.
2. Create a **path B** session with two teams. Play to Q6 on a phone and a laptop:
   - the contract claim in Q5;
   - the stance in Q6;
   - an expansion in Q2.
3. Open an existing pre-V3 session (if any is in progress) and confirm it loads and continues unchanged.
4. Projector view: no PIN or team codes.

## 4. Release

1. Merge the pull request into `main` after review. Vercel deploys `simulation26`.
2. Smoke test production, as in step 3.
3. Announce to facilitators with `NEXLEARN_V3_CLASSROOM_PLAYBOOK.md`.
4. Run the recommended timed rehearsal before the first graded class.

## 5. Post-release monitoring

- Session creation errors (should be none after the PIN-collision fix).
- Any "Snapshot engine does not match this session" errors. These indicate a stale client bundle: ask users to refresh.
- Facilitator audit ("Verify") on the first V3 classes.

# V2 Production Integration (Autonomous Batch 5)

V2 economics are frozen (Batch 4, `05dec63`). Batch 5 connects the frozen engine to real classroom gameplay. No file under
`src/simulation`, `src/testlab` or the V1 components was changed.

## Architecture

```
Browser (anon key only)                                   Supabase (Postgres, strict RLS)
  V2 UI (src/production/v2/ui)                              v2_team_games        snapshot + phase + draft + headline
   └ useV2Team (server-mirrored controller)                v2_quarter_resolutions PK(team,quarter): committed input
      └ gameService (load/verify/commit)   ── RPC ──▶      v2_votes             PK(team,quarter,role)
         └ adapter (pure) ── frozen V2 engine              SECURITY DEFINER RPCs (code-validated, search_path pinned)
```

- **Adapter** (`src/production/v2/adapter.ts`) is the only path into the engine. It builds engine input exactly like the
  Test Lab arc runner (parity-tested across every arc strategy, financing/insolvency paths and a strategic sale).
- **Snapshot contract** (`snapshot.ts`): `{schema:'v2-game-snapshot', schemaVersion:1, engineVersion:'v2-econ-batch4-frozen',
  completedQuarter, state, inputs[]}`. Lossless codec (Infinity / −0 / NaN tagged). The input log is the replayable
  source of truth; every load re-verifies the snapshot by replay and against the server's resolution rows.
- **Resolution** runs the deterministic engine client-side; the server accepts it once: row lock, PK(team, quarter),
  compare-and-set `state_version`, phase `commit`, quarter open, five votes, committed input == voted draft,
  snapshot extends the stored log with exactly this input. Duplicates return `already_resolved`.
- **Facilitator integrity audit** replays each team's committed decisions and compares with the stored headline.

## Classroom loop (per quarter)
briefing (shared scenario + private role briefs, pass-the-device) → decide (allocation; Q4 destination; Q5 contract;
Q6 recession menu; Q7 crisis; Q8 earned options; CFO forecast + financing) → belief → risks → vote (private, sequential,
hidden until five, revealed together, advisory) → commit → results (plain-language causes) → reflect → next quarter
(facilitator-opened or self-paced) … → final outcome (frozen `scoreV2Company` + earned Q8 option).

## Deploy
1. Supabase SQL editor: run `database/MIGRATION_V2_PRODUCTION.sql` (after the strict RLS migration; idempotent).
2. Vercel env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (anon key). Never the service role.
3. V1 fallback (dev only): `VITE_ENABLE_V1_FALLBACK=true` or `localStorage.ENABLE_V1_FALLBACK = 'true'`.

## Verify locally
- `npm test` — unit + parity + contract tests (DB tests skip without a stack).
- `npm run db:local` — PostgreSQL 16 + PostgREST (Supabase-shaped `/rest/v1`), applies schema + strict RLS + V2 migration twice.
- `npm run test:db` — live-DB security / voting / idempotency / concurrency / Q1–Q8 persistence parity.
- `npm run test:e2e` — Playwright against the running app + local stack.

## Known limitations
- The server cannot recompute economics (no server-side engine); tampering is detected by replay (on every load and by
  the facilitator audit), not prevented.
- Scenario market truth ships in the client bundle (client-side engine); it is never displayed.
- Access codes expire after 48 h (existing policy); a class spanning longer needs new codes.
- Team code alone authorises team RPCs (as for the existing V1 `get_team_state`).

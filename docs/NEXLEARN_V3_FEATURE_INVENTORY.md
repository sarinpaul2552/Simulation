# NexLearn V3 — Feature inventory

Branch `feature/nexlearn-v3-integration` (local). The ✔ marks show what is verified, and how.

**Legend:**
- **U** — unit test
- **D** — local database test
- **E** — browser end-to-end test
- **L** — laboratory (headless economic study)

## Economics (Batch 10B) — `src/simulationV3/`

| Feature | Files | Verified |
|---|---|---|
| Separate V3 engine (fork of the 14 V2 modules); V2 frozen | `engineV3*.ts`; freeze assertion | U, L ✔ |
| Mechanism switches and calibration in one place | `engineV3Config.ts` | U ✔ |
| E1: AI revenue converges to the level adoption supports | `engineV3Revenue.ts` | U, L ✔ |
| E2: Enterprise conversion (win rate, pipeline, 50/50 recognition, lighter delivery commitment) | `engineV3Commercial.ts`, `engineV3Revenue.ts`, `engineV3Costs.ts` | L ✔ |
| E3: University conversion (Credential win rate, pipeline, Q+1..Q+3 recognition) | as above | U, L ✔ |
| E4: Organizational health (overload, recovery, strain, layoff aftershocks) | `engineV3Capabilities.ts`, `engineV3Management.ts` | U, L ✔ |
| E9: Valuation NXLN-VAL-1.1 (organizational health factor); VAL-1.0 unchanged | `insights/valuation.ts` | U, L ✔ |
| Engine facade: dispatch by snapshot; V3 snapshots carry `marketPath` | `production/v2/engine.ts`, `snapshot.ts`, `production/v3/adapter.ts` | U, D ✔ |
| V3 laboratory (17 strategies, sensitivity, market variants, stances, financing, contract, marginal, paths) | `scripts/lab/v3/` | L ✔ |

## Executive decisions (Batch 10C)

| Feature | Verified |
|---|---|
| E5: the Q5 contract cost is claimed from the budget, counted once; "make room" button | U, D, E ✔ |
| E6: required Q6 stance (protect / slow / cut); freeze moves People to cash; cost actions only under "cut" | U, D, E ✔ |
| E7: financed budget expansion (≤ $10M, Q2–Q7, net new capital, cash floor $25M; no round trip; not with "slow") | U, D, E ✔ |
| E8: saturation warning (both engines) and ceiling consequence in results | U, L ✔ |
| Decision summaries, board resolution and consequence lines state the claim, stance and expansion | U ✔; E (partial) |
| V2 games reject V3-only fields (client facade and server) | U, D ✔ |

## Market paths (Batch 10D)

| Feature | Verified |
|---|---|
| Path A (AI Acceleration, the original arc), B (Enterprise Transformation), C (Economic Pressure); eight quarters each | U, L ✔ |
| Path-specific contracts ($48M / $64M / $32M) | U, D, E ✔ |
| Path-specific student content (cards, chapters, plain text, role briefs, Q3 assessments, reveal summary) | U ✔; E (path B reveal and Q3 panel) |
| Facilitator selects the path at session creation; shown in setup, dashboard and board report | E ✔ |
| Path immutable once a team has started; snapshot engine and path must match the session (server) | D ✔ |
| 10A integration: Q3 evidence ids shared by all paths; Q4 reveal reads the path | U, E ✔ |
| 10E integration: Class Discussion, Q3 panel and gate, timelines, defence prompts per path | U, E ✔ |

## Preserved (Batch 10A and 10E, re-verified)

| Feature | Verified |
|---|---|
| Batch 10A student learning: framing, evidence, confidence, risk, reflection autosave, prefill, Q4 reveal | E ✔ (V2 session; V3 path B for the reveal) |
| Batch 10E facilitator: discussion, Q3 gate, projector privacy, timelines, stage clock, final debrief, board report | E ✔ (V2 session; V3 path B for the gate and panel) |

## Database (prepared; local only)

| Item | Status |
|---|---|
| `database/MIGRATION_V3_MARKET_PATHS.sql`: columns, trigger, `v3_create_session`, V3 input check, snapshot-engine check, game JSON and overview fields | D ✔ on the disposable local DB; **not applied to any shared or production project** |
| Defect fix: session creation retries on an access-code collision | D ✔ (300 consecutive sessions) |

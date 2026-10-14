# Batch 8.1 production deployment (12 October 2026)

| | |
|---|---|
| Production URL | https://simulation26.vercel.app (Vercel project simulation26, deploys `main`) |
| Deployed code | `main` @ f141453 (Batches 7.5, 8 and 8.1), then the fix in bf1dbcd |
| Database | Supabase project Simulationedtech |
| Engine | Frozen. `git diff 003f697 -- src/simulation src/production/v2/adapter.ts` is empty |
| Models | Valuation NXLN-VAL-1.0; executive scoring NXLN-EXEC-1.1 |

## 1. What was integrated

`main` was fast-forwarded from 003f697 to f141453. This brought in, in order:

1. `feature/batch7-5-experience-refinement`
2. `feature/batch8-executive-leadership` (Stages 1–3)
3. `feature/batch8-1-classroom-readiness`

All three branches were also pushed to GitHub. There was no merge commit and no rebase.

## 2. Database migrations

Applied to production in the Supabase SQL editor, in this order. They are combined in `DEPLOY_BATCH8_1_MIGRATIONS.sql`, which is kept outside the repository.

1. `database/MIGRATION_V2_BATCH7_EXPERIENCE.sql`
   - Adds `sessions.presentation_mode`.
   - Adds the RPCs `v2_facilitator_set_presentation_mode` and `v2_facilitator_debrief`.
2. `database/MIGRATION_V2_BATCH7_5_COMMITMENT.sql`
   - Adds `sessions.commitment_mode` and the `v2_commitments` table (block-all RLS).
   - Adds the RPCs `v2_confirm_commitment` and `v2_facilitator_set_commitment_mode`.
   - Updates `v2_set_phase` and `v2_resolve_quarter`.
3. `NOTIFY pgrst, 'reload schema'`

Both migrations only add things and can safely be run more than once. Before production, they were tested on a local database at the production schema level:

- each was applied twice;
- all 14 database tests passed afterwards.

Existing sessions keep their behaviour: voting-disabled sessions get `none`, and every other existing session gets `private_vote`.

**Production check after migrating:**
- The publishable key reads `sessions.commitment_mode` and `sessions.presentation_mode`.
- `v2_commitments` refuses direct reads (permission denied), as designed.
- New sessions offer Team Commitment and MBA mode with no "older schema" warning.

## 3. Automated tests (before the push)

| Suite | Result |
|---|---|
| Unit (`npx vitest run`) | 680 passed |
| Live database (`npm run test:db`), migrated schema | 14 passed |
| Migration check (Batch 7.5 on a pre-7.5 schema) | 1 passed |
| E2E (Playwright), current schema | 23 passed, 1 skipped |
| E2E compatibility (`V2_COMPAT=1`, `V2_COMPAT_LEVEL=7`) | passed |
| E2E `stage23` after the deploy fix (includes new 375px board-report check) | 2 passed; the new check fails without the fix (232px overflow) |
| Type-check, production build | pass |

## 4. Production playthrough

All play went through the deployed site, in the built-in browser, against the production database.

Session `ISB-3F4B8B` used MBA mode, Team Commitment and self-paced pacing, with three teams:
- Alpha and Beta played on desktop width.
- Gamma played on a 375 × 812 phone viewport.

Every quarter followed the classroom flow:
1. The five confidential briefings.
2. The decision, with per-bucket estimates and the cash forecast.
3. The structured discussion.
4. The Team Commitment statement (agreed, discussed and leader all used).
5. Commit.
6. Results.
7. A reflection.

Figures were cross-checked against a local replay of the same inputs (`scripts/prod-verify/expected.test.ts`).

| Team | Strategy | Q8 share price (production / local) | Revenue | Cash | Terminal | Integrity |
|---|---|---|---|---|---|---|
| Alpha | Balanced, Balanced Marketplace | $136.92 / $136.92 | $217.7M | $90.8M | 76.8 | verified |
| Beta | Evidence-responsive, Enterprise AI, accepts contract | $148.82 / $148.82 | $233.4M | $81.2M | 80.3 | verified |
| Gamma | Consumer + AI, hiring freeze in recession | $164.53 / $164.53 | $241.5M | $111.0M | 81.6 | verified |

Intermediate prices also matched at every quarter checked:
- Alpha Q1 $100.50, Q4 $104.31, Q5 $111.14, Q7 $120.86.
- Beta Q2 $98.70.
- Gamma Q5 $134.74.

**What was confirmed on every quarter, for all three teams:**
- The cash bridge and the valuation bridge reconcile.
- The Level 1 briefing (developments and board question) shows first, and the deep analysis starts closed.
- The commit button is disabled until a commitment statement is chosen.

**Executive scorecards**
- The board report matches the local replay. For example, Alpha's executive scores are CEO 79, CFO 68, CPO 74, CGO 65, CPeO 72.

**Facilitator awards (Leadership and awards tab)**

| Award | Winner(s) | Score |
|---|---|---:|
| Best CEO | Beta and Gamma (shared) | 94.4 |
| Best CFO | Gamma | 87.4 |
| Best Product | Alpha | 78.1 |
| Best Growth | Gamma | 73.0 |
| Best People | Alpha and Beta (shared) | 74.1 |
| Best Overall Team | Gamma | 79.7 |

These are identical to the local computation.

**Other facilitator checks**
- The debrief shows decisions and team agreement statements.
- "Verify integrity" reports *verified* for all three teams.

**Final board report**
- Present: the board verdict (five dimensions), the four lenses, all report sections and six defense prompts.
- No NaN or undefined values appear.

## 5. Defect found and fixed

**The Q8 board report scrolled sideways on phones.** Two tables caused it:
- The four-lenses table kept "CEO 86 · CFO 67 · …" on one line.
- The six-column scorecard summary was too wide.

At 375px this added 232px of horizontal scroll; at about 640px it added 18px. The quarterly results, decision and facilitator screens did not overflow.

**Fix (bf1dbcd)**
- The lens values now wrap.
- Both tables sit in `.ds-table-wrap`.
- On phones, the Company and Main challenge columns are hidden. The full scorecard still shows both.

This is a layout-only change. The E2E suite now checks the board report at 375px.

## 6. Mobile and desktop

| Screen | Desktop | Phone (375px) |
|---|---|---|
| Home, join, facilitator setup | ✓ | ✓ |
| Briefings, decision, team commitment | ✓ | ✓ (no overflow) |
| Results: Level 1, deep analysis, KPI tabs, scorecards, share price | ✓ | ✓ (no overflow) |
| Final board report | ✓ | Overflow before bf1dbcd; fixed |
| Facilitator: live progress, compare, leadership and awards, debrief | ✓ | ✓ (no overflow) |

## 7. Notes

- The production verification session `ISB-3F4B8B` and its three teams remain in the database as test data.
- The browser bundle contains only the publishable key. No `service_role` string appears in it.

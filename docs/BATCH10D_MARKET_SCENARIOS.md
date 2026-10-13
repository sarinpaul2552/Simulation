# Batch 10D — Three authored market paths

**Status:** implemented on `feature/nexlearn-v3-integration` (local only).

| Component | Location |
|---|---|
| Path arcs | `src/simulationV3/engineV3PathB.ts`, `engineV3PathC.ts` (path A = the original arc) and registry `engineV3Paths.ts` |
| Student content | `src/production/v2/content/pathB.ts`, `pathC.ts`, accessors in `content/paths.ts` |
| Database | `database/MIGRATION_V3_MARKET_PATHS.sql` — **tested only on the disposable local database; not applied anywhere shared** |
| Economic study | `docs/v3lab/tables.md` T11–T12 |

## 1. Design

All three paths share the eight-beat skeleton that Batch 10A and 10E were built around:
1. calm start;
2. shock;
3. conflicting evidence;
4. strategic commitment;
5. major contract;
6. downturn;
7. strategy-dependent crisis;
8. final move.

What differs is the world, told through quarter briefings and signals, and through the market the engine sees:
- demand, macro pressure and competitor pace;
- structural market size;
- the Q5 offer.

These are not multipliers on one story. Each path has its own narrative, its own signals (with audit-only truth notes) and its own Q5 contract.

| | **A · AI Acceleration** | **B · Enterprise Transformation** | **C · Economic Pressure** |
|---|---|---|---|
| Q2 shock | Consumer AI goes mass-market; free tutors undercut paid learning | Employers mandate and fund AI reskilling; self-paid consumer learning shifts to employer programmes | Rates rise and households tighten; free AI tools spread on free tiers |
| Q3 evidence trap | Usage overstates paid loss; AI engagement ≠ willingness to pay | Usage and paid cohorts agree; enterprise demand is the real signal; engagement comes from enterprise pilots | Usage *understates* paid loss (downgrades to free tiers); RFP counts and free-tier engagement overstate demand |
| Structural change | AI-native 80 → 150; enterprise 120 → 135 | Consumer 300 → 160 (paying consumer market stops growing); enterprise 120 → 165; AI-native 80 → 105 | AI-native 80 → 100 |
| Competitors | Consumer AI entrants fast (Q2–Q3) | Consumer apps a little faster than normal; enterprise competitors still piloting | Slowing; two enter restructuring in Q6 |
| Q5 offer | $48M global contract (Fortune-100) | $64M consortium programme: three manufacturers, 25 countries, more upfront cost and load | $32M vendor-consolidation contract: price-tight, lighter load, aligned with Enterprise or Balanced |
| Q6 | Recession (macro 0.8) | Shallow budget squeeze (0.5); enterprise demand stays above neutral | Deep recession (1.0), already biting from Q5 |
| Q7–Q8 | Easing, then recovery | Enterprise-led recovery; record enterprise AI budgets | Prolonged downturn; only partial recovery; investors favour cash generation |

## 2. Classroom conditions

**One path per session.**
- The facilitator chooses the path when creating the session ("Market path" card; three paths plus "Original NexLearn (V2 economics)").
- `v3_create_session` stores `econ_engine = 'v3'` and `market_path`.

**No mid-session change.**
- A database trigger allows engine and path to be set only while no team has started. After that they cannot change.
- No RPC exposes a change, and the public key cannot update `sessions` (block-all RLS).
- Tested: a direct update is refused.

**Every team gets the same market.**
- Each V3 snapshot records `marketPath`, from the session.
- `gameService` refuses a stored game whose engine or path differs from its session.
- The server rejects an initial or committed snapshot whose `engineVersion` or `marketPath` does not match the session (tested).

**Visibility:**
- The path name appears on the "Session created" page, in the facilitator top bar and on the board report.
- Students see the path's story, but never its name or theme description, which would hint at what is coming.

## 3. Integration with Batch 10A

- **Q1–Q3 prompts.**
  - Priorities and beliefs are unchanged and fit all three paths.
  - Q1 is identical in every path.
  - Q2 still involves AI in every path (mass-market, workplace or free-tier).
- **Q3 signal selection.**
  - The eight Q3 signal ids and their sources are identical in every path; only the headlines and truths differ.
  - Teams cite evidence the same way, and stored deliberations remain valid.
  - Three source labels were generalised so they fit every path: "University partners", "Competitor moves", "Talent market".
- **Q4 signal assessment.**
  - The reveal reads the game's path: that path's Q3 headlines, assessments and reveal summary (`signalReveal.ts` → `q3AssessmentsFor(path)`).
  - Path C deliberately teaches the opposite of path A's usage lesson: usage can understate the problem.
- **Reflection history:** unchanged. Reflections are stored per quarter, independent of path.
- **Prefill and pacing:** unchanged.

## 4. Integration with Batch 10E

- **Class Discussion, timelines and Q3 analysis.**
  - `buildFacilitatorTeams(rows, cfg)` replays every team with the session's engine and path.
  - Each team carries `path`.
  - The Q3 panel, the Q3→Q4 table and the board defence prompts use that path's assessments.
  - The Q3 gate is unchanged: assessments stay hidden until every participating team has completed Q4.
- **Board report.**
  - Quarter headlines in the timeline come from the path's cards.
  - The contract is named per path: "global contract", "consortium programme", "vendor-consolidation contract".
  - The V3 contract text says the cost came from the budget.
  - The market is shown in the header.
- **Projector, stage clock, live view:** unchanged. The projector shows the path name, but no PINs or codes.

## 5. Economic differentiation (T11–T12)

21 strategies were played in each path: 17 laboratory strategies, a path-reading adaptive team and three "focus families" ($12M in one market + $12M AI + $6M People, with the aligned destination).

**What changes by path:**

| Strategy | A | B | C |
|---|---|---|---|
| Enterprise-led | rank 16, $112.6 | rank 13, $126.0; Enterprise revenue $69M | rank 18 |
| Enterprise-only | rank 18, $104.1 | rank 14, $124.3; Enterprise revenue $73M | rank 19 |
| Enterprise + AI | rank 7 | rank 5 | rank 9 |
| Diversified | rank 10 | rank 10 | rank 8 |
| Balanced | rank 9 | rank 8 | rank 7 |
| Cash preservation | rank 19 | rank 19 | rank 16 |
| AI-only | rank 15 | rank 17 | rank 17 ($84.9) |

- **Top allocation differs by path:**

  | Path | Top allocation | Price |
  |---|---|---:|
  | A | Consumer + AI + People | $157 |
  | B | Enterprise + AI + People | $157 |
  | C | Consumer + AI + People | $149, with the Enterprise and University versions $18 behind |

  **The best constant allocation differs between paths A and B (H9, first criterion: met).**
- The best fixed strategy is not knowable in advance. A team that reads the path's evidence (the path-reading adaptive team: Q1 balanced, then following the shared signals) is the top named strategy in all three paths (rank 2 overall in each). This meets H10: **adaptation pays**.
- No game becomes insolvent in any path under the default policies (H11, first criterion).

**What does not change enough:**
- The overall price ranking is similar across paths. Spearman correlations are 0.94 (A–B), 0.95 (A–C) and 0.90 (B–C), above the design target of ≤ 0.7 (H9, second criterion: **not met**).
- The reason is structural:
  - Demand indices affect every team's revenue in the same direction.
  - Most strategies differ in *how much* they gain, not *whether*.
  - AI + People capability is valuable in every path, because AI readiness shields consumer retention and supports pricing.
- Making paths reorder the whole board would require engine changes the brief rules out ("do not redesign the engine merely because one strategy performs better") or artificial multipliers. **It is recorded as a known limitation, not hidden.**
- The marginal $5M (T12) remains negative for every market bucket from a balanced base in every path. AI is still the only positive operating-profit bucket.

## 6. Tests

- `src/production/v2/content/paths.test.ts` (13 tests). For paths B and C:
  - every quarter Q2, Q3 and Q5–Q8 has a chapter, card and five role briefs;
  - every signal has plain-language text;
  - Q3 assessments cover exactly the eight evidence ids, with path-specific wording;
  - no engine indices or "truth" wording reaches students;
  - path A content is unchanged.
- `src/production/v2/db.v3.integration.test.ts` (7 tests, local DB):
  - V3 session creation and fields;
  - immutability against the public key;
  - snapshot/engine/path mismatch refused;
  - a full Q1–Q8 game per path through the RPCs, equal to the engine. Path B includes a financed expansion; every path includes the Q6 stance.
  - V3-only fields refused for V2 sessions; an invalid expansion refused for V3;
  - 300 consecutive session creations (see the defect fix below).
- V2 database suite after the migration: 14/14 passed.

**Defect found and fixed (pre-existing).**
- Admin PINs are four digits and must be unique among active access codes, so after a few hundred sessions creating a new one could fail with a duplicate-key error.
- `v2_create_session` (re-declared in the V3 migration) now retries the unchanged body on a unique-key collision. The codes, PIN format and checks are unchanged.
- This ships with the migration and so needs the same approval.

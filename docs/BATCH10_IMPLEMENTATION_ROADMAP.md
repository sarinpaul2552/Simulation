# Batch 10 — implementation roadmap

**Status:** proposed. Nothing is implemented until the product owner approves the design.

**Principle.** Ship the educational gains first, on the existing V2 engine and without migrations. Build V3 economics in the laboratory behind a hard boundary. Only promote V3 to production after it passes the validation plan and a classroom pilot.

**Order (reordered from the brief because of dependencies):**

1. **10A** — Educational experience and decision rationale *(V2, no engine change, no migration)*
2. **10E** — Facilitator and final-report improvements *(V2; one small migration for the rubric)*
3. **10B** — V3 engine fork and economic-model experiments *(lab only)*
4. **10C** — Contracts, recession and financing in V3 *(lab, then V3 adapter)*
5. **10D** — Market paths (scenario uncertainty) *(V3 adapter, content, migration)*
6. **10F** — Full validation, pilot and production readiness of V3

**Why this order:**
- 10E depends on the data 10A captures.
- 10C depends on the V3 fork and lab runner from 10B.
- 10D depends on the V3 adapter dispatch.
- 10A and 10E deliver most of the learning value and can ship independently of V3.

---

## 10A — Educational experience and decision rationale

| | |
|---|---|
| **Scope** | (1) Decision rationale block, replacing today's discussion block: strategic intent (one tap, with quarter overlays in Q2, Q5 and Q6), belief (existing), a "signal that convinced us" pick in Q3 and Q6, confidence (existing), one biggest risk (two today), optional one-line texts. (2) "You expected" shows intent, belief and risk; "Did it happen?" uses risk → outcome mappings, saying "no clear signal" where no mapping exists. (3) Reflection adds "our risk call was…". (4) Allocation pre-filled from the previous quarter. (5) Qualitative saturation note per bucket (E8). (6) Optional per-role stance chips, using the existing unused `stances` field. (7) Rewritten People and CEO brief lines for Q2, Q4 and Q8; Q6 truth-note corrections in content (not engine). |
| **Not in scope** | Any economic change. Mandatory recession stance (needs V3). |
| **Dependencies** | None. |
| **Files** | `ui/stages/DecisionStage.tsx`, `ResultsStage.tsx`, `ChallengeStage.tsx`; `ui/useV2Team.ts` (pre-fill); `content/deliberationContent.ts`, `briefings.ts`; `types.ts` (`V2Deliberation`: `intentId`, `intentNote`, `signalId`, `riskNote`; `stances` used); `insights/reflection.ts`; new `insights/riskOutcome.ts` and `insights/saturation.ts`. |
| **Database** | **No migration.** Deliberation is JSONB; reflection is text holding JSON; both are already persisted and returned [verified]. |
| **Tests** | Unit: risk→outcome mappings (each mapping cites a real recorded field); saturation-note thresholds; rationale validation. E2E: full eight quarters with the new block on desktop and at 375px; no horizontal scroll; the rationale persists across refresh. Regression: all existing suites; engine freeze test. |
| **Acceptance** | Rationale adds ≤ 75 seconds per quarter in a scripted E2E timing run. Nothing is graded automatically. Older sessions with old-format deliberations still render. |
| **Deployment risk** | Low. Additive UI; the old JSON shape stays readable. |
| **Freeze exception (needs decision)** | The false text "Culture paid for it" lives in `adapter.ts:539`, which is frozen. Option (a): an approved text-only exception, with no economic change and covered by a test that the adapter's economics are byte-identical. Option (b): leave it until V3. **Recommended: (a).** |

## 10E — Facilitator and final-report improvements

| | |
|---|---|
| **Scope** | (1) Live tab shows each team's intent and named risk after commit. (2) Debrief shows the full rationale timeline and reflections; this fixes the dropped reflections at `V2Facilitator.tsx:57`. (3) Class discussion view: Q2 stance, Q3 evidence and Q6 stance side by side across teams. (4) Signal-versus-noise reveal for Q3 (and Q6), facilitator-controlled, built from the scenario's `truthReference`. (5) Leadership observation rubric: manual, optional, with evidence shown beside each criterion. (6) Board report gets an "Intent and outcome" section, plus defence prompts that quote the team's own rationale. (7) Projector stage timer (text only). |
| **Dependencies** | 10A (data). |
| **Files** | `ui/V2Facilitator.tsx`; `insights/debrief.ts`; new `insights/rationaleTimeline.ts` and `insights/signalReveal.ts`; `ui/stages/FinalStage.tsx`; `insights/boardVerdict.ts` (prompts); `api.ts` (rubric RPCs). |
| **Database** | **One additive migration:** `v2_facilitator_observations` (session, team, criterion, level, note, updated_at), with block-all RLS and PIN-protected `SECURITY DEFINER` RPCs for read and write. Non-destructive and idempotent. |
| **Tests** | Database integration (PIN required; no leakage to the team API); E2E for the facilitator flow; board report at 375px; signal reveal shows only after Q4 opens. |
| **Acceptance** | A facilitator can run the debrief entirely from the Debrief tab. The rubric never shows a computed score. The final report answers "intended / did / happened / learned" for all eight quarters. |
| **Deployment risk** | Low–medium (one migration; facilitator-only surfaces). |

## 10B — V3 engine fork and economic-model experiments (lab only)

| | |
|---|---|
| **Scope** | (1) Create `src/simulation/v3/` as a copy of the V2 engine modules, with `engineVersion: 'v3-…'`. (2) Implement E1 (AI-native revenue level), E2 (Enterprise conversion; CS delivery cap optional), E3 (Credential → University wins), E4 (overload → culture; culture → Execution/CS; layoff aftershocks), E9 (valuation 1.1 in a V3 valuation module). (3) Lab runner extension (`scripts/lab/v3/`): engine selection, arc parameter, per-quarter envelope, envelope claim, recession stance. (4) Calibration against H1–H5, H9–H13 on path A and the grid; verification on B and C once 10D content exists. |
| **Dependencies** | Product-owner approval of E1, E4 and E9 in principle. |
| **Files** | New `src/simulation/v3/*`; `src/production/v3/insights/valuation.ts` (VAL-1.1); `scripts/lab/v3/*`; `docs/batch10/*`. **No change to `src/simulation/engineV2*` or `src/production/v2/adapter.ts`.** |
| **Database** | None. |
| **Tests** | V3 unit tests mirroring V2 (fixed point, ledger, bridges); a guard test that no production module imports `simulation/v3`; V2 freeze test; Batch 9 parity test. |
| **Acceptance** | Validation hypotheses H1–H5, H9–H13 pass on path A with documented calibration. Failures are reported with the next design option. |
| **Deployment risk** | None (not deployed). |

## 10C — Contracts, recession and financing (V3)

| | |
|---|---|
| **Scope** | E5 (contract upfront claims the envelope; single ledger line); E6 (mandatory Protect/Slow/Cut stance; freeze → People to reserve); E7 (financing-expanded envelope with debt, equity, cash-floor and absorption limits; X chosen from $0/$5M/$10M/$15M by H7). First in the lab runner, then in a new **V3 adapter** (`src/production/v3/adapter.ts`) with its decision spec, validation and plain-language consequences. |
| **Dependencies** | 10B. |
| **Files** | `src/production/v3/adapter.ts`, `types.ts`; UI decision stage (V3 branch of the Q5, Q6 and financing panels); `insights/financingCheck.ts` (V3 variant). |
| **Database** | None yet. Q6 stance and financing are part of the existing input JSON. |
| **Tests** | Cash bridge reconciles, with the contract counted exactly once. Every recession stance is feasible for every cohort strategy. Financing limits are enforced and the error text is plain. Hypotheses H6–H8 and H11. |
| **Acceptance** | H6–H8 and H11 pass; no double counting; the Q6 decision adds ≤ 1 minute. |
| **Deployment risk** | None until 10F. |

## 10D — Market paths (scenario uncertainty)

| | |
|---|---|
| **Scope** | Author paths B (Enterprise-led AI) and C (Slow adoption): demand, capacity, competitor pace, and **signals per role**, including a Q3 conflicting-signal design in each. Fix the stale truth references. Session-level path: chosen by the facilitator, or sealed and derived from the session code. Path shown in the facilitator view and the board report. Signal reveal per path. |
| **Dependencies** | 10B (runner), 10C (V3 adapter), 10E (reveal UI). |
| **Files** | `src/simulation/v3/scenarioPaths.ts`; `src/production/v3/adapter.ts` (arc dispatch); content; facilitator setup UI. |
| **Database** | **Additive migration:** `sessions.engine_version` accepts `'v3'`; `sessions.scenario_path` (TEXT, default `'A'`); `v3_create_session` and related RPCs, or the V2 RPCs extended behind `engine_version` checks. V2 sessions are unaffected. |
| **Tests** | Every path: steady state at Q0, signals consistent with truth (an automated check that each `truthReference` matches the path's demand), H1, H2, H9 and H10 across paths. |
| **Acceptance** | H9 and H10 pass. No path punishes teams for unsignalled information: each path's truth shift is signalled by its Q3 and the reveal explains it. |
| **Deployment risk** | Medium (session schema). |

## 10F — Full validation and production readiness of V3

| | |
|---|---|
| **Scope** | (1) Full validation study, H1–H13, with a V2 vs V3 workbook and report. (2) Engine dispatch: `gameService` selects the V2 or V3 adapter by `sessions.engine_version`. The snapshot contract refuses cross-version loads. (3) Facilitator setup: engine version (V3 default for new sessions after approval), market path, recommended participation mode. (4) Stopwatch pilot with two cohorts (validation plan, part E). (5) Production migration, Vercel deploy after approval, live verification as in Batch 8.1. |
| **Dependencies** | 10A–10D; product-owner sign-off on the validation report and pilot. |
| **Files** | `src/production/v2/gameService.ts` (dispatch; V2 behaviour unchanged); `src/production/v3/*`; setup UI; migrations. |
| **Database** | The 10D migration, applied to production after approval; non-destructive. |
| **Tests** | Everything: V2 regression (bit-identical replays), V3 suites, E2E for both engines, compatibility runs, mobile, accessibility. |
| **Acceptance** | All of H1–H13 pass or have accepted exceptions. Pilot total ≤ 95 minutes. Existing V2 sessions are unaffected. |
| **Deployment risk** | Medium. Mitigated by per-session engine versioning: V2 stays available and existing games keep replaying on V2. |

---

## Summary

| Stage | Engine change | Migration | Ships to production | Learning value | Risk |
|---|---|---|---|---|---|
| 10A | No | No | Yes | **High** | Low |
| 10E | No | 1 additive | Yes | **High** | Low–medium |
| 10B | V3 fork (lab) | No | No | Indirect | None |
| 10C | V3 adapter (lab) | No | No | Medium | None |
| 10D | V3 content and dispatch | 1 additive | With 10F | Medium–high | Medium |
| 10F | V3 promoted | Applied | Yes | — | Medium |

**Recommended next implementation batch: 10A**, followed directly by 10E.

# Batch 10A — implementation inventory (Phase 1: inspect)

**Branch:** `feature/batch10a-student-learning`, created from `design/batch10-v3` (bac387b).

**Constraints checked:**
- No migration.
- No frozen-engine edit (`src/simulation/*`, `src/production/v2/adapter.ts`).
- No new dependency.

Every statement below was checked against the code at bac387b. File references are relative to `src/production/v2/` unless stated otherwise.

## 1. What exists today

| Field | Required | Where captured | Persistence | Shown later |
|---|---|---|---|---|
| `beliefId` / `belief` | yes | DecisionStage fold 1 | draft JSONB (debounced 400 ms), then copied to `v2_quarter_resolutions.deliberation` | Commit resolution; Results "You expected"; facilitator debrief (belief only) |
| `confidence` | yes | fold 1 | same | Commit resolution only |
| `riskIds` / `risks` | yes, exactly 2 | fold 2 | same | Commit resolution only |
| `note` | no | fold 2 | same | never |
| `stances` | — | unused | — | — |
| Reflection (`learning[]`, `note`) | ≥ 1 learning chip | ReflectionCard | **only on "Save and continue"**; lost on refresh before that | never (fetched by the debrief RPC but not passed through) |

## 2. Inventory

| Feature | Current implementation | Educational problem | Proposed change | Files affected | Test coverage |
|---|---|---|---|---|---|
| **Decision rationale** | Belief + confidence, then two risks, then an optional note. Headed "What is our strategy based on?" / "What could go wrong?". | There is no *priority* (what we are trying to achieve). Choosing two risks takes longer than one and blurs the main concern. | Three labelled steps: **Our strategic priority** (one tap; new optional key `priorityId`), **Our evidence** (the existing belief, plus confidence), **Our biggest risk** (one tap, `riskIds` of length 1). Keep the single optional note. Additive JSONB keys, so no migration. | `types.ts`, `content/deliberationContent.ts`, `ui/stages/DecisionStage.tsx`, `DecisionSummary.tsx`, `CommitStage.tsx` | Unit: validation and backward compatibility (two-risk records still display). E2E helper updated to one risk. |
| **Q1–Q3 distinctness** | The heading is "How will you deploy $30M?" in every non-event quarter. The Understand stage already frames each quarter differently. | The decision screen of Q1, Q2 and Q3 looks identical, so the quarters feel repetitive. | Quarter-specific heading, prompt and priority options: Q1 "Where should we place our initial bets?"; Q2 disruption stance (accelerate / maintain / reconsider — no option is labelled correct); Q3 "Which evidence do we trust?" with a required pick of the 1–2 most influential signals (`evidenceIds`). Nothing reveals truth in Q3. | `content/decisionFraming.ts` (new), `DecisionStage.tsx`, `deliberationContent.ts` | Unit: framing per quarter; the Q3 evidence labels contain no figures. |
| **Signal reveal** | None. Authored `truthReference` exists in `src/simulation/engineV2Scenario.ts` (frozen, read-only). | Students never learn which Q3 signals were reliable, which is the core lesson of Q3. | "Looking back: which signals mattered?" panel in Results & Learn once `completed_quarter ≥ 4`. Shows each Q3 signal, an assessment derived only from the authored truth notes, and the team's own recorded Q3 → Q4 movements. | `insights/signalReveal.ts` (new), `content/signalAssessments.ts` (new), `ResultsStage.tsx` | Unit: gate (not available before Q4 is completed); every assessment maps to an authored signal; no fabricated figures. |
| **Accountability** | "You expected" shows the belief only. The "What happened" table follows the belief topics. | Expected → decided → happened → learned is not visible as a chain. | Compact panel: our priority, evidence and biggest risk → what we decided (allocation and event decision) → what happened (neutral sentences, no causal verbs) → what we learn (the reflection). | `insights/accountability.ts` (new), `ResultsStage.tsx` | Unit: wording contains no causal claims; "Not recorded" for old records. |
| **Reflection** | Learning chips (≥ 1 required) and an optional note. State is local and saved only on proceed. | A refresh loses the reflection. The prompt does not invite counterfactual thinking. | Persist on change (debounced) through the existing `v2_save_reflection` RPC. Verified in `database/MIGRATION_V2_PRODUCTION.sql:586–594`: no phase restriction, and the quarter must be resolved. Add the prompt "Knowing what you know now, what would you do differently?" and the chip "We would make a different call now". **The one-chip requirement is kept and documented**, not weakened. | `useV2Team.ts`, `ResultsStage.tsx`, `deliberationContent.ts` | Unit: encode/decode round trip. E2E: the reflection survives refresh. |
| **Misleading messages** | 1. `adapter.ts:539` "…Culture paid for it" (frozen). 2. `insights/report.ts:105` "so investments matured more slowly". 3. `insights/explain.ts:111` "Adding more change will slow everything down" / "further initiatives will mature more slowly". 4. `insights/briefing.ts:71` "Culture reflects workload, workforce actions and events". | The engine has no overload → timing mechanism: overload reduces the *amount* of capability created (absorption loss; `engineV2Capabilities.ts` 463–485). It has no workload → culture mechanism: culture changes only through shocks from workforce reduction, restructuring, crisis, insolvency and the Q8 final options (`engineV2Management.ts`, `engineV2Financing.ts`, `engineV2Final.ts`; capability step copies `opening.culture`). | Correct texts 2–4 (presentation layer). **Text 1 is not rendered anywhere:** `result.explanation` is read by no UI or insights module, and is not stored in the snapshot. The Batch 10 review (W8) said it was shown; that was wrong. No frozen-file change is needed. Add a guard test that keeps it unrendered. | `insights/report.ts`, `insights/explain.ts`, `insights/briefing.ts` | Unit: the corrected texts; a guard test that no `ui/` or `insights/` file reads `.explanation` from a result. |
| **Allocation prefill** | `defaultInput(q)` sets every bucket to 0 each quarter. | Re-entering a similar allocation every quarter costs time. | Explicit button "Start from last quarter's allocation" showing the amounts. Shown only when nothing is invested yet. Copies the five buckets only (never event or financing choices), scales down proportionally to the current envelope, writes a draft (never commits), and every engine validation and event card still applies. | `insights/prefill.ts` (new), `DecisionStage.tsx` | Unit: scaling, rounding, never above the envelope, no event fields copied. |
| **Pacing** | No guidance. | Facilitators and teams lack a time target. | A one-line time hint: Q1–Q3 "fast quarter, about 8 minutes"; Q4–Q8 "major decision, about 12 minutes". Text only, no timer (the timer is deferred to 10E). | `content/decisionFraming.ts`, `DecisionStage.tsx` | Unit. |

## 3. Security findings

1. **Scenario truth is already in the browser bundle.** The V2 engine runs client-side, so `engineV2Scenario.ts`, including every quarter's `truthReference`, ships in the JS bundle today. This predates Batch 10A. The reveal panel adds UI gating (authoritative `completed_quarter` from the server), but a determined student could read the bundle.
   - **Proposed later fix (not in 10A; needs RPC and migration approval):** serve reveal content from a `SECURITY DEFINER` RPC that returns it only when the team's `completed_quarter ≥ 4`, and strip `truthReference` from the client build.
   - The new assessment text in `content/signalAssessments.ts` adds no information beyond what the bundle already contains.
2. **Role-private signals in the reveal.** After Q4, the reveal names which role received each Q3 signal (for example "CFO brief"). This exposes *past* private information to the whole team. It is pedagogically intended, but it needs **product-owner confirmation**.
3. **No deep links.** The stage is derived from the server phase (`V2TeamGame.tsx`); there is no URL routing. The reveal gate reads the server-loaded `game.record.completed_quarter`. A refresh reloads it from the server.
4. **Reflection writes** use the existing RPC with the team code; the authorization model is unchanged.

## 4. Dependencies

- Facilitator visibility of priority, evidence and reflections, the timer, the board report "Intent and outcome" section and the risk → outcome mapping are deferred to **10E**.
- No item in 10A requires an RLS, RPC or schema change.

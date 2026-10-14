# Batch 10E — Facilitator Experience and Board Report: implementation plan

**Branch:** `feature/batch10e-facilitator`, created from `feature/batch10a-student-learning` (3f7fd16), because 10E reads the data 10A captures.

**Status:** this is a plan for approval. No 10E code has been written.

**Objective:** make each team's saved decision history usable for facilitator-led discussion, organised as **What the team intended → What it decided → What happened → What it learned**.

## 1. What already exists (inspected)

| Item | Current state | Use in 10E |
|---|---|---|
| `v2_facilitator_debrief(session, PIN)` RPC (PIN-protected, `SECURITY DEFINER`) | Returns per team: committed `inputs`, `deliberations` (now including 10A's `priorityId` and `evidenceIds`), `reflections`, revealed `votes` and `agreements`, for **resolved quarters only** | Single data source. **No new RPC and no migration.** |
| Facilitator tabs | Live progress · Compare teams (headline meters) · Leadership and awards · Debrief (per-team card: decisions + belief, pivotal moments, commitments, votes, generic questions, charts) | Reworked as below |
| Reflections | Fetched by the RPC, then **dropped** by `V2Facilitator.tsx` | Passed through and shown |
| Priority, confidence, risk, Q3 evidence | Never shown to the facilitator | Shown |
| Student board report (`FinalStage.tsx`) | Verdict, figures, decision history (decisions and agreement), scorecards, lessons, board defence prompts based on results | Adds "Intent and outcome" and prompts that quote the team's own rationale |
| Engine replay in the facilitator browser | `replayInputs` / `gameHistory` (frozen engine) | Gives the "what happened" values; economics untouched |

## 2. Design (concise; one screen per question)

The facilitator tabs become: **Live · Class discussion · Team timelines · Final debrief · Leadership and awards**.
- "Compare teams" is folded into Class discussion as one compact headline row.
- Existing test ids are kept where the element survives.

### 2.1 Class discussion — teams side by side, one quarter at a time (core)

**Quarter picker.** Defaults to the latest quarter every active team has completed. Each team row shows four compact columns:

| Intended | Decided | Happened | Learned |
|---|---|---|---|
| Priority or stance; belief and confidence; biggest risk (Q3: the signals cited) | Allocation bar plus the event decision (destination, contract, recession actions, crisis response, final option) | Revenue, cash and share-price change in that quarter, from recorded replay values | Learning choices plus the reflection note, truncated with an expand control |

**One class pattern line per quarter:**
- Q2: the stance distribution (for example "2 accelerate · 1 maintain · 1 reconsider").
- Q3: signal citation counts.
- Q4: destinations.
- Q5: contract accepted or declined.
- Q6: recession actions.
- Q7: crisis responses.
- Q8: final options.

**Q3 signal interpretation panel.**
- Shows, for each authored Q3 signal: how many teams cited it, which teams, and (gated) the 10A assessment.
- **Gate:** the assessments stay hidden until every started team has completed Q4. Before that, the facilitator must press "Show assessments (facilitator only)", which is disabled in projector view. This prevents a projected spoiler.

**Discussion prompts** are built from the data, for example: "Two teams cited AI engagement and one cited paid cohorts; ask each to defend its weighting." They are factual and never judge a team as right or wrong.

### 2.2 Team timelines — one team, eight quarters

One table per team: the four columns × Q1–Q8.

**Meaningful decision changes** are flagged with neutral, factual markers. Every threshold is stated on screen:
- the priority or stance changed;
- the largest investment area changed;
- an investment area moved by ≥ $5M, or by ≥ 15 points of share, quarter on quarter;
- the belief topic changed (using the existing `BELIEF_TOPICS`);
- confidence went from high to low, or the reverse;
- the commitment mode note (agreed / discussed / leader decided), or a vote split.

**Strategic consistency: descriptive, not graded.**
- Shown side by side: each quarter's stated priority, the share of investment in each area, and, from Q4, the chosen destination.
- One factual summary line, for example: "Priority stayed 'Build capability' in Q1–Q3; 58% of Q1–Q3 investment went to AI & product and People."
- **No consistency score, no colour verdict, no "good/bad" label.**

The existing debrief content (pivotal moments, commitments and votes, charts) moves into this view, collapsed.

### 2.3 Final debrief — the 20-minute segment

Usable once all teams have finished; partial data is labelled as such.

1. **Where teams ended:** the existing figures (share price, revenue, cash, terminal score, destination, final option). No new grade.
2. **Biggest changes of direction** across the class: the top three factual change markers, with team and quarter.
3. **Q3 evidence → Q4 commitment:** each team's cited signals, the signal assessments, and its destination.
4. **"What would you do differently?"** The reflection notes and the "different call" choices, by quarter, with team names. The facilitator can hide names when projecting.
5. **Suggested 20-minute running order:** 5 minutes reading the board report, 8 minutes board defence, 7 minutes class debrief. It shows the agenda as text only, with no timer state stored.

### 2.4 Student board report: "Intent and outcome" (team-visible, own data only)

- A new section in `FinalStage.tsx`: an eight-row table of priority/stance · evidence and confidence · biggest risk → decision → recorded result (revenue and share-price change) → learning. It reuses 10A's `accountabilityRows`.
- **Defence prompts quoting the team's own rationale**, factual, for example: "In Q3 you cited paid-subscriber cohorts and AI engagement. Looking back, which one shaped your Q4 commitment, and would you weight it the same way now?"
- Print layout is checked; the existing sections are unchanged.

### 2.5 Live tab (small)

- Adds one column, "Last committed intent": the stated priority or stance of the team's latest **resolved** quarter.
- Drafts, unresolved deliberation and private briefs are never shown, as now.
- A plain-text facilitator stage clock: "Quarter time: 6:00 / 9:00", start and reset, local to the facilitator's browser. It is optional, has no animation, and is not shown to students; showing it on student screens would need a migration (see §5).

## 3. Rules kept

- **No automated leadership grades.** No new scores, rankings or colour verdicts on intent, consistency or reflections. The existing Leadership and awards tab (scorecards NXLN-EXEC-1.1, unchanged) stays as it is.
- **No change to V2 economics, valuation or scoring.** The freeze diff must stay empty, and no scoring or valuation file is touched.
- **No database change.** All data comes from the existing PIN-protected RPC. Nothing is written to the production database.
- **Privacy:** only resolved quarters, team-level deliberation, reflections, and revealed votes or agreements, as today. Never private briefs or drafts.
- **Older sessions:** records without 10A fields show "Not recorded" and still work.
- **Design:** boardroom language; no animation, badges-as-decoration, celebratory effects or extra modals. Projector-safe type sizes.

## 4. Files (planned)

| New (pure, unit-tested) | Purpose |
|---|---|
| `insights/teamTimeline.ts` | Intended → decided → happened → learned per quarter; change markers; consistency summary line |
| `insights/classDiscussion.ts` | Quarter comparison rows, class pattern line, Q3 citation counts, the assessment gate, discussion prompts |
| `insights/finalDebrief.ts` | Ending table, top changes, Q3 → Q4 table, reflection collection |
| `insights/intentOutcome.ts` | Board report table and rationale-quoting defence prompts (reuses `accountabilityRows`) |
| `batch10e.test.ts`, `e2e/batch10e.e2e.ts` | Tests |

| Modified | Change |
|---|---|
| `ui/V2Facilitator.tsx` | Tab structure, three new views, reflections passed through, live intent column, stage clock |
| `insights/debrief.ts` | Accept `reflections`; keep the existing output for backward compatibility |
| `ui/stages/FinalStage.tsx` | Intent and outcome section; rationale-quoting prompts |
| `e2e/*.e2e.ts` | Only where a tab id changes (`v2-fac-tab-compare`), documented |

**Not touched:** `src/simulation/*`, `adapter.ts`, `insights/valuation.ts`, `insights/executive.ts` (scoring), `database/*`, `package.json`.

## 5. Out of scope, or needing separate approval

| Item | Why | What approval would be needed |
|---|---|---|
| Manual leadership-observation rubric | Needs a new table and RPCs (the earlier roadmap's 10E migration) | **Recommend deferring.** If wanted later: one additive migration, applied to production only with approval. |
| Timer visible on student devices | Needs session timer state on the server | An additive column plus a facilitator RPC |
| Risk → outcome mapping ("did the named risk happen?") | Hard to state without false causality | Revisit after the pilot; not in 10E |
| **SEC-001** | Separate security work | **Deliverable in 10E: a technical design and approval requirements document only** (`SEC-001_TECHNICAL_DESIGN.md`): options (server-delivered scenario by quarter; server-side quarter resolution; build-time stripping), threat model, migration and RPC list, the replay-compatibility plan for existing V2 sessions, test and acceptance criteria, effort, and the decisions required. No code. |

## 6. Tests (planned)

**Unit tests (`batch10e.test.ts`):**
- All four columns for every strategy and quarter, including pre-10A records (missing priority or evidence; two risks).
- Change markers fire exactly at the stated thresholds.
- Consistency text contains no grade or judgement words ("good, poor, failed, best, score…") and no causal verbs.
- Class pattern counts match the inputs.
- Q3 citation counts.
- The assessment gate is closed until every started team has completed Q4, and is never open in projector view without an explicit action.
- Reflections are decoded, including legacy plain text.
- The board report intent table matches 10A's accountability rows.
- Defence prompts quote only recorded rationale.

**Guard tests:**
- The freeze diff is empty.
- No 10E module imports scoring or valuation functions to create new scores.

**E2E (`batch10e.e2e.ts`):**
- Three teams with different stances and signals play to Q4.
- The facilitator's Class discussion view shows the stance distribution and citation counts; the assessments are hidden and then shown.
- Projector view hides the assessments and reflection names.
- Team timeline change markers appear.
- After Q8: the final debrief sections, the student board report "Intent and outcome", and printing.
- Widths: 1366 and 1920 (projector) for the facilitator; 375 for the student board report.

**Regression:** the full unit, database and E2E suites, plus the a11y check on the new views.

## 7. Classroom fit (90 minutes; estimates, not measured)

| When | Facilitator use | Time |
|---|---|---|
| After the Q2 results | Class discussion, Q2: stance distribution | ≈ 1 min |
| After the Q4 results | Q3 signal interpretation panel | ≈ 2 min (the reveal slot in the 90-minute plan) |
| During Q5–Q7 results | Optional glance at Class discussion | 0–1 min |
| Final 20 minutes | Final debrief view (§2.3) and student board reports | 20 min |

Each view is read in under a minute. No view needs scrolling on a 1920 × 1080 projector for up to six teams; beyond that, it paginates.

## 8. Sequence and deliverables

1. Pure insight modules and unit tests.
2. Facilitator views.
3. Board report section.
4. E2E tests and the visual review (1366 / 1920 / 375).
5. `SEC-001_TECHNICAL_DESIGN.md`.
6. Documents:
   - `BATCH10E_FACILITATOR_CHANGES.md`;
   - `BATCH10E_TEST_REPORT.md`;
   - `BATCH10E_FACILITATOR_GUIDE.md` (a one-page classroom run sheet);
   - `BATCH10E_HANDOFF.md`.
7. Commit on `feature/batch10e-facilitator`; bundle plus push script prepared. **No push, merge, deploy or production database change without approval.**

## 9. Decisions requested before coding

1. **Tabs:** approve folding "Compare teams" into Class discussion. The headline meters stay, inside that view.
2. **Q3 assessment gate:** hidden until all teams have completed Q4, with a facilitator override that is unavailable in projector view. Approve, or always show to the facilitator.
3. **Reflection names when projecting:** hidden by default in projector view, shown in normal view. Approve.
4. **Change thresholds:** ≥ $5M or ≥ 15 points of share for an allocation shift. Approve or adjust.
5. **Rubric:** defer (recommended), or include as a separate approved migration.
6. **Stage clock:** facilitator-only and local (recommended), or none.

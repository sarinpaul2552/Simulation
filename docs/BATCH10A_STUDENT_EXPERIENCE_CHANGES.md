# Batch 10A — student experience changes

**Scope:** presentation layer only.
- No change to the engine, economics, scoring, share price, database schema, RLS or RPCs.
- No new dependency.
- The engine-freeze check (`git diff --stat 003f697 -- src/simulation src/production/v2/adapter.ts`) is empty.

## 1. Decision rationale: priority → evidence → biggest risk

The discussion column now asks three quick, structured questions, plus an optional note. Nothing is graded.

| Step | Before | After |
|---|---|---|
| 1 | — | **Our strategic priority** (Q2: **Our stance on the disruption**). One tap, quarter-specific options. |
| 2 | "What is our strategy based on?" belief + confidence | **Our evidence**: the same belief and confidence. In Q3, the team first picks the **one or two signals that influenced it most**. |
| 3 | "What could go wrong?" — exactly **two** risks | **Our biggest risk** — exactly **one** risk. |
| Note | optional, maxLength 1000 | optional, two-line box, "one line is enough" |

Taps per quarter: 4 before (belief, confidence, two risks), 4 after (priority, belief, confidence, risk), 6 in Q3 (plus one or two signals).

**Requirement change, documented.** The two-risk requirement is now one risk. Older drafts and resolutions with two risks remain valid and still display, labelled "Risks we named".

**Storage.** Two additive optional keys in the existing deliberation JSONB: `priorityId` and `evidenceIds`. No migration is needed. They are never passed to the engine.

## 2. Q1, Q2 and Q3 are now distinct on the decision screen

| Quarter | Heading | Priority question and options |
|---|---|---|
| Q1 | Where should we place our initial bets? | Grow what earns today · Build capability for where learning is heading · Strengthen people and capacity first · Keep flexibility and cash |
| Q2 | Accelerate, maintain or reconsider? | Accelerate · Maintain · Reconsider. The prompt says "There is no single correct answer — defend yours with evidence". No option mentions AI as the right answer. |
| Q3 | Which evidence do we trust? | Get ready for the likely direction · Keep options open · Protect current revenue · Test small. **Plus the evidence pick**: eight sources, named by brief only (for example "Paying-subscriber cohort analysis (CFO brief)"). They carry no figures and no hint of reliability. |
| Q4–Q8 | The existing event headings | Generic priorities: grow revenue · protect cash and resilience · build capability · protect people and organization |

- Each quarter shows a one-line prompt and a pace hint for the whole quarter, taken from the 90-minute plan: "Fast quarter · about 6 minutes" (Q1–Q3) and "Major decision · about 9 minutes" (Q4–Q8). These times are guidance, not measured.
- The decision summary and the board resolution (Commit stage) now show the priority or stance and, in Q3, the signals cited.

## 3. "Looking back: which signals mattered?" (Q3 signal reveal)

- **Where.** Results & Learn, above the reflection. It is open by default at the Q4 results and a collapsed fold from Q5 onward.
- **Gate.** Shown only when the server-loaded `completed_quarter ≥ 4`.
  - The builder function returns `null` below that, even if later records were present in component state.
  - The app has no URL routing, so there is no deep link to reach it earlier. A refresh reloads the gate from the server.
- **Content.** For each of the eight Q3 signals:
  - the headline the students received and its source brief;
  - a graded assessment;
  - what the market showed;
  - why it matters;
  - the team's own recorded values at the start of Q3 and the end of Q4.

  Signals the team cited in Q3 are marked "you cited this".

| Signal | Assessment |
|---|---|
| Consumer usage (Growth) | Direction right, size overstated |
| Paid-subscriber cohorts (CFO) | Reliable |
| Enterprise RFPs (shared) | Reliable |
| AI engagement (Product) | Misleading on its own |
| AI conversion estimates (shared) | Reliable |
| University renewals (CEO) | Partly supported |
| Competitor consolidation (shared) | Incomplete |
| AI talent market (People) | No authored outcome |

- **Provenance.** Every assessment restates the authored `truthReference` note and the Q3 design note in `engineV2Scenario.ts` (read-only). No figure is invented; a unit test checks that every number in the text appears in the authored signal or note. The People signal has no authored truth, so it is labelled "No authored outcome" rather than guessed.
- **No future spoilers.** Only Q3 truth and the team's own Q3–Q4 records are used. A test checks that the output at Q8 equals the output at Q4.

## 4. Accountability: expected → decided → happened → learned

The reflection card's "You expected" line is now a compact list headed **What we expected and decided**:
- our priority or stance;
- our evidence and confidence;
- the signals we weighted most (Q3);
- our biggest risk;
- what we decided (allocation and event decision, in the board report's wording).

Missing values show "Not recorded", so old games still render.

**What happened** is the existing recorded before → after table. Its caveat now reads: "Results reflect market conditions, earlier investments and your teams' capacity as well as this quarter's choices… one quarter rarely proves a call right or wrong." A test checks that no accountability text uses causal wording.

## 5. Reflection

- **Prompt.** "Knowing what you know now, what would you do differently?"
- **New chip.** "We would make a different call now". The optional note becomes a two-line box ("one thing we would do differently").
- **Persistence (new).** The reflection is saved 0.7 s after each change through the existing `v2_save_reflection` RPC, which allows saving any resolved quarter, so it survives a refresh. Previously it was saved only on "Save and continue".
- **Requirement kept, as documented.** At least one learning chip is still required to continue; the written line stays optional.
- **Individual devices.** If several players edit the reflection at once, the last save wins (same as before for the final save).

## 6. Misleading messages corrected (presentation layer)

| Location | Before | After | Why |
|---|---|---|---|
| `insights/report.ts` (board report) | "…so investments matured more slowly." | "…so part of the investment in those quarters did not turn into capability." | Overload reduces the *amount* of capability created (absorption loss). It does not delay maturation. |
| `insights/explain.ts` (what to watch) | "Adding more change will slow everything down" / "will mature more slowly" | "less of each new investment will turn into capability" / "absorption loss" | Same. |
| `insights/briefing.ts` (developments) | "Culture reflects workload, workforce actions and events." | "Culture changes with workforce reductions, restructuring, financial distress, crises and some final decisions; workload alone does not move it." | The engine has no workload → culture mechanism. |
| `adapter.ts:539` (frozen) | "…Investments matured more slowly and Culture paid for it." | **Not changed** | The text is generated into `result.explanation`, but **no UI or insight module renders it** and it is not stored in the snapshot. The Batch 10 review (W8) was wrong to say it was shown. A guard test now fails if any `ui/`, `insights/` or `content/` module reads `.explanation`. |

## 7. Optional allocation prefill

- **What.** A callout above the budget: "Last quarter you invested …". Its button reads **"Start from last quarter's allocation"**.
- **When.** Shown only when a previous quarter exists and the current draft invests nothing, so it never overwrites a draft.
- **What it copies.** The five bucket amounts only, never event, financing or management choices. If they exceed this quarter's budget, they are scaled down in $0.5M steps; the remainder is kept as cash.
- **What it does not do.** It writes the draft only: the team still completes the rationale, reviews and commits. Every validation and event card applies as before.
- **Q8 (correction after review).** The Q8 budget and any investment cap depend on the final option. Prefill is therefore offered only after a final option is chosen; before that, a line says "Choose your final strategic decision first". The offered plan is fitted to the lower of the budget and that option's investment cap ("stabilize and restructure" caps investment at $10M).
  - If the team later switches to an option with a lower cap, nothing is rewritten silently. Prefill is not offered again over a plan already entered, and the engine's existing validation message asks the team to reduce the plan.
  - A test reproduces the original defect: the uncapped prefill fails the engine's cap check for a distressed company, and the capped offer passes.

## 8. Not changed

Economics, the scenario, scoring, share price, University, financing, contract, recession, the facilitator screens and the board-report structure.

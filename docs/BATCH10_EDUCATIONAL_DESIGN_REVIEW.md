# Batch 10 — Educational design review (NexLearn V2 → V3)

**Status:** design and analysis only. No production code, database or deployment changed.

## How to read this review

**Evidence labels.** Each claim carries one of these labels:

| Label | Meaning |
|---|---|
| **[Code]** | Verified in the source on branch `design/batch10-v3` (file:line references given). |
| **[B9]** | Batch 9 laboratory result (`docs/batch9/`). |
| **[B10-D]** | Batch 10 diagnostic run on the frozen V2 engine (`scripts/lab/batch10/diagnostics.test.ts` → `docs/batch10/diagnostics.json`). |
| **[Proposed]** | Design recommendation. |
| **[Hypothesis]** | Expected effect, not yet tested. |

**Path convention.** Paths are relative to `src/production/v2/` unless they start with `src/`, `database/` or `docs/`.

## 1. Purpose and verdict in one paragraph

NexLearn's learning goal is that leading a business means choosing under uncertainty, aligning people behind the choice and owning the consequences.

**The V2 product already has most of the mechanics that goal needs:**
- five roles with private briefs;
- a structured discussion (belief, confidence, two risks);
- a team commitment statement;
- results with an "expected vs actual" view;
- a reflection step;
- a facilitator debrief;
- a board report with defence prompts.

**What it does not do is close the loop.** Most of what students say they intend, fear and learn is captured and then never shown again **[Code]**. Three further problems sit underneath:
- The economics make several executive arguments empty: cash is rarely scarce, organizational damage is invisible to the share price, and Enterprise and University investments do not convert.
- The classroom time budget is over 90 minutes.
- Three consecutive quarters (Q1–Q3) present the same decision.

**The highest-value improvements are educational and need no engine change** (stages 10A/10E in the roadmap). The economic changes matter where they make a role's argument real, not where they equalize returns.

## 2. Current educational strengths

1. **Authentic structure.** Eight quarters move from allocation, through disruption, conflicting evidence, commitment, an opportunity, a recession and a crisis, to a final decision. Together they make a coherent CEO-tenure narrative **[Code: `src/simulation/engineV2Scenario.ts:123–598`]**.
2. **Deliberately ambiguous evidence.** In Q3, signals conflict by design **[Code: engineV2Scenario.ts:308–313]**:
   - The Growth officer's "MAU −11%" overstates the paid decline (true demand is 0.95).
   - Product's "AI engagement +45%" hides the fact that paying AI-native demand is falling, from 1.7 to 1.45.
   - Enterprise RFPs at +25% are real.

   This is the best-designed teaching moment in the simulation.
3. **Private role information with structured tension.** Each brief has a mandate, three priority KPIs, confidential signals, "two ways to read it", concerns and "Ask the X" prompts **[Code: ui/stages/ChallengeStage.tsx:123–172; content/briefings.ts]**. Briefs deliberately contain no recommendations **[Code: content/briefings.ts:4–11]**, which preserves the students' judgement.
4. **Structured deliberation before commitment.**
   - A belief is chosen from quarter-specific evidence statements.
   - Confidence is recorded, along with exactly two risks.
   - There is an optional note.

   **[Code: ui/stages/DecisionStage.tsx:69–73, 152–175; content/deliberationContent.ts]**
5. **Commitment as a leadership act.** Team Commitment asks how the decision was reached (agreed / discussed / leader decided). It never changes the economics **[Code: ui/stages/CommitStage.tsx:16–20]**.
6. **Consequences are explained in plain language.** Results show a Level 1 briefing, a board question, decision consequences and reconciling bridges **[Code: ResultsStage.tsx]**.
7. **The board report and defence.** There is a board verdict on five dimensions, four lenses that are reported separately and never combined, leadership lessons, and a three-minute defence framework **[Code: ui/stages/FinalStage.tsx]**.
8. **Comparison is fair.** Every team in a session faces the same market. Replay is deterministic, with integrity verification **[Code: adapter.ts:408–427]**.

## 3. Educational weaknesses

| # | Weakness | Evidence | Learning outcome harmed |
|---|---|---|---|
| W1 | **Intent is captured but not carried forward.** Risks, confidence, the note and the unused `stances` field never appear after commit. Reflections are returned by the debrief API but not passed to the facilitator view, and the board report uses none of them. | [Code] `V2Facilitator.tsx:57` (no reflections passed); `insights/debrief.ts:79` (belief only); `FinalStage.tsx:31–43`; `types.ts:49` (`stances` unused) | E (accountability), D (uncertainty) |
| W2 | **Q1–Q3 are the same decision three times.** Each is a $30M allocation with no event decision, and the allocation resets to zero every quarter. | [Code] `ui/useV2Team.ts:14`; `adapter.ts:318–342` | B; time budget |
| W3 | **Signal versus noise is never revealed.** The Q3 noisy signals have a recorded `truthReference`, but no screen ever shows students which readings were right. | [Code] the `truthReference` field exists in the scenario data and is unused in `ui/` and `insights/` | D |
| W4 | **The CFO's argument is rarely real.** Eight of the ten required strategies end Q8 with $33–85M of cash, and Cash preservation ends with $187M. None of them needs financing; only the two Enterprise strategies hit the $25M liquidity target. Financing cannot expand investment. | [B9] financing audit; [Code] `adapter.ts:259–263` (fixed envelope) | B, C |
| W5 | **The People officer's warnings have little economic consequence.** Load rarely exceeds 0.8 of capacity (0.89 is the maximum among the ten strategies, reached with the contract), culture and capacity never enter the share price, and a deep layoff raises the price for 8 of 10 strategies. | [B9]; [B10-D] D2, D3; [Code] `insights/valuation.ts:94–111` | C, E |
| W6 | **The Product officer is always right.** AI/Product is in every winning allocation regardless of market path, so the CPO never has to argue. | [B9]; [B10-D] D1 | A, C |
| W7 | **Enterprise and University choices do not deliver commercially within the game.** Enterprise revenue goes from $40M to $46M with capability at its ceiling. University revenue stays flat even with double the market and 1.3× demand. | [B9]; [B10-D] D7 | A |
| W8 | **One results message is false.** The text "Culture paid for it" is shown on overload, but the engine has no overload → culture mechanism. | [Code] `adapter.ts:539` vs `src/simulation/engineV2Capabilities.ts:552` | E (trust in feedback) |
| W9 | **Repetitive and thin People/CEO brief text.** The same questions recur across quarters, the "suggests" lines are often two facts rather than two readings, and UG and MBA text are mostly identical. | [Code] `content/briefings.ts:59–60, 76–77, 110–111, 178–179` | C |
| W10 | **The time budget overruns.** See section 6. | [Code] click counts; model below | All |
| W11 | **No warning when spending is wasted.** Single-bucket plans hit the capability ceiling by Q5–Q7 and waste 45–55 capability points with no warning. | [B10-D] D5; [Code] `engineV2Capabilities.ts:560–597` | B |
| W12 | **Stale scenario truth notes.** The Q6 `truthReference` values do not match the calibrated demand. They are invisible to students but would mislead a facilitator-facing reveal (W3). | [Code] `engineV2Scenario.ts:459, 464, 470` vs `:437–443` | D (if revealed) |

## 4. Eight-quarter learning assessment

The table assesses V2 as built and proposes changes. "Distinctive?" asks whether the quarter poses a leadership challenge the other quarters do not.

| Q | Students must learn | Information received | Decision (V2) | Trade-off | Visible consequences | Distinctive? | V3 proposal |
|---|---|---|---|---|---|---|---|
| Q1 | Prioritization and opportunity cost | Neutral market; company intro; role mandates | $30M allocation | Capability now versus cash flexibility | Small (Q1 effects are 50% or less mature) | Yes, as the opening | Keep. Add a **strategic intent** pick. Capture the team's **starting thesis**, which the board report reopens at Q8. |
| Q2 | Responding to technological change | GenAI headline; consumer pressure; Product/Growth private signals | Allocation only | Defend the core or move into AI | Revenue barely moves (all strategies $198–200M) | **No.** Mechanically identical to Q1 | Frame the quarter as a **stance on AI**: defend, pivot or hedge, with the intent pick tailored to this quarter. No new mechanics. |
| Q3 | Interpreting uncertainty | Deliberately conflicting signals | Allocation only | Which signal to trust | None about the signals themselves | **No** (mechanically). The evidence is excellent. | Add an **evidence citation**: "Which signal convinced us?", picked from this quarter's signals. After Q4, show a **signal-versus-noise reveal** from `truthReference` (facilitator-led). |
| Q4 | Choosing and defending a direction | Destination readiness (CEO), capabilities | Destination + allocation | Fit versus attractiveness | Readiness and transition load | Yes | Keep. The intent pick becomes the stated strategy against which later quarters are compared. |
| Q5 | Growth versus execution capacity | $48M contract terms, fit, load | Accept/decline + allocation | Revenue versus focus and capacity | Backlog, load, SLA risk | Yes, but the opportunity cost is weak: the contract never reduces investment capacity [B9] | Upfront cost claims the strategic envelope (economic design E5). |
| Q6 | Cost discipline versus capability | Recession signals; response menu | Optional management actions + allocation | Savings versus capability and culture | Savings now; damage mostly invisible to the price | Partly: a response is optional, a hiring freeze is infeasible with People investment, and a deep cut is rewarded by the price | **Mandatory stance**: Protect, Slow or Cut, always feasible. Make organizational consequences visible (E4, E9). |
| Q7 | Leadership under pressure | Crisis assessment: type follows the destination | Remediate, contain or absorb | Cash versus trust and capability | Severity, cost, aftershocks | Yes | Keep. A facilitator-timed decision (about 3 minutes) adds pressure without new mechanics. |
| Q8 | Long-term value creation | Earned options | Final option + allocation | Scale, raise, sell, stabilize or continue | Board report | Yes | Keep. The board report opens with the team's Q1 starting thesis against what was actually built. |

**Repetition.** Q1–Q3 are three allocation-only quarters. The fix is framing and evidence capture, not new mechanics: Q2 becomes a stance on AI and Q3 an evidence citation. A **pre-filled allocation** carried over from the previous quarter (today it resets to all-reserve [Code] `useV2Team.ts:14`) removes about one minute of mechanical re-entry per quarter without removing the decision.

## 5. Executive role assessment

For each role, the table shows what the role cares about and whether the current economics give its argument weight.

| Role | Prioritizes (brief KPIs) [Code] | Outcomes that matter (scorecard) [Code `insights/executive.ts:73–123`] | Natural conflict | When to challenge the CEO | Is the argument real in V2? |
|---|---|---|---|---|---|
| CEO | Revenue, pricing power, trust; destination readiness at Q4 | Destination readiness, strategy delivery, pricing power, focus | Must reconcile all four others | — | Yes |
| CFO | Cash, operating profit, margin, runway, debt, ownership | Margin, cash, return on capital, debt, ownership, distress | Against heavy investment and the contract; for reserve | When the plan risks liquidity or poor return on capital | **Weak.** Cash is rarely scarce [B9]. Return on capital is the one live lever. Becomes real with **financing-expanded investment** (E7) and the contract envelope claim (E5). |
| Product (CPO) | Product quality, AI capability, AI readiness | Product quality, AI readiness, AI-native revenue, trust | For AI/Product; against diverting roadmap to the contract | When the plan starves product or AI | **Too strong:** AI always wins [B9]. Becomes a real debate when AI returns depend on the market path and commercialization (E1, scenario paths). |
| Growth (CGO) | Consumer revenue, retention, pipeline | Revenue, retention, CAC, pipeline, win rate, renewals | For defending the base and for the contract | When the base erodes or the pipeline stalls | **Partly.** Consumer defense is real [B9: up to −$19M erosion]. The Enterprise and University growth paths are empty (W7). |
| People (CPeO) | Culture, talent, change load | Culture 0.3, talent 0.3, execution 0.15, load 0.25 | Against overload, layoffs and the contract's load | When load or cuts threaten execution and culture | **Weak economically** (W5). The scorecard does reward the People role [B10-D D6: People executive score 66 → 56 under a deep cut]. The share price ignores it. |

**Do the scorecards reinforce the roles?**

- **Yes, mostly [Code].** Each role's functional score measures its own mandate, and awards rank functional scores only.
- **Where they agree with each other.** The executive score is 60% functional and 40% company; the company part is the share price. Because the share price rewards a deep cut, the CFO's score rises (63 → 76 for Consumer-led) while the People officer's falls (66 → 56) [B10-D D6]. That is a *legitimate* conflict, and it makes a good debate.
- **Where they are distorted.** The only thing tilting that conflict is the share price ignoring organizational health. The fix belongs in valuation (economic design E9), not in the role scorecards.
- **Recommendation.** Leave NXLN-EXEC-1.1 unchanged.

**Recommendations for roles [Proposed]:**

1. **Bring back the unused stance.** At the decision step, each role may (optionally) record a one-tap stance on the plan: support, concern or oppose, plus the reason chips from its brief. This turns the existing `stances` field into the team's record of who argued what. In individual-device mode it takes about 10 seconds per person; on a shared device the CEO enters it. It feeds the debrief's "disagreements" view, which today uses private votes only.
2. **Rewrite the People and CEO brief lines** for Q2, Q4 and Q8 so that "two ways to read it" are genuinely competing readings, not two facts (W9).
3. **Give the CFO a live question every quarter** once E7 exists: "Do we raise capital to invest more this quarter?" This is not a new screen; it is the existing financing panel.

## 6. Classroom timing analysis

**V2 click count [Code, from the Explore audit].** Shared device with team commitment needs about 23–26 clicks and 4 screens per quarter, or roughly 200 over the session. Private-vote mode adds about 11 hand-off clicks per quarter.

**Timing model.** These are estimates for a facilitated MBA class, not measurements. They must be validated with a stopwatch pilot (validation plan, part E).

| Segment | V2 shared device (estimate) | V2 individual devices (estimate) | V3 target |
|---|---|---|---|
| Opening (company, roles, rules) | 10 | 10 | 8 |
| Per-quarter Understand (5 briefs) | 4–5 (sequential hand-off) | 2–3 (parallel) | 2–3 |
| Discuss & Decide (allocation, events, discussion fields) | 5–6 | 5–6 | 4–5 (pre-filled allocation; one risk, not two) |
| Commit | 1 | 1 | 0.5–1 |
| Results & Learn | 3–4 | 3–4 | 2–3 (Level 1 first; deep analysis optional) |
| Per quarter (typical) | 13–16 | 11–14 | 8–11 |
| Eight quarters | about 104–128 | about 88–112 | about 70–80 |
| Final report and debrief | 15 | 15 | 12–15 |
| **Total** | **≈130–150** | **≈115–135** | **≈90–100** |

**What has to change to reach about 90 minutes [Proposed]:**

1. **Make individual devices the recommended mode.** Briefs are read in parallel and the shared-device hand-off disappears. Shared device stays available as a fallback.
2. **Vary the time per quarter.** Q1, Q4, Q5 and Q8 are "major" (10–12 minutes); Q2, Q3, Q6 and Q7 are "fast" (6–8 minutes), using the facilitator's open-quarter control.
3. **Pre-fill each quarter's allocation** from the previous quarter.
4. **Ask for one risk instead of two.** Keep confidence. The intent pick replaces nothing.
5. **Keep deep analysis collapsed** (it already is) and put the board question first.
6. **Show a plain stage timer on the facilitator projector view** (no animation). Teams see "x min left" as text.

**Friction introduced by V3 proposals.** The intent pick, evidence citation and stance add about 30–60 seconds per quarter. Pre-fill and the single risk remove more than that. Mandatory free text would add 2–3 minutes a quarter, so it is **rejected**; free text stays optional.

## 7. Strategic hypothesis capture — specific UX design [Proposed]

This builds on the existing discussion block instead of adding a parallel one. It appears inside **Discuss & Decide**, under the allocation, in one ruled section titled *Our decision rationale*.

**1. Our strategy (required, one tap).** Pick one of five intents:

| Intent | Meaning |
|---|---|
| **Grow** | Win new revenue |
| **Defend** | Protect the current base |
| **Transform** | Build the future business |
| **Build capability** | Invest ahead of revenue |
| **Preserve flexibility** | Keep cash and options |

- **Quarter overlays:**
  - Q2 asks for a stance on AI (defend, pivot or hedge).
  - Q5 asks for the contract rationale (growth, reference account, or focus).
  - Q6 asks for the recession stance (protect, slow or cut; mandatory, see economic design).
- **Optional:** "In one line…" (140 characters).

**2. Our reasoning (required, one tap).** Choose one belief from the existing quarter-specific evidence list (`content/deliberationContent.ts`).
- In **Q3 and Q6** a second required tap asks "Which signal convinced us?", picked from the signals shown this quarter. This records evidence use without any typing.
- **Confidence** stays: Low, Medium or High.

**3. Our biggest risk (required, one tap).** Choose one risk from the existing list (down from two today).
- **Optional:** "What would tell us early?" (140 characters).

**Rules:**

- **Time budget:** 45–75 seconds per quarter (three to five taps). Free text is always optional.
- **Who enters it:**
  - **Shared device:** the team enters it together.
  - **Individual devices:** any role can propose it; the CEO's version is the one submitted.
- **Never graded by AI or by any automated score.** It exists for reflection and facilitator discussion.

**Where it is used:**

| Place | What appears |
|---|---|
| **Results & Learn** | "You expected" shows the intent, the belief and the named risk. Beside the risk: "Did it happen?", answered from the engine's recorded outcome where a mapping exists (e.g. risk "execution overload" → load ratio above 0.9; "cash strain" → status watch or worse). The text says "no clear signal" when no mapping exists. |
| **Reflection** | Existing learning options plus one new required tap: "Our risk call was…" (right / partly / wrong / too early to tell). |
| **Facilitator, Live tab** | After each commit: the team's intent and named risk, one line per team, visible only after commit. Privacy is unchanged: drafts stay private. |
| **Facilitator, Debrief tab** | All eight quarters of intent, belief, evidence, risk, confidence, agreement and reflection (fixes W1). |
| **Board report** (new section, "Intent and outcome") | An eight-row timeline: what we intended → what we did → what happened → what we learned. It opens with the Q1 starting thesis against the Q8 position. The defence prompts quote it ("In Q3 you trusted the RFP signal…"). |

**Storage.** Everything goes into the existing `deliberation` JSONB and `reflection` text. The debrief RPC already returns both [Code: `database/MIGRATION_V2_BATCH7_5_COMMITMENT.sql:341–342`]. **No database migration is needed.**

**Why structured choices plus optional text, rather than three mandatory text fields:**
- Taps take seconds; text takes minutes and is dominated by the fastest typist.
- Choices can be compared across teams and quarters in the debrief.
- The optional line keeps nuance for teams that want it.
- Three mandatory fields would add about 15–20 minutes over eight quarters. **[Hypothesis]**, to be checked in the pilot.

## 8. Student decision-making experience

- **Strong:** allocation with per-bucket estimates and a cash forecast; quarter events; "Competing executive considerations" per bucket; plain-language results.
- **Weak:**
  - Allocation fatigue (W2).
  - No early warning of wasted spend (W11).
  - No reveal of signal versus noise (W3).
  - In Q6, a response can be skipped.
  - In Q5, the contract has no capital cost.
- **Proposed:**
  - Pre-filled allocation.
  - A qualitative **"near limit" note** per bucket when the capability is within reach of its ceiling. For example: *"Consumer capability is close to what the organization can use; additional spend here will add little."* It is computed from engine state, and no formula is shown.
  - The Q3/Q4 reveal.
  - The mandatory Q6 stance.
  - The Q5 envelope claim.

## 9. Facilitator experience

- **Strong:** live progress; compare; leadership and awards; a debrief with pivotal moments and generated discussion questions; projector view; pacing and mode controls [Code].
- **Weak:**
  - No view of team intent, risks or reflections (W1).
  - No place for the facilitator's own observations.
  - No signal-versus-noise teaching aid.
  - No timing aid.
- **Proposed** (10A/10E):
  1. Intent and risk per team after each commit (Live tab).
  2. A full rationale timeline per team (Debrief tab).
  3. A **leadership observation rubric**: optional, manual, evidence-linked (section 10).
  4. The signal-versus-noise reveal for Q3 (and Q6), facilitator-controlled.
  5. A stage timer on the projector.
  6. A "class discussion" view comparing teams' Q2 stance, Q3 evidence and Q6 stance side by side, which is the strongest prompt for debate.

## 10. Evaluating leadership learning (separate from business performance)

**Business performance stays as it is:** revenue, profit, cash, share price, readiness, organizational health, viability, terminal score and executive scorecards.

**Leadership learning: a facilitator rubric [Proposed].** The facilitator records, at most, one level per criterion: *Evident*, *Partly* or *Not yet*, plus an optional note. The platform shows the evidence beside each criterion, but **never computes the level.**

| Criterion | Evidence surfaced automatically |
|---|---|
| Strategic coherence | Intent sequence; destination against allocation share in aligned buckets; changes of direction |
| Use of evidence | Beliefs chosen; Q3 and Q6 signal citations against the truth reveal |
| Recognition of trade-offs | Risks named; contract and recession rationale |
| Risk awareness | "Did it happen?" outcomes; confidence against result |
| Adaptation | Allocation and intent changes after disconfirming results |
| Collaboration | Agreement statements; recorded stances; vote splits (private-vote mode) |
| Accountability | Reflection "risk call" answers; board defence |

**Storage.** Rubric entries need a small new table (or a JSONB column on teams), written through a PIN-protected RPC. This is a database migration, in stage 10E.

## 11. Recommended educational improvements (priority order)

1. **Close the intent loop.** Capture the rationale (section 7) and carry it to results, the facilitator view and the board report. No engine change, no migration. Highest value.
2. **Fix the false "Culture paid for it" message** (W8) and the stale truth notes (W12). Small; restores trust in the feedback.
3. **Make Q1–Q3 distinct through framing and evidence capture**, and add the signal-versus-noise reveal.
4. **Meet the timing budget:** individual devices recommended, pre-filled allocation, one risk, major/fast quarters, stage timer.
5. **Add the facilitator rubric and observations** (needs a migration).
6. **Role stances and brief rewrites** for People and CEO.
7. **Economic changes that give roles real arguments**, in the V3 lab first:
   - financing-expanded investment (CFO);
   - organizational health in valuation and a culture link (People);
   - market-dependent AI returns (Product);
   - Enterprise and University conversion (Growth/CEO).

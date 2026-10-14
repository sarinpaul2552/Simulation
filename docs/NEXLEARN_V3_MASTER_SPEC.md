# NEXLEARN V3 — MASTER SPECIFICATION

> The complete instructions given by the product owner for the consolidated V3 assignment, saved verbatim (formatting normalised to Markdown) so that work can resume after any interruption. Source of truth for scope. Progress is tracked in `NEXLEARN_V3_PROGRESS.md`.

## 1. YOUR MISSION

You are the Principal Product Architect, Simulation Economist, Senior Full-Stack Engineer, QA Lead and Educational Experience Designer responsible for completing NexLearn V3.

NexLearn is an eight-quarter executive business simulation designed primarily for MBA students.

The product already has a functioning V2 simulation, a completed student-learning experience (Batch 10A), and a completed facilitator experience (Batch 10E).

Your assignment is to complete the remaining approved development work:

- Batch 10B: V3 Economic Engine
- Batch 10C: Executive Decision Mechanics
- Batch 10D: Three Authored Market Paths
- Batch 10F: Integrated Validation and Release Readiness

This is one consolidated implementation assignment.

Do not treat it as a request for another design study.

Do not ask for approval after every batch.

Work autonomously within the explicitly authorized scope, preserve completed functionality, and deliver one integrated NexLearn V3 Release Candidate for final review.

Do not push, merge or deploy.

Do not modify a production or shared database.

Do not start Batch 11 or propose additional feature-development batches.

## 2. PRODUCT PURPOSE — NON-NEGOTIABLE

NexLearn teaches a fundamental leadership lesson:

Running a business isn't about making the best decision in isolation. It's about making difficult choices with incomplete information, aligning people behind those choices, and taking responsibility for the consequences.

The product must develop:

- Strategic thinking.
- Resource allocation.
- Executive collaboration.
- Decision-making under uncertainty.
- Understanding of opportunity costs.
- Organizational judgment.
- Accountability for outcomes.
- Learning from decisions.

The financial engine provides consequences.

It is not the educational objective by itself.

Do not turn NexLearn into a game where students simply discover the investment allocation that maximizes share price.

Equally, do not artificially equalize strategies.

A strategy can be superior under certain conditions.

What matters is whether its advantages and disadvantages are economically credible.

## 3. CURRENT PRODUCT BASELINE

### Technology

- React
- TypeScript
- Vite
- Supabase
- Vercel
- GitHub

Repository: `sarinpaul2552/Simulation`

Production application: `simulation26.vercel.app`

### Completed work

**Batch 10A — Student Learning**

Completed on: `feature/batch10a-student-learning`

The implementation includes:

- Distinct Q1–Q3 decision framing.
- Strategic priority and supporting evidence.
- Confidence and one biggest risk.
- Optional notes.
- Q3 signal interpretation.
- Post-Q4 signal assessment.
- Intention-versus-outcome reflection.
- Autosaved reflections.
- Validated investment prefill.
- Classroom pacing hints.

**Batch 10E — Facilitator Experience**

Completed on: `feature/batch10e-facilitator`

Latest reported commit: `7e103fa`

It includes:

- Class Discussion.
- Side-by-side team comparisons.
- Q3 signal analysis.
- Eight-quarter strategy timelines.
- Final debrief.
- Anonymous projector mode.
- Optional facilitator stage clock.
- Last committed priorities in Live view.
- Improved student board report.

These features are completed work.

Do not rebuild them.

Inspect their implementation, preserve their behavior, and adapt only the integration points necessary for V3.

### Existing test baseline

Batch 10E reported:

- 727 unit tests passed.
- 18 unit tests skipped.
- 14 database tests passed.
- Type-check passed.
- Production build passed.
- New 10E browser test passed.
- Full browser suite: 24 passed, 1 skipped, 1 failed.
- The failed test passed on repeated isolated runs.

Treat these as historical reported results, not a substitute for rerunning the tests.

Investigate recurring environment stalls without concealing them.

## 4. EXECUTION CONTINUITY — CRITICAL

Before coding, create:

`NEXLEARN_V3_MASTER_SPEC.md`

Save the complete instructions from this prompt in that file.

Also create:

`NEXLEARN_V3_PROGRESS.md`

Maintain a progress record containing:

- Current batch.
- Completed work.
- Relevant files.
- Git commits.
- Test results.
- Known issues.
- Unresolved dependencies.
- Next implementation task.

Update the progress file after each completed internal milestone.

If the session is interrupted, context is compacted or work resumes in another session:

1. Read the master specification.
2. Read the progress file.
3. Inspect the actual Git state.
4. Verify the last completed checkpoint.
5. Continue without repeating completed work.

Do not rely on conversational memory alone.

## 5. REPOSITORY AND GIT SAFETY

Before making changes:

- Inspect git status.
- Inspect local branches and commit ancestry.
- Confirm Batch 10A and 10E commits are present.
- Locate Batch 9 economic studies.
- Locate the Batch 10 design documents.
- Identify the frozen V2 engine.
- Identify existing engine tests.
- Identify facilitator and board-report integration points.
- Identify the database and server-function architecture.

Read the relevant documents before implementing economic changes.

Use the actual repository as the source of truth.

### Branch strategy

Create a new local integration branch from the completed Batch 10E commit.

Suggested name: `feature/nexlearn-v3-integration`

Preserve existing Batch 10A and 10E branches.

Create clear commits for each remaining batch.

Do not rewrite existing history.

Do not force-push.

Do not merge into main.

Do not push to GitHub.

Do not deploy.

Do not run destructive Git commands.

### Database rule

You may design and prepare database migrations where necessary.

You may test migrations against an isolated local database if the environment is clearly confirmed to be disposable.

Do not apply migrations to a shared or production Supabase project without approval.

If a required schema change cannot be safely tested or implemented locally, document the blocker and continue independent work where possible.

## 6. BATCH 10B — V3 ECONOMIC ENGINE

### Objective

Create an economically credible V3 engine that produces meaningful strategic trade-offs without making one investment strategy universally dominant.

The existing V2 engine must remain intact.

### 6.1 Preserve V2

Do not overwrite the frozen V2 engine.

Implement a separate V3 version or explicitly versioned calculation layer.

Existing V2 sessions must continue producing their original outcomes.

Do not silently migrate existing sessions to V3.

### 6.2 Starting economic model

Use the existing V2 baseline and Batch 9 analysis.

The reported initial company position includes:

| Metric | Starting position |
|---|---|
| Quarterly revenue | $200M |
| Quarterly operating costs | $170M |
| Starting cash | $60M |
| Quarterly investment envelope | $30M |

Initial revenue composition:

| Business | Revenue |
|---|---|
| Consumer | $140M |
| Enterprise | $40M |
| University | $16M |
| AI-native | $4M |

Verify these values against the repository before treating them as authoritative.

### 6.3 AI economics

Batch 9 found that AI investment generated disproportionately strong compounding returns.

V3 should make AI attractive without making it the obvious answer in nearly every scenario.

Examine:

- Adoption rates.
- Monetization.
- Commercialization delays.
- Execution constraints.
- Competitive pressure.
- Investment efficiency.

Do not simply penalize AI because it performed well.

Changes must have a defensible economic explanation.

### 6.4 Enterprise economics

Enterprise capability currently appears to grow faster than its commercial returns.

Improve the relationship between:

- Enterprise investment.
- Capability.
- Pipeline generation.
- Contract win probability.
- Conversion.
- Revenue recognition.
- Delivery costs.

The economic study suggested testing:

- Higher pipeline generation.
- Greater win-rate sensitivity to capability.
- Faster revenue recognition.
- Lower delivery-cost commitments.

Treat these as experimental hypotheses, not approved constants.

### 6.5 University economics

University investments should have plausible commercial consequences.

Preserve delayed returns where appropriate.

Test:

- Pipeline formation.
- Institutional adoption.
- Conversion.
- Revenue recognition.
- Long-term capability value.

Do not make University an instant-growth business simply to improve its performance.

### 6.6 Consumer economics

Consumer investment must remain strategically relevant.

Test whether investment supports:

- Retention.
- Growth.
- Competitive resilience.
- Cash generation.

Consumer should not become a universally inferior allocation merely because AI exists.

### 6.7 People and organizational health

Improve the relationship between:

- Employee investment.
- Organizational capacity.
- Workload.
- Culture.
- Delivery execution.
- Long-term economic outcomes.

Avoid situations where severe layoffs create consistently attractive financial outcomes with negligible future consequences.

However, do not make layoffs universally wrong.

The model should recognize that workforce reductions can sometimes be financially necessary.

### 6.8 Valuation

Review whether share price reflects:

- Revenue growth.
- Profitability.
- Cash.
- Financial risk.
- Execution capability.
- Organizational sustainability.

Avoid arbitrary valuation adjustments designed to reward supposedly virtuous decisions.

### 6.9 Economic laboratory

Create a reproducible V3 testing laboratory.

Compare V2 and V3 under equivalent inputs.

Test at least:

- AI-heavy.
- Consumer-heavy.
- Enterprise-heavy.
- University-heavy.
- People-heavy.
- Diversified.
- Cash-preservation.
- Adaptive.
- Deliberately weak strategies.

Use deterministic seeds wherever randomness exists.

Run sensitivity tests.

Check financial identities.

Investigate dominant strategies.

Do not use arbitrary parity as the definition of success.

### Batch 10B completion criteria

- V2 engine unchanged.
- V3 engine implemented separately.
- Deterministic outputs.
- Financial calculations reconcile.
- No unexplained impossible states.
- Investment categories have economically understandable consequences.
- AI dominance examined.
- Comparative test report completed.
- Relevant tests pass.

Commit locally and record results.

## 7. BATCH 10C — EXECUTIVE DECISION MECHANICS

### Objective

Make major executive choices economically coherent, consequential and understandable.

Apply these changes to V3.

Preserve V2 behavior.

### 7.1 Q5 Enterprise Contract

Review the major enterprise contract.

Model:

- Upfront cost.
- Cash requirements.
- Investment opportunity cost.
- Future revenue.
- Delivery obligations.
- Organizational workload.
- Contract risk.

Ensure costs are counted once.

Make the consequences visible to students.

Do not make contract acceptance automatically superior.

### 7.2 Q6 Recession

Make recession response an explicit executive decision.

Include meaningful choices involving:

- Cash preservation.
- Cost reduction.
- Workforce stability.
- Continued investment.
- Execution capability.

Avoid universally optimal options.

Do not turn the event into a moral quiz.

### 7.3 Financing

Review:

- Cash raised.
- Financing costs.
- Investment-envelope effects.
- Future obligations.
- Financial risk.

Ensure financing does not create unlimited spending capacity.

### 7.4 Capability ceilings

Avoid investment decisions that appear productive but silently waste substantial capital after capability reaches its useful limit.

Use credible diminishing returns, constraints or clear feedback.

Do not introduce unnecessary mechanics.

### 7.5 Decision transparency

For each major event, students should understand:

- The decision.
- Available information.
- Known costs.
- Key uncertainty.
- Opportunity cost.

Do not reveal future consequences prematurely.

### Batch 10C completion criteria

- All major event choices work.
- Economic effects are internally consistent.
- Cash flows reconcile.
- Constraints are enforced.
- Explanations match calculations.
- V2 remains compatible.
- Relevant tests pass.

Commit locally.

## 8. BATCH 10D — THREE AUTHORED MARKET PATHS

### Objective

Introduce replayability and varied strategic conditions.

Build three complete market paths.

**Path A — AI Acceleration.** Focus on: rapid AI adoption; consumer disruption; product transformation; competitive pressure; organizational adaptation.

**Path B — Enterprise Transformation.** Focus on: enterprise demand; contract opportunities; delivery capability; workforce capacity; execution risk.

**Path C — Economic Pressure.** Focus on: weakening demand; financial constraints; cash preservation; workforce decisions; strategic resilience.

These are proposed themes.

Use the approved design documents if they contain more specific requirements.

### 8.1 Common classroom conditions

All teams in one classroom session must face the same market path.

The facilitator chooses the path before the session begins.

Do not allow mid-session changes.

### 8.2 Complete narratives

Each path must have eight coherent quarters.

Events should develop logically.

Do not simply change economic multipliers.

### 8.3 Economic differentiation

Different paths should reward different capabilities and strategic responses.

However, avoid creating predetermined winning strategies.

Students should still face uncertainty.

### 8.4 Integration with Batch 10A

Ensure:

- Q1–Q3 learning prompts remain meaningful.
- Q3 signal selection works.
- Q4 signal assessment reflects the selected path.
- Reflection history remains accurate.

### 8.5 Integration with Batch 10E

Ensure:

- Class discussion reflects the selected scenario.
- Q3 signal comparisons remain accurate.
- Timelines work.
- Board reports use correct scenario information.
- Facilitator debriefs remain coherent.

### Batch 10D completion criteria

- Three complete market paths.
- Eight quarters per path.
- Stable session-level scenario selection.
- All teams share the same conditions.
- Scenario-specific outcomes work.
- Facilitator and student views remain accurate.
- Relevant tests pass.

Commit locally.

## 9. BATCH 10F — FINAL VALIDATION

### Objective

Validate the integrated NexLearn V3 product.

This is the final planned development phase.

Do not use 10F to introduce another round of redesign.

### 9.1 Integration verification

Confirm that:

- Batch 10A works.
- Batch 10E works.
- Batch 10B economics work.
- Batch 10C decisions work.
- Batch 10D scenarios work.
- V2 sessions remain compatible.

### 9.2 Complete eight-quarter testing

Run complete simulations with:

- Multiple teams.
- Five executive roles.
- Different investment strategies.
- Different economic conditions.
- All three market paths.
- Desktop and mobile layouts.
- Refreshes and reconnects.
- Invalid decisions.
- Simultaneous submissions.
- Facilitator progression.
- Board-report generation.

### 9.3 Economic testing

Run a final V3 headless simulation study.

Investigate:

- Dominant strategies.
- Unintended arbitrage.
- Cash-flow inconsistencies.
- Impossible financial states.
- Unreasonable valuation movements.
- Contradictory event effects.
- Capability investments without meaningful returns.

Do not redesign the engine merely because one strategy performs better.

### 9.4 Facilitator testing

Specifically verify the completed Batch 10E functionality:

**Class Discussion:** accurate team comparisons; correct intention and decision history; correct financial outcomes; correct reflections.

**Q3 Signals:** correct signal references for each market path; assessments remain gated until all participating teams finish Q4.

**Projector:** anonymous team labels; no team PINs or codes; reflections hidden by default; selected reflections shown deliberately.

**Stage Clock:** operates independently; never advances or locks gameplay.

**Board Report:** intent and outcome table accurate; defence questions use recorded student reasoning; no invented explanations.

### 9.5 Classroom timing

Target 90 minutes:

| Activity | Minutes |
|---|---|
| Opening | 5 |
| Q1–Q3 | 18 |
| Q4 | 9 |
| Q4 signal review | 2 |
| Q5–Q8 | 36 |
| Final debrief | 20 |
| Total | 90 |

These are design targets.

Do not claim they have been validated without a timed rehearsal.

If no human participants are available, report that limitation.

### 9.6 Defect classification

**P0 — Must fix:** simulation cannot complete; decisions are lost; financial calculations are incorrect; session progression fails; material authorization failures.

**P1 — Important:** incorrect comparisons; misleading explanations; broken board reports; serious usability issues.

**P2 — Defer:** additional dashboards; cosmetic improvements; extra scenarios; optional analytics.

Fix P0 defects.

Fix P1 defects necessary for classroom readiness.

Defer P2 enhancements.

## 10. SCOPE CONTROL

The following are not part of this assignment:

- Additional executive roles.
- More than eight quarters.
- Additional investment categories.
- New scoring systems.
- Automated leadership grading.
- AI-generated coaching.
- New dashboards unrelated to the approved roadmap.
- Further economic studies without a specific validation purpose.
- Unrelated visual redesign.
- New feature batches.

SEC-001 and SEC-002 are documented technical issues.

Do not implement them in this assignment.

Do not spend development time redesigning scenario confidentiality or moving the engine to the server unless a directly required V3 feature cannot function without a narrowly scoped server change. In that case, document the dependency and seek approval.

Do not repeatedly raise these deferred issues as blockers to ordinary V3 development.

Preserve existing permission checks and avoid introducing new authorization regressions.

## 11. TESTING AND QUALITY

At each completed batch:

- Run unit tests.
- Run TypeScript checks.
- Run production build.
- Run relevant database tests.
- Run relevant browser tests.
- Run economic regression tests.
- Record failures and skipped tests.

Do not claim tests passed if they were not run.

Investigate flaky tests.

Do not delete failing tests to make the suite green.

Preserve working functionality.

Keep economic rules separate from presentation logic.

Avoid duplicated calculations.

Maintain responsive layouts.

Preserve existing data.

## 12. AUTONOMOUS EXECUTION

You are authorized to complete the remaining approved scope without asking for confirmation after every internal batch.

Proceed in this order: 10B → 10C → 10D → 10F

You may make routine engineering decisions autonomously.

You must stop for approval only if:

- A production or shared database migration is required.
- A destructive migration is required.
- A material access-control change is required.
- V2 compatibility cannot be preserved.
- A major product decision conflicts with approved requirements.
- A critical blocker cannot be resolved safely.

Otherwise, continue working and document decisions.

Do not push, merge or deploy.

## 13. REQUIRED DELIVERABLES

Create the following final reports.

**Economic engine:** `BATCH10B_V3_ECONOMIC_REPORT.md`, `BATCH10B_V2_V3_COMPARISON.md`

**Executive decisions:** `BATCH10C_EXECUTIVE_DECISION_REPORT.md`

**Market scenarios:** `BATCH10D_MARKET_SCENARIOS.md`

**Validation:** `BATCH10F_TEST_REPORT.md`, `BATCH10F_ECONOMIC_VALIDATION.md`, `BATCH10F_CLASSROOM_TIMING_REPORT.md`

**Product and release:** `NEXLEARN_V3_RELEASE_SUMMARY.md`, `NEXLEARN_V3_FEATURE_INVENTORY.md`, `NEXLEARN_V3_CLASSROOM_PLAYBOOK.md`, `NEXLEARN_V3_KNOWN_LIMITATIONS.md`, `NEXLEARN_V3_RELEASE_CHECKLIST.md`, `NEXLEARN_V3_DEPLOYMENT_PLAN.md`, `NEXLEARN_V3_FINAL_HANDOFF.md`

Reuse existing Batch 10A and 10E documentation.

Do not rewrite completed reports unnecessarily.

## 14. FINAL RELEASE CRITERIA

NexLearn V3 qualifies for final release review when:

**Product:** eight quarters work; five executive roles work; three market paths work; major executive decisions work; facilitator functionality works; board reports work.

**Economics:** V3 engine is validated; V2 remains unchanged; financial calculations reconcile; strategic choices produce credible consequences.

**Engineering:** type-check passes; build passes; relevant automated tests pass; no unresolved P0 defects; no unauthorized database changes.

**Education:** student reasoning is captured; decisions create meaningful trade-offs; results support reflection; facilitators can compare teams; a structured 90-minute session is supported.

**Release:** all changes committed locally; documentation completed; deployment instructions prepared; known limitations documented; no push, merge or deployment performed.

Do not claim completion of anything that has not been verified.

## 15. FINAL HANDOFF

When all remaining batches are complete, provide one consolidated report titled:

**NEXLEARN V3 — FINAL RELEASE CANDIDATE REVIEW**

Include:

- Batch 10B implementation summary.
- Batch 10C implementation summary.
- Batch 10D implementation summary.
- Batch 10F validation results.
- Confirmation that Batch 10A and 10E remain functional.
- V2 versus V3 economic comparison.
- Description of the three market paths.
- Full test results.
- Database changes requiring approval.
- Known limitations.
- Outstanding P0/P1 defects.
- Actual versus estimated classroom timing.
- Git branch and commit details.
- Release status: GREEN / AMBER / RED.
- Exact steps required for final approval and deployment.

Do not claim GREEN if required tests have failed or critical functionality remains unverified.

Do not claim that a real classroom pilot occurred unless it actually happened.

Do not propose Batch 11.

## FINAL DIRECTIVE

Complete NexLearn V3.

Preserve the completed Batch 10A and Batch 10E experiences.

Build the V3 economic engine.

Improve executive decisions.

Implement three market paths.

Validate the integrated product.

Make routine engineering decisions independently.

Do not expand the scope.

Do not push, merge or deploy.

Deliver a tested, documented NexLearn V3 Release Candidate for final approval.

The objective is a finished product, not another iteration cycle.

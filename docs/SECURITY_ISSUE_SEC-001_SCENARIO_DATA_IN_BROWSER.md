# SEC-001 — Future scenario data is shipped to the browser

| | |
|---|---|
| **Status** | **Open.** Recorded in Batch 10A (product-owner instruction). **Must be resolved before commercial release.** |
| **Severity** | High for commercial or assessed use: a student can see the future and the "answers". Low for the current pilot use. |
| **Introduced** | Pre-existing since the V2 production engine (before Batch 10A). Batch 10A neither causes it nor makes it worse. |
| **Release gate** | Commercial release is blocked until the acceptance criteria below are met. |

## Finding (verified)

The V2 engine runs in the browser, so the complete scenario is part of the production JavaScript bundle. A production build was checked with `npm run build` and a search of `dist/assets/index-*.js`. It contains:

- **All eight quarters' scenario content**, including future events and their identifiers (for example the Q7 crisis ids). A student in Q1 can read what happens in Q4–Q8.
- **Hidden truth used for debrief only:** every signal's `truthReference` (for example "Paying AI-native demand actually eased…") and the scenario `designNotes` (for example "Signals deliberately diverge from truth…").
- **Market parameters** (demand indices such as `enterpriseDemand`) and every engine constant.
- **All role-private brief content.** The briefs are assembled in the browser, so on individual devices a player could read other roles' private briefs from the code. The UI shows each player only their own brief.

Reading these requires opening the browser's developer tools or the bundle file. No server access or credentials are needed. The database is not affected, and RLS and team ownership rules still protect every write.

## Why UI gating is not enough

Batch 10A's signal reveal is gated on the server's `completed_quarter`, so the *interface* never shows it early. The underlying text is nevertheless already in the bundle. Client-side hiding alone does not protect future scenario information.

## Required resolution (proposal; needs product-owner approval of the RPC and migration changes)

1. **Server-side scenario delivery.**
   - Move the scenario arc (signals, truth, design notes, future events) out of the client bundle.
   - Serve each quarter's student-facing content from a `SECURITY DEFINER` RPC that returns only quarters up to the team's open quarter, and each private brief only to the role that owns it.
2. **Server-side reveal.** `v2_get_signal_reveal(team_code)` returns the Q3 assessments only when the team's `completed_quarter ≥ 4`.
3. **Server-side resolution.** Resolve quarters on the server (an Edge Function or RPC running the engine), so market parameters and constants never need to reach the client. This is the larger change. It interacts with the frozen engine and the V3 plan (10B–10F), so it should be designed together with V3.
4. **Build check.** Add a CI test that fails if the production bundle contains `truthReference`, `designNotes`, demand-parameter names or future-quarter identifiers.

## Acceptance criteria

- A production bundle search finds no truth notes, design notes, demand parameters or future-quarter content.
- An API test shows that a team cannot obtain content for unopened quarters, other roles' private briefs (in individual-device mode), or the reveal before Q4 is completed.
- Existing V2 sessions still replay bit-identically.

## Interim mitigation (until resolved)

- Use the simulation for learning, not for graded assessment.
- Do not market it as tamper-proof.
- Facilitators may note that the simulation is a learning exercise and that looking up the code defeats its purpose.

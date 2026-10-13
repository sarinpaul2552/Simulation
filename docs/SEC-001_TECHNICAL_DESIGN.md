# SEC-001 — technical design and approval requirements

**Issue:** future scenario data, hidden truth notes, design notes, market parameters and all role-private brief content ship in the production JavaScript bundle (`SECURITY_ISSUE_SEC-001_SCENARIO_DATA_IN_BROWSER.md`).

**Status:** design only. Nothing in this document is implemented. Batch 10E does not change this behaviour.

**Release gate:** must be resolved before commercial release.

## 1. Current architecture (verified)

| Step | Where it runs | Data needed |
|---|---|---|
| Briefings: shared and role-private | Browser (`content/roleContent.ts`, `insights/briefing.ts`) | Scenario quarter: signals, headlines, and the company state |
| Decision validation and CFO forecast | Browser (`adapter.ts`: `validateQuarterInput`, `forecastQuarter`) | Engine and scenario: market parameters, event definitions |
| **Quarter resolution** | **Browser**: `gameService.commitQuarter` → `resolveQuarter` → `v2_resolve_quarter(team, quarter, version, input, snapshot, headline)` stores the **client-computed** snapshot | Engine, scenario and constants |
| Integrity | Facilitator browser: `auditTeam` replays inputs and compares headlines | Engine |
| Results, insights, board report, signal reveal | Browser | History replay, scenario truth (reveal) |

Because the engine and the scenario resolve every quarter in the browser, the whole scenario has to reach the browser. Hiding only the "truth" is therefore not enough, and neither is removing it from one screen.

## 2. Threat model

| Actor | Goal | Today | Severity |
|---|---|---|---|
| Student with developer tools | Read future events (Q4–Q8), the market path, truth notes, or another role's private brief | Possible | High in assessed or commercial use |
| Student editing requests | Submit a fabricated snapshot or headline for a valid input | Stored; detected only by the facilitator's "Verify integrity" audit (replay) | Medium (detectable, not prevented). **Related item; propose tracking as SEC-002.** |
| Another team | Read a different team's game | Prevented: RPCs require the team code; block-all RLS | — |
| Public | Read the facilitator view | Prevented: the PIN is checked in `SECURITY DEFINER` RPCs | — |

## 3. Options

### Option A — stage the scenario by quarter (partial fix)

- Move student-facing scenario content (briefings, signals, event cards) into database rows, served by a new RPC `v2_get_quarter_content(team_code, quarter)`. It returns only quarters up to the team's working quarter, and private briefs only for the requested role (individual-device mode).
- Strip `truthReference`, `designNotes` and future-quarter text from the client build: split `engineV2Scenario.ts` into an economics part (still bundled) and a content part (served).
- **Limitation:** the engine still needs the market parameters (`demand`, `competitorProgress`) to resolve quarters in the browser. Future *numbers* therefore stay readable, though the *narrative* and truth are hidden.
- **Effort:** medium.
- **Risk:** low to medium. It touches the frozen scenario file through a build-time split, so a freeze exception would be needed.

### Option B — server-side resolution (full fix; recommended target)

- Run the frozen V2 engine on the server: a Supabase Edge Function (Deno) or a small Node service, called by `v2_resolve_quarter`. The server computes and stores the snapshot. The browser receives only results for completed quarters and content for its working quarter.
- The browser no longer bundles the engine or the scenario. The forecast and validation become RPCs (`v2_forecast`, `v2_validate`).
- The signal reveal and the facilitator replay become server responses, gated on `completed_quarter ≥ 4`.
- **This also closes SEC-002:** client-computed results are no longer trusted.
- **Effort:** high. It needs a new runtime, deployment, latency budgets and a test harness proving bit-identical replays against the current client engine.
- **Risk:** medium. Mitigated by per-session engine versioning (as planned for V3 in 10F) and by keeping V2 client sessions working until they finish.

### Option C — obfuscation only

Minify or encrypt the scenario in the bundle. **Not recommended:** the decryption key would also ship to the browser.

## 4. Recommendation

- **Before a commercial pilot:** Option A, plus a CI bundle check. This removes truth notes, design notes, future narrative and other roles' private briefs from the client.
- **Before full commercial release:** Option B, combined with the V3 engine work (10B–10F), so the server-side engine is built once for V3 and V2 is served unchanged.

## 5. Changes required (Option A), each needing explicit approval

| Change | Type |
|---|---|
| New table `v2_scenario_content(quarter, audience, payload JSONB)` with block-all RLS | Additive migration |
| New RPC `v2_get_quarter_content(p_team_code, p_quarter, p_role)`: `SECURITY DEFINER`; checks quarter ≤ working quarter; role-private content only for that role in individual-device mode | Additive migration |
| New RPC `v2_get_signal_reveal(p_team_code)`: returns the Q3 assessments only when `completed_quarter ≥ 4` | Additive migration |
| Facilitator variant `v2_facilitator_signal_reveal(session, PIN)`: same gate across all participating teams | Additive migration |
| Split of `engineV2Scenario.ts` into bundled economics and served content (build step or generated module) | **Freeze exception** (no economic change; verified by a byte-identical replay test) |
| Client: briefings, the reveal and the facilitator Q3 panel load content through the RPCs; offline/test-lab mode keeps the local copy | App change |
| CI test: the production bundle must not contain truth notes, design notes or future-quarter content | Test |

## 6. Compatibility with existing sessions

- Inputs and snapshots are unchanged. Existing V2 sessions continue and replay bit-identically.
- Content served by RPC is seeded from the same authored text, so students see the same words.
- A rollback restores the bundled content path behind a flag.

## 7. Tests and acceptance

1. A production bundle search finds no `truthReference`, `designNotes` text, demand-parameter names in content, or future-quarter narrative. Option B adds: no engine constants.
2. API tests:
   - a team cannot fetch content for quarter > working quarter;
   - in individual-device mode, a role cannot fetch another role's private brief;
   - the reveal returns nothing before Q4 is completed;
   - the facilitator's PIN is required.
3. Replays of all stored sessions (lab and production export) stay bit-identical.
4. The full unit, database and E2E suites pass, along with the facilitator and student flows.

## 8. Decisions requested

1. Approve Option A for the commercial pilot, and Option B as the target with V3. Or choose B directly.
2. Approve the freeze exception for splitting the scenario file (content only; economics byte-identical).
3. Approve the additive migrations listed in §5. They are applied to production only with separate approval.
4. Approve tracking client-computed results as **SEC-002** (resolved by Option B).

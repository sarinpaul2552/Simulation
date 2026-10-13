# NexLearn V3 — Known limitations

## Validation

1. **No classroom rehearsal or pilot.** The 90-minute timing is a design target. No human participants were available in this assignment.
2. **Hypotheses only partly met:**
   - **H9:** the price ranking of strategies is similar across paths (Spearman 0.90–0.95; target ≤ 0.7). Paths change the best focus and reward reading the evidence, but they do not reorder the whole field.
   - **H1:** AI-led is 4th, not top-3, in path A.
   - **H4:** a deep cut still adds $3.7 to University-led's Q8 price (target ≤ $3); the Q12 check is out of scope (eight quarters).
   - **H5:** no dedicated paired test of People under high load.
   - **H11:** no tested policy, even maximum expansion, became insolvent.

   See `BATCH10F_ECONOMIC_VALIDATION.md`.
3. **Marginal returns within eight quarters.** From a balanced base, an extra $5M to Consumer, Enterprise or University lowers the Q8 price in every path. Slow-building capabilities pay back mainly through focus and in path B. This is a property of the horizon, not an accounting error.
4. **A dominant pattern exists:** "AI + People + one focused market with the aligned destination" leads in all paths. Which market to focus on depends on the path. It is credible, but facilitators should expect strong teams to converge on it.

## Engineering

5. **Database migration not applied.** `MIGRATION_V3_MARKET_PATHS.sql` is tested only on the disposable local database. Production needs approval and the deployment steps. Until it is applied, the setup screen still offers the paths but session creation fails with a clear message, and "Original NexLearn (V2)" keeps working.
6. **SEC-001 and SEC-002 are unchanged (deferred by the brief).**
   - Scenario data, including the three paths' authored truth notes, ships in the browser bundle.
   - The client computes results and the server stores snapshots. The server checks structure, engine and path, and the facilitator audit verifies by replay.
7. **Mechanism switches are module state.** `V3_ECONOMICS` is changed only by the laboratory (`withV3Economics`); production never changes it. Changing a constant in a future release changes how stored V3 games replay. Such a change needs a new engine version string, as for V2.
8. **The V2 results text is frozen.** The misleading "Culture paid for it" sentence remains in V2 games (frozen adapter); it is fixed in V3.

## Product

9. **Path name hidden from students during play** (by design). The facilitator reveals it at the debrief.
10. **The forecast while over budget is approximate.** When a team's plan exceeds the budget (for example, before entering an expansion), the CFO panel shows terms computed with the plan scaled to the budget. The over-budget error is shown at the same time.
11. **Targeted workforce reduction never came out best** on any measure in the laboratory stance study. It is a legitimate but rarely superior middle option.
12. **E2E environment stalls.** In earlier batches a page or fetch occasionally hung for minutes. None occurred in the 10F runs recorded in `BATCH10F_TEST_REPORT.md`, but the cause was not identified and the issue may recur.

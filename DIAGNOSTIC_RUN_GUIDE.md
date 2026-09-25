# Q1 DIAGNOSTIC TRACE — HOW TO RUN

## Objective
Capture the exact values flowing through the Q1 Balanced + Leadership Aligned test run to determine why:
- Expected ending consumer capability: **65.0** (per invariant)
- Actual ending consumer capability: **60.0** (observed)
- **Discrepancy: -5.0**

## Prerequisites

- Build succeeds: `npm run build` ✓
- Instrumentation committed:
  - `src/testlab/utils/quarterRunner.ts` — Logs all state transformations
  - `src/testlab/utils/invariantChecker.ts` — Logs invariant evaluation details
  - These are diagnostic-only; no logic changes

## Running the Test

### Option A: Local Dev Environment

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser:**
   ```
   http://localhost:5173/devlab
   ```

3. **Select Mode 2: Full Strategy Test**
   - Choose strategy: `Balanced + Leadership Aligned` (labeled as such in the UI)
   - Click "Run Test"

4. **Capture console output:**
   - Open browser DevTools: `F12` or `Ctrl+Shift+K`
   - Switch to Console tab
   - Run the test
   - Entire Q1 trace will print (Q2–Q8 will have minimal logging)

### Option B: Vercel Deployment (if needed)

1. **Enable test lab flag:**
   ```javascript
   localStorage.setItem('ENABLE_TESTLAB', 'true');
   location.href = '/devlab';
   ```

2. **Select and run Balanced + Leadership Aligned strategy**

3. **Capture console:**
   - Open DevTools
   - Console tab shows the trace

---

## Expected Console Output

The diagnostic trace will show (in order):

```
================================================================================
Q1 DIAGNOSTIC TRACE - Balanced + Leadership Aligned
================================================================================
Available Capital: 30M
Allocation weights: {consumer: 1/6, enterprise: 1/6, ai: 1/6, people: 1/6, cred: 1/6, cash: 1/6}
Allocation actual: {consumer: 5.00, enterprise: 5.00, ai: 5.00, people: 5.00, cred: 5.00, cash: 5.00}
Role Votes: null (neutral/leadership-aligned)

EFFECTIVE INVESTMENTS (diminishing returns):
  consumerGrowth: 5.00M → effective: 5.00
  enterpriseSales: 5.00M → effective: 5.00
  aiProduct: 5.00M → effective: 5.00
  instructorPeople: 5.00M → effective: 5.00
  universityCredential: 5.00M → effective: 5.00

STARTING STATE (before engine call):
capabilities: {consumer: 55.0, enterprise: 30.0, ai: 10.0, talent: 55.0, credential: 40.0, customerSuccess: 30.0, growth: 55.0, execution: 60.0}

AFTER ENGINE CALL:
capabilities: {consumer: 60.0, enterprise: 31.2, ai: 13.0, talent: 55.0, credential: 42.5, customerSuccess: 30.0, growth: 55.0, execution: [execution alignment score]}
StartingState mutated by engine: [true/false]

CONSEQUENCE DELTAS:
capabilityChanges: {
  consumer: 5.0,
  enterprise: 1.2,
  ai: 3.0,
  talent: 0.0,
  credential: 2.5,
  customerSuccess: undefined,
  growth: undefined,
  execution: [delta value]
}

AFTER applyConsequence (UNCLAMPED):
capabilities: {consumer: 60.0, enterprise: 31.2, ai: 13.0, talent: 55.0, credential: 42.5, customerSuccess: 30.0, growth: 55.0, execution: [execution]}

AFTER clampState (CLAMPED):
capabilities: {consumer: 60.0, enterprise: 31.2, ai: 13.0, talent: 55.0, credential: 42.5, customerSuccess: 30.0, growth: 55.0, execution: [execution]}

INVARIANT DETAILED EVALUATION (consumer):
  startingState.capabilities.consumer: [?]
  consequence.capabilityChanges.consumer: [?]
  expectedCap (starting + delta): [?]
  endingState.capabilities.consumer: 60.0
  Difference (expected - actual): [?]
  PASS/FAIL: [FAIL if expected != 60.0]

ALL CAPABILITY DELTAS:
  consumer: starting=[?], delta=[?], expected=[?], actual=60.0, match=[PASS/FAIL]
  enterprise: starting=[?], delta=[?], expected=[?], actual=31.2, match=[PASS/FAIL]
  ai: starting=[?], delta=[?], expected=[?], actual=13.0, match=[PASS/FAIL]
  talent: starting=[?], delta=[?], expected=[?], actual=55.0, match=[PASS/FAIL]
  credential: starting=[?], delta=[?], expected=[?], actual=42.5, match=[PASS/FAIL]
  customerSuccess: starting=[?], delta=N/A (no delta), expected=[?], actual=30.0, match=N/A (no delta)
  growth: starting=[?], delta=N/A (no delta), expected=[?], actual=55.0, match=N/A (no delta)
  execution: starting=[?], delta=[?], expected=[?], actual=[?], match=[PASS/FAIL]

INVARIANT CHECKS:
  state_consumer_cap_consistent: [PASS/FAIL] - Expected: [?], Got: 60.0
  state_enterprise_cap_consistent: [PASS/FAIL] - Expected: [?], Got: 31.2
  ...

================================================================================
SUMMARY
================================================================================
All Q1 invariants passed: [true/false]
Failed checks: [N]
  [List of failures]
================================================================================
```

---

## What to Capture

Create a text file with the complete console output and fill in these values:

### Critical Values

```
Q1 BALANCED + LEADERSHIP ALIGNED DIAGNOSTIC CAPTURE

STARTING STATE:
  consumer capability: ___
  enterprise capability: ___
  ai capability: ___

ALLOCATION:
  consumerGrowth: ___ M
  enterpriseSales: ___ M
  aiProduct: ___ M
  instructorPeople: ___ M
  universityCredential: ___ M
  cash: ___ M

EFFECTIVE INVESTMENTS:
  consumerGrowth: ___
  enterpriseSales: ___
  aiProduct: ___
  instructorPeople: ___
  universityCredential: ___

CONSEQUENCE DELTAS:
  consumer: ___
  enterprise: ___
  ai: ___
  talent: ___
  credential: ___
  execution: ___

ENDING STATE (AFTER CLAMP):
  consumer: ___
  enterprise: ___
  ai: ___

INVARIANT EVALUATION (consumer):
  Starting value: ___
  Consequence delta: ___
  Expected (start + delta): ___
  Actual ending value: 60.0
  Passed: [YES/NO]

STATE MUTATION:
  Was startingState mutated by engine? [YES/NO]
```

---

## Analysis Checklist

After capturing the trace, check these questions:

- [ ] **Starting consumer is 55?** If NO → Hypothesis E (different baseline)
- [ ] **Consequence delta is 5.0?** If NO → Hypothesis B (production contract incomplete)
- [ ] **After applyConsequence is 60?** If NO → Hypothesis A (state runner bug)
- [ ] **After clampState is 60?** If NO → Hypothesis C (clamping difference)
- [ ] **Invariant expected is 65?** If YES → Hypothesis B (delta must be 10 then)
- [ ] **Starting state was mutated by engine?** If YES → Hypothesis B + mutation

---

## Interpreting the Trace

### If Expected = 65, Got = 60:
The invariant is computing:
```
65 = startingValue + consequenceDelta
65 = startingValue + consequenceDelta
```

If actual starting is 55 and delta is 5, then expected should be 60, not 65.
**This means either:**
1. Starting value changed before invariant evaluation (mutation)
2. Consequence delta is 10, not 5 (engine issue)
3. Invariant is reading wrong values

### If Expected = 60, Got = 60:
✓ **PASS** — No issue! This would mean the "invariant failure" report was misread or the fix worked.

### If Expected != 65 and Got = 60:
**Pattern:** Trace the exact values and determine if Hypothesis A, B, C, or D applies.

---

## Comparison Against Production

After Q1 trace is captured, also run Q1 Balanced in production game:

1. Create a team
2. Go through Q1 gameplay normally (choose Balanced allocation)
3. Check ConsequenceScreen capability_consumer value
4. Record: Is it 60 or 65?

**If production shows 60:** Test Lab is correct
**If production shows 65:** Test Lab is missing a transformation

---

## Files Modified (Diagnostic Only)

**No logic changes. Only console.log added.**

- `src/testlab/utils/quarterRunner.ts` — Lines 43-92 (runSingleQuarter)
- `src/testlab/utils/invariantChecker.ts` — Lines 172 (checkEndingState parameter) + 212-249 (diagnostic logs)

**Safe to commit for Vercel if needed** — These logs only print for Q1, don't affect gameplay.

**To remove after diagnosis:**
```bash
# Will show exactly which lines to delete/revert
git diff src/testlab/utils/quarterRunner.ts
git diff src/testlab/utils/invariantChecker.ts
```

---

## Next Steps After Trace

1. **Post the complete console output** (use markdown code block)
2. **Fill in the diagnostic capture table** above
3. **Classify root cause** as A/B/C/D
4. **If B:** Engine returns delta=10, need to find where
5. **If A:** State application is buggy, need to find where
6. **If C:** Production uses different bounds, need to match
7. **If D:** Invariant logic is wrong, need to fix it

---

## Troubleshooting

### No console output appears
- Check browser console is open (F12)
- Make sure quarter === 1 check triggers (it should for Q1)
- Clear cache: `Ctrl+Shift+Delete` then refresh

### Test Lab won't run / crashes
- Verify build succeeded: `npm run build`
- Check browser console for errors
- Try Mode 2 (Full Strategy Test) first, not Mode 1

### Balanced strategy not in list
- Make sure you're in `/devlab` route
- Try dev environment first (production requires localStorage flag)

---

## Reference: Theoretical vs Observed

| Metric | Theory | Observed | Match? |
|--------|--------|----------|--------|
| Starting | 55 | ? | ? |
| Allocation | 5M | 5M | ✓ |
| Effective Invest | 5.0 | ? | ? |
| Gain | 5.0 | ? | ? |
| **Consequence Delta** | 5.0 | ? | ? |
| **Ending** | 60.0 | 60.0 | ✓ |
| **Invariant Expected** | 60.0 | 65.0 | ✗ |

The question mark is: **How did 65 get into the invariant expectation?**


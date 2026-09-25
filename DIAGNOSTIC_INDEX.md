# Q1 INVARIANT FAILURE DIAGNOSIS — COMPLETE DOCUMENTATION

**Issue:** Test Lab Q1 Balanced + Leadership Aligned run fails consumer capability consistency invariant  
**Expected:** 65.0  
**Observed:** 60.0  
**Discrepancy:** -5.0 (off by exactly one allocation cycle)

**Status:** Diagnostics implemented and ready to run. No logic changed.

---

## Documents in This Suite

### 1. DIAGNOSTIC_INDEX.md (THIS FILE)
Master overview and quick-start guide

### 2. DIAGNOSTIC_Q1_CONSUMER_INVARIANT.md
**Purpose:** Deep theoretical analysis of Q1 Balanced allocation  
**Contents:**
- Line-by-line Q1 calculation trace (theory)
- What SHOULD happen per code inspection
- Source code verification (no double-multipliers, all calculations correct)
- Hypothesis classification (Tier 1-4)
- Root cause candidate ranking
- Q1 trace requirements

**When to read:** After running diagnostics, to interpret results

### 3. DIAGNOSTIC_TESTLAB_VS_PRODUCTION.md
**Purpose:** Compare Test Lab and production game execution paths  
**Contents:**
- State representation differences
- Consequence application paths (both)
- Clamping bounds difference: [0, 120] vs [0, 100]
- Divergence scenarios where Test Lab ≠ Production
- Mutation detection logic
- Diagnostic checklist

**When to read:** If trace shows different bounds causing divergence

### 4. DIAGNOSTIC_INSTRUMENTATION_SUMMARY.md
**Purpose:** Technical documentation of what was added  
**Contents:**
- Exact files and lines modified
- Logging points and what they capture
- Instrumentation format
- Removal instructions
- Mutation detection mechanism
- Hypothesis classification per trace evidence

**When to read:** To understand what the logs mean

### 5. DIAGNOSTIC_RUN_GUIDE.md
**Purpose:** Step-by-step instructions to run and capture the trace  
**Contents:**
- Prerequisites
- Running via dev environment or Vercel
- Expected console output format
- What to capture (critical values)
- Analysis checklist
- Troubleshooting
- Comparison against production

**When to read:** Before running the test

---

## QUICK START

### Step 1: Understand the Problem (5 min)
Read: `DIAGNOSTIC_Q1_CONSUMER_INVARIANT.md`
- **Key insight:** Theory says 55 + 5 = 60, but invariant expects 65

### Step 2: Set Up Instrumentation (Done)
Status: ✓ Code is instrumented and builds successfully

### Step 3: Run the Test (10 min)
Follow: `DIAGNOSTIC_RUN_GUIDE.md`
1. `npm run build` (verify build)
2. `npm run dev`
3. Navigate to `/devlab`
4. Select Mode 2 (Full Strategy Test)
5. Choose "Balanced + Leadership Aligned"
6. Open DevTools Console (F12)
7. Run test
8. Copy full console output

### Step 4: Analyze Results (15 min)
Use: `DIAGNOSTIC_INSTRUMENTATION_SUMMARY.md` + `DIAGNOSTIC_Q1_CONSUMER_INVARIANT.md`

Fill in this table from console output:
```
Starting consumer:          ___
Consequence delta:          ___
Expected (start + delta):   ___
Actual ending:              60.0
StartingState mutated?:     ___
All capabilities match?:    ___
```

### Step 5: Classify Root Cause
Match evidence to hypothesis:

| If | Then | Root Cause |
|----|------|-----------|
| Starting=55, Delta=5, Expected=60, Got=60 | ✓ PASS | No bug (test is working) |
| Starting=55, Delta=10, Expected=65, Got=60 | Consequence delta is double | **B: Production Contract** |
| Starting=60, Delta=5, Expected=65, Got=60 | Starting state mutated | **E: Mutation** |
| Starting=55, Delta=5, Expected=60, Got=65 | Clamping or other transforms | **C: Production Divergence** |
| Starting=55, Delta=5, Expected≠60, Got=60 | Invariant formula wrong | **D: Invariant Bug** |
| Starting=55, Delta=5, Expected=60, Got≠60 | State application wrong | **A: Test Lab Bug** |

---

## Diagnostic Trace Output Map

```
┌─ INPUTS ──────────────────────────────────────────┐
│ Available Capital: 30M                             │
│ Allocation: 5M each (balanced)                     │
│ Role Votes: null (leadership-aligned)              │
│ Effective Investments: 5.0 each (no diminishing)   │
└────────────────────────────────────────────────────┘
                       ↓
┌─ STARTING STATE ──────────────────────────────────┐
│ consumer: 55 ← CHECK THIS VALUE                    │
│ enterprise: 30                                     │
│ ai: 10                                             │
│ ... (other capabilities)                           │
└────────────────────────────────────────────────────┘
                       ↓
    ENGINE: calculateQuarterConsequence(Q1)
                       ↓
        [MUTATION CHECK]
        Did startingState change?
        Report: true/false
                       ↓
┌─ CONSEQUENCE DELTAS ──────────────────────────────┐
│ consumer: ??? ← CHECK THIS VALUE                   │
│ enterprise: ???                                    │
│ ai: ???                                            │
│ ... (others)                                       │
└────────────────────────────────────────────────────┘
                       ↓
    TESTLAB: applyConsequence(state, consequence)
                       ↓
┌─ AFTER APPLY (UNCLAMPED) ─────────────────────────┐
│ consumer: starting + delta = ??? + ??? = ???       │
└────────────────────────────────────────────────────┘
                       ↓
    TESTLAB: clampState(state)  [clamps to 0-120]
                       ↓
┌─ AFTER CLAMP (CLAMPED) ───────────────────────────┐
│ consumer: 60.0 ← FINAL RESULT (OBSERVED)           │
└────────────────────────────────────────────────────┘
                       ↓
    INVARIANT: checkEndingState()
                       ↓
┌─ INVARIANT EVALUATION ────────────────────────────┐
│ Starting: startingState.consumer = ???             │
│ Delta: consequence.capabilityChanges.consumer = ??│
│ Expected: starting + delta = ???                   │
│ Actual: 60.0                                       │
│ Match: PASS if |expected - actual| < 0.1          │
│        FAIL otherwise → Expected 65, Got 60        │
└────────────────────────────────────────────────────┘
```

The question marks are what the trace will fill in.

---

## Critical Question

**Why does the invariant expect 65 when the theory predicts 60?**

The answer is in these values from the trace:
1. What is `startingState.capabilities.consumer` when invariant runs?
2. What is `consequence.capabilityChanges.consumer` value?

If both match theory (55 and 5), then:
```
Expected = 55 + 5 = 60 ✓
Actual = 60 ✓
PASS ← NO FAILURE
```

But invariant reports Expected = 65, so something differs:
- Either starting is 60 (not 55) → Mutation or different baseline
- Or delta is 10 (not 5) → Double gain somewhere
- Or invariant reads wrong values → Formula bug
- Or ending is 65 (not 60) → Clamping issue

**The trace answers which.**

---

## How to Interpret "Systemic vs Field-Specific"

Check the "ALL CAPABILITY DELTAS" section of logs:

**Systemic (all fields fail):**
```
consumer: starting=55, delta=5, expected=60, actual=60, match=PASS
enterprise: starting=30, delta=10, expected=40, actual=50, match=FAIL ← DIFFERENT ERROR
ai: starting=10, delta=3, expected=13, actual=23, match=FAIL ← DIFFERENT ERROR
...
```
→ All capabilities are off by different amounts
→ Suggests applyConsequence or clamping logic broken for all fields

**Field-Specific (only consumer fails):**
```
consumer: starting=55, delta=5, expected=60, actual=60, match=FAIL ← ONLY THIS FAILS
enterprise: starting=30, delta=1.2, expected=31.2, actual=31.2, match=PASS
ai: starting=10, delta=3, expected=13, actual=13, match=PASS
...
```
→ Only consumer is wrong
→ Suggests either:
  - Consumer calculation in engine is wrong
  - Consumer starting state is special (mutated, different)
  - Invariant only checks consumer incorrectly

---

## Expected Timeline

- **Document reading:** 5 min
- **Build/run setup:** 5 min  
- **Test execution:** 5 min (wait for console output)
- **Trace capture:** 5 min (copy-paste)
- **Analysis:** 15 min (fill table, classify)
- **Total:** ~35 minutes

---

## Files Modified

Only 2 files touched, both for logging only:

1. `src/testlab/utils/quarterRunner.ts`
   - Added: deepCopyState, formatCapabilities, formatAllocation
   - Added: console.log at 6 points in runSingleQuarter()
   - NO logic changes

2. `src/testlab/utils/invariantChecker.ts`
   - Added: optional `quarter` parameter to checkEndingState
   - Added: console.log inside checkEndingState (lines 216-249)
   - NO logic changes

**Zero changes to:**
- Engine calculation logic
- State application (applyConsequence)
- Clamping logic (clampState)
- Invariant rules
- Test presets
- Production game

---

## Hypothesis Reference

**A — Test Lab State-Runner Bug**
- Problem: applyConsequence or clampState applies changes incorrectly
- Evidence: ending state wrong despite correct deltas
- Fix location: src/testlab/utils/stateBuilder.ts

**B — Production Consequence Contract Incomplete**
- Problem: Engine returns delta=10 instead of delta=5 (hidden doubling)
- Evidence: consequence.capabilityChanges.consumer = 10
- Fix location: src/simulation/engine.ts

**C — Additional Production Transformation**
- Problem: Production game applies secondary capability boost
- Evidence: Test Lab shows 60, Production shows 65
- Fix location: src/components/quarters/ConsequenceScreen.tsx or GameContext

**D — Invariant Incorrectly Specified**
- Problem: Invariant uses wrong formula or reads wrong values
- Evidence: Invariant math doesn't match actual state values
- Fix location: src/testlab/utils/invariantChecker.ts

**E — Starting State Mutation**
- Problem: StartingState object changed before invariant evaluation
- Evidence: startingState.consumer = 60 (not 55) in invariant evaluation
- Fix location: Could be engine, quarterRunner, or invariant checker

---

## After Diagnosis

Once root cause is classified:

1. **Post trace output** and filled diagnostic table
2. **Indicate which hypothesis** (A/B/C/D/E)
3. **Cite exact file and line** from trace evidence
4. **Then fix** (following separate fix instructions, not included here)

---

## Questions?

Refer to specific documents:
- **"How do I run this?"** → DIAGNOSTIC_RUN_GUIDE.md
- **"What did you add?"** → DIAGNOSTIC_INSTRUMENTATION_SUMMARY.md
- **"What should the math be?"** → DIAGNOSTIC_Q1_CONSUMER_INVARIANT.md
- **"Why might Test Lab ≠ Production?"** → DIAGNOSTIC_TESTLAB_VS_PRODUCTION.md

---

**Ready to run?** → Start with DIAGNOSTIC_RUN_GUIDE.md


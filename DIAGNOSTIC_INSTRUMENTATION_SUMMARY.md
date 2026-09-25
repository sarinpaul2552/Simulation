# DIAGNOSTIC INSTRUMENTATION SUMMARY

**Status:** IMPLEMENTED, NO LOGIC CHANGES  
**Date:** 2026-09-25  
**Objective:** Capture exact values in Q1 Balanced + Leadership Aligned test run to diagnose invariant failure (Expected 65, Got 60)

---

## What Was Added

### 1. Test Lab Quarter Runner Instrumentation
**File:** `src/testlab/utils/quarterRunner.ts`

#### Functions Modified:
- `runSingleQuarter()` (lines 43-92)

#### What It Logs:
For Q1 only:
1. **Input Summary**
   - Available capital
   - Allocation weights and actual values
   - Role votes/behavior strategy
   - Effective investment calculations (with diminishing returns applied)

2. **State Before Engine Call**
   - Starting capabilities (consumer, enterprise, ai, talent, credential, customerSuccess, growth, execution)

3. **Mutation Detection**
   - Deep copy of starting state captured before engine call
   - After engine call, check if any capability fields changed
   - Report: `StartingState mutated by engine: [true/false]`

4. **Consequence Output**
   - Complete `capabilityChanges` object from engine
   - Shows delta for every capability field (including undefined ones)

5. **State After Transformations**
   - After `applyConsequence()` (unclamped)
   - After `clampState()` (clamped to [0, 120])
   - Full capabilities object at each step

6. **Summary Report**
   - All Q1 invariants passed: yes/no
   - Count and list of failed checks

#### Code Added:
```typescript
- deepCopyState(state) — Creates JSON deep copy for mutation detection
- formatCapabilities(caps, label) — Formats capabilities object for logging
- formatAllocation(alloc) — Formats allocation for logging
- Effective investment calculation inline (matches engine logic)
- Console.log statements at 6 key points in runSingleQuarter()
```

### 2. Invariant Checker Instrumentation
**File:** `src/testlab/utils/invariantChecker.ts`

#### Functions Modified:
- `checkEndingState()` (added optional `quarter` parameter)
- Modified `generateInvariantReport()` to pass quarter to checkEndingState

#### What It Logs:
For Q1 only:
1. **Detailed Consumer Invariant Evaluation**
   - `startingState.capabilities.consumer` value
   - `consequence.capabilityChanges.consumer` delta
   - Expected capability (start + delta)
   - Actual ending capability
   - Difference (expected - actual)
   - Pass/Fail status

2. **All Capability Deltas**
   - For each capability (consumer, enterprise, ai, talent, credential, customerSuccess, growth, execution):
     - Starting value
     - Consequence delta
     - Expected value (start + delta)
     - Actual ending value
     - Match status (within 0.1 tolerance)

#### Code Added:
```typescript
- checkEndingState() now accepts optional quarter parameter
- Diagnostic console.log block inside capability consumer check
- Diagnostic console.log block for all 8 capabilities
- Each logs: starting, delta, expected, actual, match (PASS/FAIL)
```

### 3. Diagnostic Data Structures
**File:** `src/testlab/utils/quarterRunner.ts`

#### Added:
```typescript
interface Q1DiagnosticTrace {
  availableCapital: number;
  allocation: Allocation;
  startingCapabilities: any;
  consequenceDelta: any;
  unclamped: any;
  clamped: any;
  invariantInputs: {
    startingValue: number;
    consequenceDelta: number;
    expectedValue: number;
    actualValue: number;
    passed: boolean;
  };
}

function extractQ1Trace(quarterResult: QuarterResult): Q1DiagnosticTrace
```

This allows programmatic access to the trace values if needed.

---

## What Was NOT Changed

✓ **Engine logic** — No changes to calculation functions  
✓ **State application** — `applyConsequence()` unchanged  
✓ **Clamping** — `clampState()` unchanged  
✓ **Invariant rules** — `checkEndingState()` logic unchanged  
✓ **Allocation strategies** — Test presets unchanged  
✓ **Behavior strategies** — Role vote logic unchanged  
✓ **Production game** — No changes to ConsequenceScreen or GameContext  

**Only console.log statements and optional logging parameters added.**

---

## Build Status

✓ **TypeScript:** Compiles without errors  
✓ **Build:** `npm run build` succeeds  
✓ **Chunks:** Built in 7.61s (warning: chunk size, pre-existing)

---

## Console Output Format

When Q1 Balanced test runs, console will show:

```
================================================================================
Q1 DIAGNOSTIC TRACE - Balanced + Leadership Aligned
================================================================================
[Input summary]
[Effective investments]
[Starting state]
[After engine call]
[Mutation check]
[Consequence deltas]
[After applyConsequence]
[After clampState]
[Invariant detailed evaluation]
[All capability deltas]
[Invariant checks summary]
================================================================================
SUMMARY
================================================================================
All Q1 invariants passed: [true/false]
Failed checks: [N]
[List of failures]
================================================================================
```

**Q2–Q8 will NOT log** (if quarter === 1 condition prevents it)

---

## How to Extract Trace

1. **Open browser DevTools:** F12
2. **Go to Console tab**
3. **Run Q1 Balanced in Test Lab**
4. **Console fills with diagnostic output**
5. **Copy entire output** (Ctrl+A in console, then copy)
6. **Paste into diagnostic report**

Alternatively:
- Right-click console → Save as file
- Export network logs if needed (less useful here)

---

## Root Cause Hypothesis Classification

The trace will help determine which hypothesis applies:

### Hypothesis A: Test Lab State Runner Bug
**Evidence to look for:**
- Starting = 55, Delta = 5, but Ending ≠ 60
- OR: After applyConsequence shows wrong value
- OR: applyConsequence doesn't add delta

**Trace points to check:**
- "AFTER applyConsequence (UNCLAMPED)" value
- "AFTER clampState (CLAMPED)" value
- Invariant ending value

### Hypothesis B: Production Consequence Contract Incomplete
**Evidence to look for:**
- Consequence delta = 10, not 5 (double the expected)
- Invariant expected = 65 matches starting (55) + delta (10)
- Production game ending state = 60 (clamped from 65)

**Trace points to check:**
- "CONSEQUENCE DELTAS: consumer" value
- "INVARIANT DETAILED EVALUATION" expected cap value

### Hypothesis C: Additional Production Transformation
**Evidence to look for:**
- Test Lab ending = 65 (unclamped)
- Test Lab clamped = 60 (clamped to 120)
- Production ConsequenceScreen clamps to 100 instead

**Trace points to check:**
- "AFTER applyConsequence (UNCLAMPED)" value
- "AFTER clampState (CLAMPED)" value

### Hypothesis D: Invariant Incorrectly Specified
**Evidence to look for:**
- Invariant uses wrong starting value
- Invariant formula is incorrect
- Clamping applied inside invariant check

**Trace points to check:**
- "INVARIANT DETAILED EVALUATION: startingState.capabilities.consumer"
- "ALL CAPABILITY DELTAS" table for consumer row

### Hypothesis E: Starting State Mutation
**Evidence to look for:**
- Starting value changes from 55 → 60 (or other value)
- This happens AFTER starting state snapshot taken
- Engine or another system mutates original startingState object

**Trace points to check:**
- "STARTING STATE (before engine call): consumer" value
- "AFTER ENGINE CALL: consumer" value
- "StartingState mutated by engine: true"

---

## Mutation Detection Mechanism

```typescript
// Before engine call
const startingStateSnapshot = deepCopyState(startingState);

// Call engine
calculateQuarterConsequence(...)

// After engine call
if (startingState.capabilities.consumer !== startingStateSnapshot.capabilities.consumer) {
  console.log('StartingState mutated by engine: true');
}
```

This detects if engine inadvertently changes the input object.

---

## Next Actions

1. **Run Q1 Balanced test** with this instrumentation
2. **Capture console output** in full
3. **Fill diagnostic table** from values in output
4. **Classify root cause** (A/B/C/D/E)
5. **Report exact file/line** responsible
6. **Do NOT fix yet** — diagnose only

---

## Removal Instructions

After diagnosis, to remove all instrumentation:

```bash
# See what was added
git diff src/testlab/utils/quarterRunner.ts
git diff src/testlab/utils/invariantChecker.ts

# Revert files
git checkout src/testlab/utils/quarterRunner.ts
git checkout src/testlab/utils/invariantChecker.ts

# Or manually: delete all console.log blocks and optional quarter parameter
```

Only 2 files modified:
1. `src/testlab/utils/quarterRunner.ts` — ~50 lines of logging
2. `src/testlab/utils/invariantChecker.ts` — ~30 lines of logging + 1 parameter

---

## Compliance

✓ **No business logic changed**  
✓ **No state mutations introduced**  
✓ **No calculations modified**  
✓ **No game mechanics altered**  
✓ **Q2–Q8 unaffected** (logging gated on quarter === 1)  
✓ **Production game unmodified**  
✓ **Safe for Vercel deployment** if needed  

Instrumentation is purely observational and read-only.


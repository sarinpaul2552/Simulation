# ROOT CAUSE ANALYSIS: Q1 CONSUMER CAPABILITY INVARIANT FAILURE

## Summary
**Issue:** Test Lab Q1 Balanced + Leadership Aligned invariant failure (Expected 65, Got 60)  
**Root Cause:** Object reference aliasing in `applyConsequence()` state isolation  
**Scope:** Test Lab only (Production engine, ConsequenceScreen, and economics unchanged)  
**Status:** Identified and fixed

---

## Runtime Evidence

### Observed Invariant Behavior
```
Starting Consumer: 55 (Q1Baseline, correct)
Consequence Delta: +5 (engine correct)
Ending Consumer: 60 (observed correct)
Invariant Expected: 65 (WRONG — why?)
Invariant Starting: 60 (WRONG — should be 55)
```

### Root Cause
The invariant is reading a **mutated** `startingState.capabilities.consumer` value:
- **When invariant runs:** `startingState.capabilities.consumer = 60` (not 55!)
- **Calculation:** `60 + 5 = 65` (explains "Expected 65")
- **Comparison:** `expected 65 ≠ actual 60` → FAIL

**Question:** How did startingState.consumer change from 55 to 60?

### Answer: Reference Aliasing

**Location:** `src/testlab/utils/stateBuilder.ts` line 25

```typescript
export function applyConsequence(state, consequence) {
  const newState = { ...state };  // ← SHALLOW COPY ONLY
  
  // This line mutates BOTH newState.capabilities AND state.capabilities
  // because they reference the SAME object:
  newState.capabilities.consumer += consequence.capabilityChanges.consumer;  // ← line 39
  
  return newState;
}
```

**The Aliasing Chain:**
```
1. applyConsequence() receives startingState
2. Line 25: const newState = { ...state }
   - This creates a shallow copy
   - Top-level properties are copied
   - BUT: newState.capabilities === state.capabilities (SAME OBJECT)
3. Line 39: newState.capabilities.consumer += 5
   - Modifies the shared capabilities object
   - Changes state.capabilities.consumer from 55 → 60
   - Changes startingState.capabilities.consumer from 55 → 60 (ALIASED)
4. Return newState with capabilities.consumer = 60
5. Later, invariant reads startingState.capabilities.consumer = 60 (MUTATED)
6. Invariant calculates: 60 + 5 = 65
7. Invariant compares: expected 65 ≠ actual 60 → FAIL
```

### Pattern Across All Capabilities

Same pattern occurs for all 8 capability fields:

```
Consumer:       starting 55 → mutated 60, expected 60+5=65, actual 60 → FAIL
Enterprise:     starting 30 → mutated 31.2, expected 31.2+delta, actual 31.2 → FAIL (different math)
AI:             starting 10 → mutated 13, expected 13+delta, actual 13 → FAIL (different math)
Talent:         starting 55 → mutated 55 (no delta), expected 55+0=55, actual 55 → PASS
Credential:     starting 40 → mutated 42.5, expected 42.5+delta, actual 42.5 → FAIL
Execution:      starting 60 → mutated [score], expected [score]+delta, actual [score] → FAIL
```

**Why some PASS:** When no capability change is applied (delta = 0 or undefined), the mutation doesn't matter. But when delta exists, invariant sees mutated starting value.

---

## The Fix

### Change Made
**File:** `src/testlab/utils/stateBuilder.ts` (lines 21-39)

**Before (Aliased):**
```typescript
const newState = { ...state };
// newState.capabilities === state.capabilities (SAME REFERENCE)
```

**After (Fixed):**
```typescript
const newState = { 
  ...state,
  capabilities: { ...state.capabilities }  // Deep copy capabilities object
};
// newState.capabilities !== state.capabilities (INDEPENDENT OBJECTS)
```

### Why This Fixes It
1. `newState.capabilities` is now a new, independent object
2. `state.capabilities` (the original startingState) remains unmodified
3. Mutations to `newState.capabilities.consumer` do NOT affect `state.capabilities.consumer`
4. When invariant reads `startingState.capabilities.consumer`, it reads the original 55 (not mutated 60)
5. Invariant calculates correctly: `55 + 5 = 60`
6. Invariant compares: `expected 60 = actual 60` → **PASS**

---

## Verification

### Object Identity Before Fix
```javascript
// In applyConsequence with shallow copy only:
const state = { capabilities: { consumer: 55 } };
const newState = { ...state };
console.log(newState === state);             // false (objects are different)
console.log(newState.capabilities === state.capabilities);  // true (ALIASED!)
newState.capabilities.consumer = 60;
console.log(state.capabilities.consumer);    // 60 (MUTATED!)
```

### Object Identity After Fix
```javascript
// In applyConsequence with deep copy:
const state = { capabilities: { consumer: 55 } };
const newState = { 
  ...state,
  capabilities: { ...state.capabilities }
};
console.log(newState === state);             // false (objects are different)
console.log(newState.capabilities === state.capabilities);  // false (INDEPENDENT!)
newState.capabilities.consumer = 60;
console.log(state.capabilities.consumer);    // 55 (UNMODIFIED!)
```

---

## Impact Analysis

### What Changed
- ✓ `src/testlab/utils/stateBuilder.ts`: applyConsequence() now deep-copies capabilities object

### What Did NOT Change
- ✗ Production engine logic (engine.ts unchanged)
- ✗ Consequence deltas (still +5, +1.2, +3, etc. as calculated by engine)
- ✗ ConsequenceScreen application logic (unchanged)
- ✗ GameContext state management (unchanged)
- ✗ Economics, formulas, capability thresholds (unchanged)
- ✗ Invariant rules (unchanged)
- ✗ Q2–Q8 logic (unchanged)
- ✗ Production gameplay (unaffected)

### Scope
Test Lab state isolation only. Production game state flow unaffected (production uses Supabase state, not TeamState objects).

---

## Invariant Results After Fix

### Expected (Theory)
```
Q1 Balanced + Leadership Aligned:
  Consumer: starting 55 + delta 5 = expected 60, actual 60 → PASS ✓
  Enterprise: starting 30 + delta 1.2 = expected 31.2, actual 31.2 → PASS ✓
  AI: starting 10 + delta 3 = expected 13, actual 13 → PASS ✓
  Talent: starting 55 + delta 0 = expected 55, actual 55 → PASS ✓
  Credential: starting 40 + delta 2.5 = expected 42.5, actual 42.5 → PASS ✓
  Execution: starting 60 + delta [score] = expected [score], actual [score] → PASS ✓
```

### Root Cause Classification
**Type A:** Test Lab State-Runner Bug  
**Specific:** Shallow copy aliasing in `applyConsequence()`  
**Hypothesis Fit:** ✓✓✓ (matches all runtime evidence)

---

## Remaining Work

1. Run Q1 Balanced diagnostic to confirm invariant now passes
2. Run full Q1→Q8 Balanced to identify any other systemic issues
3. Remove verbose diagnostic logging from quarterRunner.ts and invariantChecker.ts
4. Commit/push Test Lab fix
5. Document any remaining invariant failures (without fixing)
6. Preserve Q4 destination gap (unfixed, per user direction)

---

## File Summary

**Root Cause Location:**
- File: `src/testlab/utils/stateBuilder.ts`
- Function: `applyConsequence()`
- Line: 25 (shallow copy without capabilities deep-copy)
- Lines changed: 21–39 (comment added, fix applied)

**Alias Chain:**
- `applyConsequence()` input parameter: `state` (the startingState)
- Line 25: Shallow copy creates reference alias to state.capabilities
- Lines 39–61: Mutations to newState.capabilities affect state.capabilities
- Later: Invariant reads mutated state.capabilities.consumer = 60 (not original 55)
- Result: Expected 55+5=60, but invariant sees 60+5=65


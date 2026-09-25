# Q1 CONSUMER CAPABILITY INVARIANT FAILURE ANALYSIS
## Balanced + Leadership Aligned → Expected 65.0, Got 60.0

**Status:** DIAGNOSED, NOT FIXED (per user direction)  
**Failure:** `state_consumer_cap_consistent` invariant  
**Quarters Affected:** Q1 (primary), Q2+Q3 (propagating)  

---

## INVARIANT LOGIC

File: `src/testlab/utils/invariantChecker.ts` (lines 162-173)

```typescript
const expectedCap = startingState.capabilities.consumer + consequence.capabilityChanges.consumer;
checks.push({
  id: 'state_consumer_cap_consistent',
  message: 'Consumer capability after consequence matches starting + delta',
  passed: Math.abs(endingState.capabilities.consumer - expectedCap) < 0.1,
  details: `Expected: ${expectedCap.toFixed(1)}, Got: ${endingState.capabilities.consumer.toFixed(1)}`,
});
```

**If invariant reports "Expected: 65.0, Got: 60.0", then:**
- `expectedCap = 65.0`
- `endingState.capabilities.consumer = 60.0`
- Therefore: `55 + consequence.capabilityChanges.consumer = 65.0`
- **Implies delta returned by engine: 10.0 (not 5.0)**

---

## THEORETICAL Q1 TRACE (Balanced Allocation)

### 1. Starting State
**File:** `src/simulation/engine.ts` line 159 (`getQ1Baseline()`)
```
consumer: 55
```

### 2. Balanced Allocation Weights
**File:** `src/testlab/utils/testPresets.ts` line 95
```
consumerGrowth: 1/6 ≈ 0.16667
```

### 3. Available Capital
**File:** `src/content/gameplay.json`
```
Q1: available_capital = 30
```

### 4. Calculated Allocation
**File:** `src/testlab/utils/testPresets.ts` (weightsToAllocation, line 370)
```
consumerGrowth = (1/6) * 30 = 5.0M
```

### 5. Effective Investment Calculation
**File:** `src/simulation/engine.ts` line 88 (calculateEffectiveInvestment)
```
if (amountSpent <= 5) return amountSpent * 1.0;
effectiveInvestment = 5.0 * 1.0 = 5.0
```

### 6. Capability Gain
**File:** `src/simulation/engine.ts` line 109 (createCapabilityFromInvestment)
```
gainPerDollar['consumerGrowth'] = 1.0
gain = 5.0 * 1.0 = 5.0
```

### 7. New Capability (In Engine)
**File:** `src/simulation/engine.ts` line 113
```
newCapability = Math.min(100, currentCapability + gain)
              = Math.min(100, 55 + 5.0)
              = 60.0
```

### 8. Capability Delta (Calculated in Engine)
**File:** `src/simulation/engine.ts` line 311 (Q1 consequence return)
```
consumer: newCapabilities.consumer - currentState.capabilities.consumer
        = 60.0 - 55
        = 5.0  ← EXPECTED DELTA
```

### 9. Test Lab Application
**File:** `src/testlab/utils/stateBuilder.ts` line 39 (applyConsequence)
```
newState.capabilities.consumer += consequence.capabilityChanges.consumer
                               = 55 + 5.0
                               = 60.0
```

### 10. Test Lab Clamping
**File:** `src/testlab/utils/stateBuilder.ts` line 106 (clampState)
```
consumer: Math.max(0, Math.min(120, 60.0))
        = 60.0  ← NO CHANGE
```

### 11. Final Ending State
```
endingState.capabilities.consumer = 60.0  ← ACTUAL RESULT
```

---

## DISCREPANCY SUMMARY

| Phase | Value | Expected | Match? |
|-------|-------|----------|--------|
| Starting (Q1Baseline) | 55 | 55 | ✓ |
| Allocation (Balanced) | 5.0M | 5.0M | ✓ |
| Effective Investment | 5.0 | 5.0 | ✓ |
| Capability Gain | 5.0 | 5.0 | ✓ |
| New Capability (Engine) | 60.0 | 60.0 | ✓ |
| **Consequence Delta** | 5.0 (or 10.0?) | ? | **✗ DISCREPANCY** |
| **Ending State** | 60.0 | 65.0 | **✗ MISMATCH** |

---

## ROOT CAUSE CLASSIFICATION

### Hypothesis A: Test Lab State-Runner Bug
**Evidence for:** Ending state is 60 (correct per theory), but invariant expects 65  
**Evidence against:** applyConsequence logic looks correct  
**Status:** POSSIBLE

### Hypothesis B: Production Consequence Contract Incomplete
**Evidence for:** Engine might return delta=10, not delta=5  
**Evidence against:** Q1 consequence calculation clearly returns delta=5 per trace  
**Status:** REQUIRES ENGINE VERIFICATION

### Hypothesis C: Additional Production Transformation
**Evidence for:** Production GameContext might apply secondary transformation  
**Location to check:** `src/components/quarters/ConsequenceScreen.tsx` (line 95-106)  
**Current code:** Clamps capabilities to [0, 100], not [0, 120]  
**But:** 60 is within both bounds, so no effect in Q1  
**Status:** POSSIBLE BUT UNLIKELY FOR Q1

### Hypothesis D: Invariant Incorrectly Specified
**Evidence for:** Invariant assumes additive application, but maybe game uses replacement?  
**Evidence against:** stateBuilder.applyConsequence is clearly additive (+=)  
**Status:** UNLIKELY

---

## CRITICAL OBSERVATIONS

### 1. Capability Bounds Mismatch
- **Production Game:** Clamps to [0, 100] (ConsequenceScreen.tsx line 96)
- **Test Lab:** Clamps to [0, 120] (stateBuilder.ts line 106)
- **Impact on Q1:** None (60 ≤ 100)
- **Impact on Q2+:** Possibly (if Q2 gains push above 100)

### 2. Missing "growth" Capability Modification
- Capabilities type includes `growth` (engine.ts line 44)
- Q1 baseline has `growth: 55` (engine.ts line 169)
- Q1Consequence does NOT modify `growth` in newCapabilities
- Q1 capabilityChanges does NOT include `growth` field (line 310-318)
- **Test Lab stateBuilder** tries to apply `consequence.capabilityChanges.growth` (line 56-58)
- **If consequence doesn't include growth:** Test Lab correctly skips it
- **But:** This is source of confusion; need clarification on growth capability contract

### 3. ConsequenceScreen Post-Application Clamping
**File:** `src/components/quarters/ConsequenceScreen.tsx` line 95-106

Production game clamps AFTER applying delta:
```typescript
capability_consumer: Math.max(0, Math.min(100, 
  game.currentTeam.capability_consumer + (game.lastConsequence.capabilityChanges.consumer || 0)
))
```

Test Lab clamps in separate step after applying:
```typescript
// stateBuilder.ts line 39: applyConsequence
newState.capabilities.consumer += consequence.capabilityChanges.consumer;

// stateBuilder.ts line 106: clampState
consumer: Math.max(0, Math.min(120, state.capabilities.consumer)),
```

**Difference:** Bound is [0, 100] vs [0, 120]  
**Impact Q1:** None (result 60 fits both)  
**Impact Q2+:** Need to check if consequences push capabilities above 100

---

## EXACT FILES AND LINE NUMBERS REQUIRING INVESTIGATION

### Test Lab Quarter Runner
- **File:** `src/testlab/utils/quarterRunner.ts`
- **Line 51-64:** `runSingleQuarter()` calls engine, applies consequence
- **Line 67-70:** Applies consequence, then clamps
- **Action needed:** Log intermediate values for Q1 Balanced:
  - Before applyConsequence: startingState.capabilities.consumer
  - consequence.capabilityChanges.consumer value
  - After applyConsequence (before clamp)
  - After clampState

### Test Lab State Builder
- **File:** `src/testlab/utils/stateBuilder.ts`
- **Lines 21-77:** `applyConsequence()` function
- **Lines 37-62:** Capability application logic
- **Lines 100-116:** `clampState()` function - bounds [0, 120] vs production [0, 100]
- **Action needed:** Verify applyConsequence correctly adds deltas (it appears to)

### Production Engine Q1
- **File:** `src/simulation/engine.ts`
- **Lines 185-192:** `createCapabilityFromInvestment()` for consumer
- **Lines 186-192:** Create new consumer capability
- **Lines 310-318:** Calculate capabilityChanges delta
- **Lines 323-333:** Return consequence
- **Action needed:** Verify delta calculation (should be 5, not 10)

### Production Game Consequence Application
- **File:** `src/components/quarters/ConsequenceScreen.tsx`
- **Lines 95-106:** Post-consequence state update
- **Action needed:** Compare with Test Lab to identify clamping difference

---

## PROPAGATION TO Q2+Q3

**Why does error persist?**

If Q1 ending is 60 but invariant expected 65:
- Test Lab records endingState.capabilities.consumer = 60
- Q2 starting state uses this as new current capability
- Q2 consequence calculated based on starting=60
- If Q2 also adds ~5, we get ~65
- But invariant for Q2 would expect starting=65 + delta
- **Result:** Off-by-5 error propagates each quarter

---

## NEXT DIAGNOSTIC STEPS (WITHOUT FIXING)

1. **Capture Full Q1 Run Output**
   - Log all values in quarterRunner line 43-92
   - Print: startingState, allocation, consequence object, endingState
   
2. **Verify Engine Delta**
   - Check if consequence.capabilityChanges.consumer is 5.0 or 10.0
   
3. **Check Production vs Test Lab Execution**
   - Run Balanced allocation in production game
   - Compare ConsequenceScreen capability_consumer calc vs Test Lab endingState
   
4. **Bounds Analysis**
   - List all quarters where ending capabilities exceed 100
   - Identify if Test Lab's [0, 120] clamp masks production [0, 100] clamping

---

## HYPOTHESIS RANKING (by likelihood)

1. **TIER 1 (Most Likely):** Production engine returns delta=10, not 5
   - Requires: Engine code inspection for hidden double-application or undocumented enhancement
   
2. **TIER 2:** Clamping difference [0, 100] vs [0, 120] affects Q2+, not Q1
   - But doesn't explain Q1 discrepancy
   
3. **TIER 3:** Test Lab starting state is not Q1Baseline (55) but different value
   - Requires: Verify getQ1Baseline used by quarterRunner
   
4. **TIER 4:** Additional transformation in production ConsequenceScreen not replicated
   - Requires: Diff ConsequenceScreen vs applyConsequence logic

---

## VERIFICATION AGAINST SOURCE CODE

### Q1 Consequence Flow - Line-by-Line Verification

**File:** `src/simulation/engine.ts`

1. **Line 187-192:** Consumer capability creation
   ```typescript
   if (allocation.consumerGrowth > 0) {
     newCapabilities.consumer = createCapabilityFromInvestment(
       'consumerGrowth',
       effectiveAllocations.consumerGrowth,
       currentState.capabilities.consumer
     );
   }
   ```
   - If `allocation.consumerGrowth = 5.0` and `currentState.capabilities.consumer = 55`
   - Then `createCapabilityFromInvestment('consumerGrowth', 5.0, 55)` is called

2. **Line 109-113:** Capability gain calculation
   ```typescript
   const gain = effectiveInvestment * (gainPerDollar[category] || 0);
   // gain = 5.0 * 1.0 = 5.0
   const newCapability = Math.min(100, currentCapability + gain);
   // newCapability = Math.min(100, 55 + 5.0) = 60.0
   return newCapability;
   ```

3. **Line 311:** Delta calculation
   ```typescript
   consumer: newCapabilities.consumer - currentState.capabilities.consumer,
   // consumer: 60.0 - 55 = 5.0
   ```

**Conclusion:** Engine code, as written, MUST return delta = 5.0, NOT 10.0

### Possible Scenarios for 10.0 Delta

**Scenario A: Doubled Effective Investment**
- Would require: `calculateEffectiveInvestment(5.0)` returns 10.0
- Actual: `calculateEffectiveInvestment(5.0)` = 5.0 * 1.0 = 5.0 (line 88)
- **Status:** NOT HAPPENING

**Scenario B: Doubled Gain Per Dollar**
- Would require: `gainPerDollar['consumerGrowth']` = 2.0
- Actual: `gainPerDollar['consumerGrowth']` = 1.0 (line 100)
- **Status:** NOT HAPPENING

**Scenario C: Doubled Allocation**
- Would require: `allocation.consumerGrowth` = 10.0M
- Actual: `(1/6) * 30 = 5.0M` (testPresets.ts line 100-103)
- Verification: Balanced weights sum to 1.0 ✓
- **Status:** NOT HAPPENING

**Scenario D: Additional Capability Boost**
- Would require: Second pass or additional transformation on consumer
- Search result: Only ONE assignment to `newCapabilities.consumer` (line 187)
- Additional modifications: None found in Q1Consequence
- **Status:** UNLIKELY

**Scenario E: Starting State is 60, Not 55**
- Would require: `Q1Baseline.capabilities.consumer` ≠ 55
- Actual: Line 169 explicitly sets `consumer: 55`
- **Status:** IMPOSSIBLE (unless baseline modified elsewhere)

---

## CRITICAL DEBUGGING REQUIREMENT

To determine root cause, MUST answer these questions:

### Question 1: What is consequence.capabilityChanges.consumer value?
```typescript
// In quarterRunner.ts after line 51-64, add:
console.log('Q1 Consequence Delta:', JSON.stringify({
  consumer: consequence.capabilityChanges.consumer,
  enterprise: consequence.capabilityChanges.enterprise,
  ai: consequence.capabilityChanges.ai,
  all: consequence.capabilityChanges
}));
```

### Question 2: What is starting state value?
```typescript
// In quarterRunner.ts before line 51, add:
console.log('Q1 Starting State:', JSON.stringify({
  consumer: startingState.capabilities.consumer,
  enterprise: startingState.capabilities.enterprise,
  ai: startingState.capabilities.ai,
  all: startingState.capabilities
}));
```

### Question 3: What is ending state after applyConsequence (before clamp)?
```typescript
// In quarterRunner.ts after line 67, add:
const unclamped = endingState; // capture before clampState
console.log('Q1 After ApplyConsequence (Unclamped):', JSON.stringify({
  consumer: unclamped.capabilities.consumer,
}));
```

### Question 4: What is ending state after clampState?
```typescript
// In quarterRunner.ts after line 70, add:
console.log('Q1 After ClampState:', JSON.stringify({
  consumer: clampedEndingState.capabilities.consumer,
}));
```

**Expected vs Observed:**
```
Expected:
- Starting: 55
- Delta: 5.0
- After Apply: 60
- After Clamp: 60

If Observed Differs:
- Starting: ___
- Delta: ___
- After Apply: ___
- After Clamp: 60
```

---

## CLASSIFICATION FOR ROOT CAUSE DECISION

**Awaiting:**
- Engine delta value printout (consequence.capabilityChanges.consumer)
- Confirmation that Q1Baseline.consumer === 55 in test run
- Unclamped ending state value (before clampState)
- Comparison of production vs Test Lab ending state for Q1
- Full invariant report with all Q1-Q8 deltas visible


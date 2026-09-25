# TEST LAB vs PRODUCTION CONSEQUENCE APPLICATION

## Critical Difference: Clamping Bounds

### Test Lab Application Path
**File:** `src/testlab/utils/stateBuilder.ts` (lines 21-77)

```typescript
// Step 1: Apply consequence (additive)
newState.capabilities.consumer += consequence.capabilityChanges.consumer;

// Step 2: Clamp to [0, 120]
consumer: Math.max(0, Math.min(120, state.capabilities.consumer))
```

**Q1 Balanced Example:**
```
Starting: 55
Delta: +5 (from consequence)
After Add: 60
After Clamp [0, 120]: 60 ✓ (no change, within bounds)
```

---

### Production Game Application Path
**File:** `src/components/quarters/ConsequenceScreen.tsx` (lines 95-106)

```typescript
// Apply consequence + clamp to [0, 100] in single step
capability_consumer: Math.max(0, Math.min(100, 
  game.currentTeam.capability_consumer + (game.lastConsequence.capabilityChanges.consumer || 0)
))
```

**Q1 Balanced Example:**
```
Starting: 55
Delta: +5 (from consequence)
After Add: 60
After Clamp [0, 100]: 60 ✓ (no change, within bounds)
```

---

## Where They Diverge: Q2+Q3 at High Values

### Scenario: Capabilities approach 100+

**Test Lab (clamps to 120):**
```
Q2 Starting: 60
Q2 Delta: +15 (hypothetical)
After Add: 75
After Clamp [0, 120]: 75
```

**Production (clamps to 100):**
```
Q2 Starting: 60
Q2 Delta: +15 (hypothetical)
After Add: 75
After Clamp [0, 100]: 75
```

Both match so far.

**Scenario: Starting approaches 100**

**Test Lab (clamps to 120):**
```
Q3 Starting: 95
Q3 Delta: +10 (hypothetical)
After Add: 105
After Clamp [0, 120]: 105 ✓ (Test Lab allows this)
```

**Production (clamps to 100):**
```
Q3 Starting: 95
Q3 Delta: +10 (hypothetical)
After Add: 105
After Clamp [0, 100]: 100 ✓ (Production caps at 100)
```

**DIVERGENCE:** Test Lab shows 105, Production shows 100

---

## Q1 Balanced Trace Impact

For Q1 Balanced run where invariant expects 65 but gets 60:

### Hypothesis: Starting State Mutation

If `startingState.capabilities.consumer` changes from 55 → 60 between:
1. Allocation calculation (which assumes 55)
2. Consequence delta evaluation

Then:
```
If starting gets mutated to 60:
  consequence.capabilityChanges.consumer = 5 (correct math)
  expectedCap = 60 + 5 = 65 ✓ (matches invariant expectation)
  but endingState.capabilities.consumer = 60 (applied once)
  RESULT: Expected 65, Got 60 ✓✓✓ (MATCHES OBSERVED FAILURE)
```

**This would be Hypothesis B: Starting State Different**

---

## Diagnostic Checklist

- [ ] Q1 starting value BEFORE engine call: ___
- [ ] Q1 starting value AFTER engine call: ___ (check for mutation)
- [ ] consequence.capabilityChanges.consumer: ___
- [ ] endingState.capabilities.consumer (unclamped): ___
- [ ] endingState.capabilities.consumer (clamped [0, 120]): ___
- [ ] Invariant: expected ___, got ___
- [ ] All other capability fields match expected? yes / no / partial

---

## Root Cause Classification Based on Trace

| Evidence | Hypothesis | Likelihood |
|----------|-----------|-----------|
| startingState mutated 55→60 before invariant | B: Starting State Different | HIGH if true |
| consequence.capabilityChanges.consumer = 10, not 5 | B: Production Contract Incomplete | MEDIUM |
| startingState is 55 and delta is 5, but ending is 60 and expected is 65 | A: Test Lab State Runner Bug | MEDIUM |
| ending state is 65, not 60 | A: Test Lab State Runner Bug | LOW |
| invariant logic is broken | D: Invariant Incorrectly Specified | LOW |

---

## Console Log Locations

With instrumentation enabled, these logs will appear when running Q1 Balanced in Test Lab:

1. `Q1 DIAGNOSTIC TRACE` header
2. Available capital and allocation breakdown
3. Starting state capabilities BEFORE engine
4. Mutation check after engine
5. Consequence deltas (complete capabilityChanges object)
6. State after applyConsequence (unclamped)
7. State after clampState (clamped)
8. Invariant evaluation (all capabilities)
9. Detailed invariant inputs for consumer

---

## Production vs Test Lab: Complete Comparison

### State Representation

| Aspect | Production | Test Lab |
|--------|-----------|----------|
| Stored as | Supabase team table | TypeScript TeamState object |
| Capability fields | 8 fields (capability_consumer, etc.) | Nested object (capabilities.consumer, etc.) |
| Update mechanism | RPC supabase.rpc() + local GameContext | Direct object mutation |

### Consequence Application

| Aspect | Production | Test Lab |
|--------|-----------|----------|
| File | ConsequenceScreen.tsx | stateBuilder.ts |
| Clamping | `Math.min(100, ...)` | `Math.min(120, ...)` |
| Fields | Explicit for each capability | Conditional loop |
| Mutation | RPC call + local state update | applyConsequence() function |

### Q1 Balanced

| Metric | Production | Test Lab |
|--------|-----------|----------|
| Starting consumer | 55 | 55 (from getQ1Baseline) |
| Allocation | (1/6) × 30 = 5M | (1/6) × 30 = 5M |
| Effective invest | calculateEffectiveInvestment(5) = 5 | calculateEffectiveInvestment(5) = 5 |
| Gain | 5 × 1.0 = 5 | 5 × 1.0 = 5 |
| New capability | 55 + 5 = 60 | 55 + 5 = 60 |
| **Expected ending** | 60 | 60 |
| **Invariant expects** | ? | 65 (if delta = 10) |

---

## Next Step

Run Q1 Balanced with diagnostic instrumentation enabled. Capture console output and analyze:

```
Q1 TRACE OUTPUT:
  Available Capital: 30
  Allocation: {consumer: 5.00, enterprise: 5.00, ai: 5.00, people: 5.00, cred: 5.00, cash: 5.00}
  
  STARTING STATE (before engine call):
  capabilities: {consumer: ???, enterprise: ???, ...}
  
  AFTER ENGINE CALL:
  capabilities: {consumer: ???, enterprise: ???, ...}
  StartingState mutated by engine: ???
  
  CONSEQUENCE DELTAS:
  capabilityChanges: {consumer: ???, enterprise: ???, ...}
  
  AFTER applyConsequence (UNCLAMPED):
  capabilities: {consumer: ???, ...}
  
  AFTER clampState (CLAMPED):
  capabilities: {consumer: ???, ...}
  
  INVARIANT DETAILED EVALUATION (consumer):
    startingState.capabilities.consumer: ???
    consequence.capabilityChanges.consumer: ???
    expectedCap (starting + delta): ???
    endingState.capabilities.consumer: ???
    Difference (expected - actual): ???
    PASS/FAIL: ???
  
  ALL CAPABILITY DELTAS:
    consumer: starting=???, delta=???, expected=???, actual=???, match=???
    enterprise: starting=???, delta=???, expected=???, actual=???, match=???
    ...
```


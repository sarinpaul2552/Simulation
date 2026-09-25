# PHASE 1D — CASH STATE RECONCILIATION TRACE

**Status:** Code analysis underway. Tracing all cashChange assignments Q1-Q8.

---

## CRITICAL FINDING: Diagnostic Ledger Semantic Mismatch

### The Problem

The diagnostic ledger added in Phase 1C captures:
```typescript
__diagnostic__cashLedger: {
  operatingProfit: newOperatingProfit,  // ABSOLUTE value, NOT delta
  closingCash: newCash,                // includes floor applied
  // ... other fields
}
```

But the **engine.ts cashChange** is calculated as:
```typescript
const cashChange = newOperatingProfit - startingState.operatingProfit;  // DELTA
```

### The Reconciliation Failure

User's reported Cash 100% Q2:
```
Opening 94 + Reported Operating Profit 31.119 − Spend 0 = 125.119
Actual Closing: 91.119
Unexplained: −34.0
```

The diagnostic shows `operatingProfit = 31.119` (absolute new value), but the cash reconciliation formula assumes:
```
Opening + OperatingProfit − Spend = Closing
```

This is incorrect because `cashChange = newOperatingProfit - startingState.operatingProfit`, not just `newOperatingProfit`.

---

## QUARTERLY CASHCHANGE ASSIGNMENTS (Code Trace)

### Q1: calculateQ1Consequence (Lines 154-377)

**Return Statement (Line 357):**
```typescript
cashChange: q1ClosingCash - currentState.cash,
```

**Calculation Chain:**
```typescript
// Line 284:
const q1ClosingCash = currentState.cash + q1OpProfit - strategicSpend;

// Line 357:
cashChange: q1ClosingCash - currentState.cash
          = (currentState.cash + q1OpProfit - strategicSpend) - currentState.cash
          = q1OpProfit - strategicSpend
```

**Semantic:** `cashChange` is a DELTA (absolute change in cash).

**Diagnostic Captures (Lines 365-373):**
```typescript
__diagnostic__cashLedger: {
  openingCash: currentState.cash,
  operatingProfit: q1OpProfit,          // DELTA from baseline? Or ABSOLUTE?
  strategicSpend: strategicSpend,       // ABSOLUTE from allocation
  closingCash: q1ClosingCash,           // ABSOLUTE
}
```

**Issue:** `operatingProfit` here is `q1Revenue - q1OpCost` (absolute), but the reconciliation formula assumes it's the delta contribution to cash.

---

### Q2: calculateQ2Consequence (Lines 410-571)

**Return Statement (Line 543):**
```typescript
cashChange: cashChange,
```

**Calculation Chain (Lines 490-495):**
```typescript
// Line 490:
const newOpex = startingState.operatingCost + additionalAIOpex + revenueVariableOpex;

// Line 491:
const newOperatingProfit = newRevenue - newOpex;

// Line 494:
const cashChange = newOperatingProfit - startingState.operatingProfit;

// Line 495:
const newCash = Math.max(5, startingState.cash + cashChange);  // FLOOR APPLIED
```

**Semantic:** `cashChange` is a DELTA. But `newCash` includes a floor that is NOT reflected in returned `cashChange`.

**Diagnostic Captures (Lines 560-569):**
```typescript
__diagnostic__cashLedger: {
  operatingCost: newOpex,                    // ABSOLUTE cost
  operatingProfit: newOperatingProfit,       // ABSOLUTE new profit
  closingCash: newCash,                      // ABSOLUTE (includes floor)
}
```

**Critical Issue:**
- Engine returns `cashChange = newOperatingProfit - startingState.operatingProfit`
- Engine calculates `newCash = startingState.cash + cashChange` (then applies floor)
- Diagnostic shows `operatingProfit = newOperatingProfit` (absolute)
- **This causes reconciliation failure**

If `startingState.operatingProfit` is not captured, the formula cannot be verified.

---

### Q3: calculateQ3Consequence (Lines 610-712)

**Return Statement (Line 701):**
```typescript
cashChange: cashChange,
```

**Calculation Chain (Lines 650-665):**
```typescript
// Line 650:
const newOperatingProfit = newRevenue - newOpex;

// Line 651:
const cashChange = newOperatingProfit - startingState.operatingProfit;

// (No explicit newCash variable; relies on applyConsequence to compute)
```

**Semantic:** `cashChange` is a DELTA.

**Diagnostic Captures (Lines 706-713):**
```typescript
__diagnostic__cashLedger: {
  operatingProfit: newOperatingProfit,       // ABSOLUTE, not delta
  closingCash: newCash,                      // But where is newCash?
}
```

**Issue:** Q3 doesn't explicitly compute `newCash`. It's computed by:
```
newCash = startingState.cash + cashChange (in applyConsequence)
```

But the diagnostic captures a `closingCash` that doesn't exist in Q3's code.

---

### Q4: calculateQ4Consequence (Lines 727-761)

**Status:** MISSING FROM DIAGNOSTIC LEDGER

**Return Statement (Line 759):**
```typescript
revenueChange: 0,
cashChange: 0,
stockPriceChange,
capabilityChanges: {},
thresholdsCrossed: [],
// No __diagnostic__cashLedger
```

**Why Missing:**
Q4 doesn't modify cash; it just applies stock/culture changes for the destination choice.

```typescript
const cashChange = 0;  // Implicit; not explicitly assigned
```

**Semantic:** No cash impact in Q4.

---

### Q5: calculateQ5Consequence (Lines 791-847)

**Return Statement (Line 830):**
```typescript
cashChange: cashChange,
```

**Calculation Chain (Lines 814):**
```typescript
const cashChange = newOperatingProfit - startingState.operatingProfit;

const newCash = startingState.cash + cashChange;  // Computed but not captured in return
```

**Semantic:** `cashChange` is a DELTA.

**Diagnostic Captures (Lines 837-846):**
```typescript
__diagnostic__cashLedger: {
  operatingProfit: newOperatingProfit,       // ABSOLUTE
  closingCash: newCash,                      // ABSOLUTE
}
```

**Issue:** Same as Q2/Q3 — diagnostic shows absolute operatingProfit but reconciliation needs the delta.

---

### Q6: calculateQ6Consequence (Lines 850-927)

**Return Statement (Line 903):**
```typescript
cashChange: cashChange,
```

**Calculation Chain (Lines 886):**
```typescript
const cashChange = newOperatingProfit - startingState.operatingProfit;

const newCash = startingState.cash + cashChange;
```

**Semantic:** `cashChange` is a DELTA.

**Diagnostic Captures (Lines 914-922):**
```typescript
__diagnostic__cashLedger: {
  operatingProfit: newOperatingProfit,       // ABSOLUTE
  closingCash: newCash,                      // ABSOLUTE
}
```

**Issue:** Same semantic mismatch.

---

### Q7: calculateQ7Consequence (Lines 930-1021)

**Return Statement (Line 998):**
```typescript
cashChange: cashChange,
```

**Calculation Chain (Line 986):**
```typescript
const cashChange = newOperatingProfit - startingState.operatingCost;  // ← SEMANTIC VIOLATION
```

**CRITICAL:** Q7 uses `startingState.operatingCost`, NOT `startingState.operatingProfit`.

```
cashChange = newOperatingProfit - startingState.operatingCost

Is this intentional? It breaks the Q1-Q6 pattern of:
cashChange = newOperatingProfit - startingState.operatingProfit
```

**This explains the -170M discrepancy:**

If Q1-Q6 build up a difference between the cumulative operating profits and costs, Q7's use of `operatingCost` instead of `operatingProfit` will introduce a large deduction.

---

### Q8: calculateQ8Consequence (Lines 1017-1195)

**Return Statement (Line 1172):**
```typescript
cashChange: cashChange,
```

**Calculation Chain (Line 1072):**
```typescript
const cashChange = q8EBITDA - startingState.operatingCost;  // ← DIFFERENT SEMANTICS
```

**CRITICAL:** Q8 is calculating based on EBITDA, not operating profit/revenue.

```
cashChange = EBITDA - operatingCost  (NOT - operatingProfit)

This is fundamentally different from Q1-Q7.
```

**Semantic:** This is not a consistent delta calculation.

**Diagnostic Captures (Lines 1004+):**
Q8 doesn't have __diagnostic__cashLedger because it's terminal scoring only.

---

## SUMMARY TABLE: CASHCHANGE SEMANTICS

| Quarter | Formula | Semantic Type | operatingProfit Captured | newCash Captured | Issue |
|---------|---------|---------------|--------------------------|------------------|-------|
| **Q1** | `q1ClosingCash - currentState.cash` | Delta | YES (absolute) | YES | Diagnostic shows absolute, formula needs delta |
| **Q2** | `newOperatingProfit - startingState.operatingProfit` | Delta | YES (absolute) | YES (includes floor) | Floor applied but not in cashChange |
| **Q3** | `newOperatingProfit - startingState.operatingProfit` | Delta | YES (absolute) | YES | Same semantic mismatch |
| **Q4** | 0 (implicit) | No change | N/A | N/A | Missing from ledger (intentional) |
| **Q5** | `newOperatingProfit - startingState.operatingProfit` | Delta | YES (absolute) | YES | Same semantic mismatch |
| **Q6** | `newOperatingProfit - startingState.operatingProfit` | Delta | YES (absolute) | YES | Same semantic mismatch |
| **Q7** | `newOperatingProfit - startingState.operatingCost` | **VIOLATION** | YES (absolute) | YES | Uses operatingCost instead of operatingProfit |
| **Q8** | `q8EBITDA - startingState.operatingCost` | **VIOLATION** | N/A | N/A | Uses EBITDA instead of operatingProfit; terminal only |

---

## ROOT CAUSES IDENTIFIED

### 1. **Q2-Q7 Diagnostic Semantic Mismatch**
- **What:** Diagnostic ledger captures `operatingProfit` as absolute value
- **Impact:** Reconciliation formula `Opening + OperatingProfit - Spend ≠ Closing` fails
- **Fix Needed:** Capture `startingState.operatingProfit` separately OR recalculate delta in diagnostic

### 2. **Q7 Formula Semantic Violation**
- **What:** `cashChange = newOperatingProfit - startingState.operatingCost` (not operatingProfit)
- **Impact:** Introduces -170M unaccounted deduction
- **Evidence:** Line 986 in engine.ts

### 3. **Q8 Formula Semantic Violation**
- **What:** `cashChange = q8EBITDA - startingState.operatingCost` (not following Q1-Q7 pattern)
- **Impact:** Terminal scoring semantic break
- **Evidence:** Line 1072 in engine.ts

### 4. **Q2 Floor Application Not Reflected in cashChange**
- **What:** `newCash = Math.max(5, ...)` but returned `cashChange` doesn't include floor
- **Impact:** If floor triggers, closing cash ≠ opening + cashChange
- **Evidence:** Lines 495 and 543 in engine.ts

### 5. **Missing Starting Operating Profit in Diagnostic**
- **What:** Diagnostic doesn't capture `startingState.operatingProfit` for Q1-Q8
- **Impact:** Cannot independently verify `cashChange = newOP - startingOP`
- **Fix Needed:** Add `__diagnostic__startingOperatingProfit` field

---

## MISSING COMPONENTS FROM DIAGNOSTIC LEDGER

To properly reconcile cash, diagnostic needs to capture:

```typescript
__diagnostic__cashLedger: {
  // Current captures:
  openingCash,
  revenue,
  operatingCost,
  operatingProfit,        // This is NEW (absolute), not delta
  strategicSpend,
  closingCash,
  
  // MISSING:
  startingOperatingProfit,   // Needed to verify delta
  
  // Additional diagnostic fields needed:
  __cashChangeFormula: "Opening + Delta(OpProfit) - Spend = Closing"
  __calculatedClosing: opening + (newOp - startOp) - spend
  __floorApplied: boolean
  __floorAmount: number (if applied)
}
```

---

## EXACT CODE LOCATIONS REQUIRING ANALYSIS

1. **Q2 Floor (Line 495):** Why is floor applied? Does it trigger in diagnostic run?
2. **Q7 Formula (Line 986):** Why `operatingCost` instead of `operatingProfit`?
3. **Q8 Formula (Line 1072):** Why `q8EBITDA - operatingCost` instead of profit delta?
4. **applyConsequence (stateBuilder.ts Line 35):** Assumes `cashChange` is always delta

---

**Next Step:** Await Mode 4 diagnostic output to validate which calculations actually execute and where the -34M and -170M deductions originate.

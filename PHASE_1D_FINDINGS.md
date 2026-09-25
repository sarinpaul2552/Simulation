# PHASE 1D — CASH STATE RECONCILIATION FINDINGS

**Status:** ✅ Code trace complete. Semantic violations identified. Awaiting Mode 4 diagnostic output for validation.

---

## EXECUTIVE SUMMARY

The production code contains **two critical semantic violations** in the cashChange calculation:

1. **Q7 uses wrong metric:** `cashChange = newOperatingProfit - startingState.operatingCost` (should use operatingProfit)
2. **Q8 uses incompatible formula:** `cashChange = q8EBITDA - startingState.operatingCost` (fundamentally different)

Additionally, the **diagnostic ledger captures absolute values** where deltas are needed, preventing reconciliation validation.

---

## QUARTERLY CASHCHANGE CALCULATION FORMULAS

### Q1: calculateQ1Consequence (Line 357)
```typescript
return {
  cashChange: q1ClosingCash - currentState.cash,
  // Where: q1ClosingCash = currentState.cash + q1OpProfit - strategicSpend
  // Result: cashChange = q1OpProfit - strategicSpend ✓ CORRECT DELTA
```

**Semantic:** Delta (absolute change in cash)

---

### Q2: calculateQ2Consequence (Line 543)
```typescript
const newOperatingProfit = newRevenue - newOpex;           // Line 491
const cashChange = newOperatingProfit - startingState.operatingProfit;  // Line 494
const newCash = Math.max(5, startingState.cash + cashChange);  // Line 495

return {
  cashChange: cashChange,  // Returns delta, not newCash
```

**Semantic:** Delta

**Critical Issue:** Line 495 applies a floor (`Math.max(5, ...)`) to internal `newCash` but the returned `cashChange` does not include this floor adjustment. If the floor triggers, the diagnostic will show a discrepancy.

---

### Q3: calculateQ3Consequence (Line 701)
```typescript
const newOperatingProfit = newRevenue - newOpex;                     // Line 650
const cashChange = newOperatingProfit - startingState.operatingProfit; // Line 651

return {
  cashChange: cashChange,
```

**Semantic:** Delta ✓

---

### Q4: calculateQ4Consequence (Line 759)
```typescript
// Q4 does NOT modify cash
return {
  revenueChange: 0,
  cashChange: 0,  // No change
  // ...
  // NO __diagnostic__cashLedger added
```

**Semantic:** No change (intentional for Q4)

**Status:** Not included in diagnostic ledger (correct omission).

---

### Q5: calculateQ5Consequence (Line 830)
```typescript
const newOperatingProfit = newRevenue - newOpex;                     // Line 813
const cashChange = newOperatingProfit - startingState.operatingProfit; // Line 814

return {
  cashChange: cashChange,
```

**Semantic:** Delta ✓

---

### Q6: calculateQ6Consequence (Line 903)
```typescript
const newOperatingProfit = newRevenue - newOpex;                     // Line 885
const cashChange = newOperatingProfit - startingState.operatingProfit; // Line 886

return {
  cashChange: cashChange,
```

**Semantic:** Delta ✓

---

### Q7: calculateQ7Consequence (Line 1015) — 🚨 VIOLATION
```typescript
const newOperatingProfit = newRevenue - newOpex;                      // Line 985
const cashChange = newOperatingProfit - startingState.operatingCost;  // Line 986 ← WRONG METRIC

return {
  cashChange: cashChange,
```

**Semantic Violation:** Uses `operatingCost` instead of `operatingProfit`

**Impact:** Subtracts absolute cost instead of profit delta. Since costs are typically ~$170M in Q7, this explains the -170M unexplained deduction.

**Example Calculation:**
```
newOperatingProfit = 50M (Q7 profit)
startingState.operatingCost = 170M (absolute cost)
cashChange = 50 - 170 = -120M  ← WRONG

Should be:
cashChange = 50 - startingState.operatingProfit ≈ 50 - 40 = 10M (delta)
```

**Code Location:** engine.ts line 986

---

### Q8: calculateQ8Consequence (Line 1172) — 🚨 VIOLATION
```typescript
const q8Revenue = startingState.revenue * q8RevenueMultiplier;        // Line 1061
let ebitdaMargin = 0.38;                                              // Line 1064
const q8EBITDA = q8Revenue * ebitdaMargin;                            // Line 1071
const cashChange = q8EBITDA - startingState.operatingCost;            // Line 1072 ← INCOMPATIBLE

return {
  cashChange: cashChange,
  // ...
  terminalResult: { ... }
  // NO __diagnostic__cashLedger
```

**Semantic Violation:** Uses EBITDA (earnings before interest, taxes, depreciation, amortization) instead of operating profit. Also subtracts `operatingCost` not `operatingProfit`.

**Impact:** Completely different cash semantics for terminal scoring.

**Code Location:** engine.ts line 1072

---

## DIAGNOSTIC LEDGER SEMANTIC MISMATCH

### What Was Captured (Phase 1C)

For Q1-Q8 (except Q4, Q8):
```typescript
__diagnostic__cashLedger: {
  openingCash: startingState.cash,              // Absolute
  revenue: newRevenue,                          // Absolute
  operatingCost: newOpex,                       // Absolute
  operatingProfit: newOperatingProfit,          // Absolute (NEW profit)
  strategicSpend: ...,                          // Absolute
  closingCash: newCash,                         // Absolute
}
```

### The Reconciliation Problem

User formula (from Phase 1C output):
```
Opening + Operating Profit − Spend = Closing
94 + 31.119 − 0 = 125.119  (wrong! actual closing is 91.119)
```

But the engine actually computes:
```
cashChange = newOperatingProfit - startingState.operatingProfit
newCash = openingCash + cashChange
```

So the reconciliation should be:
```
Opening + (newOp - startingOp) − Spend = Closing
94 + (31.119 - startingOp) − 0 = Closing
```

**Missing:** `startingState.operatingProfit` is not captured in diagnostic.

### What Should Be Captured

To enable proper reconciliation:
```typescript
__diagnostic__cashLedger: {
  openingCash,
  startingOperatingProfit,    // MISSING
  newRevenue,
  newOperatingCost,
  newOperatingProfit,
  operatingProfitDelta: newOperatingProfit - startingOperatingProfit,  // MISSING
  strategicSpend,
  closingCash,
  reconciliation: openingCash + operatingProfitDelta - strategicSpend - closingCash,
}
```

---

## MISSING COMPONENTS FROM DIAGNOSTIC LEDGER

### Q4
- **Status:** ✓ Correctly omitted (no cash change in Q4)

### Q8
- **Status:** ❌ Missing from ledger
- **Reason:** Q8 is terminal scoring only, doesn't use normal consequence flow
- **Impact:** Cannot trace Q8 cash using diagnostic ledger

---

## EXACT CODE LOCATIONS FOR VIOLATIONS

| Item | File | Line | Issue |
|------|------|------|-------|
| Q7 wrong metric | engine.ts | 986 | `operatingCost` instead of `operatingProfit` |
| Q8 EBITDA formula | engine.ts | 1072 | `q8EBITDA - operatingCost` instead of operating profit delta |
| Q2 floor | engine.ts | 495 | `Math.max(5, ...)` applied to newCash but not reflected in returned cashChange |
| applyConsequence assumption | stateBuilder.ts | 35 | `newState.cash += consequence.cashChange` assumes cashChange is delta |
| Q1-Q6 pattern | engine.ts | 357, 543, 701, 830, 903 | All use `newOp - startingOp` pattern consistently |

---

## CLASSIFICATION

### Q1: Correct Delta ✓
- Formula: `q1ClosingCash - currentState.cash = q1OpProfit - strategicSpend`
- Returns delta
- Diagnostic mismatch: shows absolute operatingProfit

### Q2: Correct Delta ✓ (with caveat)
- Formula: `newOperatingProfit - startingState.operatingProfit`
- Returns delta
- **Caveat:** Floor applied to newCash (line 495) but not reflected in returned cashChange
- Diagnostic mismatch: shows absolute operatingProfit

### Q3: Correct Delta ✓
- Formula: `newOperatingProfit - startingState.operatingProfit`
- Returns delta
- Diagnostic mismatch: shows absolute operatingProfit

### Q4: Correct (No Change) ✓
- Formula: `cashChange = 0`
- Intentional
- Correctly omitted from diagnostic ledger

### Q5: Correct Delta ✓
- Formula: `newOperatingProfit - startingState.operatingProfit`
- Returns delta
- Diagnostic mismatch: shows absolute operatingProfit

### Q6: Correct Delta ✓
- Formula: `newOperatingProfit - startingState.operatingProfit`
- Returns delta
- Diagnostic mismatch: shows absolute operatingProfit

### Q7: **Semantic Mismatch** ❌
- Formula: `newOperatingProfit - startingState.operatingCost` ← WRONG METRIC
- Should use `operatingProfit`, not `operatingCost`
- **Causes:** Large unexplained deduction (~-170M)

### Q8: **Semantic Violation** ❌
- Formula: `q8EBITDA - startingState.operatingCost` ← INCOMPATIBLE
- Uses EBITDA instead of operating profit
- Fundamentally different from Q1-Q7
- Terminal scoring only; not included in diagnostic ledger

---

## NEXT STEPS (AWAITING MODE 4 OUTPUT)

Once you provide the Mode 4 diagnostic output, I will:

1. **Validate Q2 floor:** Check if closing = opening + cashChange or if floor was applied
2. **Quantify Q7 impact:** Trace the exact -170M deduction source
3. **Verify Q8 terminal logic:** Confirm EBITDA-based calculation is intentional for terminal scoring
4. **Identify missing startingOperatingProfit:** Calculate what it should be based on Q1-Q6
5. **Classify remaining discrepancies:** Bug vs design vs diagnostic omission

---

**Phase 1D code trace complete. Standing by for Mode 4 diagnostic output.**

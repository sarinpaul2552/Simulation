# Q1 ECONOMICS DISCREPANCY ANALYSIS

**Date:** September 9, 2026  
**Issue:** Two critical errors in Q1 revenue and cash calculations  
**Status:** Errors confirmed; corrections required  

---

## DISCREPANCY 1: CASH RESERVE DOUBLE-COUNTING

### Current Code (engine.ts, Lines 239–243)

```typescript
// Closing cash (Q1: only 5 strategic categories spend; CS and marketing enforced to 0)
const strategicSpend = allocation.consumerGrowth + allocation.enterpriseSales + allocation.aiProduct +
                       allocation.instructorPeople + allocation.universityCredential;
const retainedCash = allocation.cash;
const q1ClosingCash = currentState.cash + q1OpProfit - strategicSpend + retainedCash;
```

### Analysis

The formula adds retainedCash separately:
```
Closing Cash = $60M (opening) + $45M (profit) - $22M (spend) + $8M (retained)
             = $91M
```

**This is incorrect.** The `strategicSpend` calculation already excludes the Cash Reserve allocation. Here's why:

**Capital allocation breakdown:**
- Total capital available: $30M
- Allocated to strategic spend (5 categories): Consumer $4M + Enterprise $4M + AI $6M + People $4M + Credential $4M = $22M
- Allocated to Cash Reserve: $8M
- Total: $22M + $8M = $30M ✓

**The strategicSpend is already net of the retained cash.** When you do NOT spend the $8M, it stays as cash. The code then:
1. Subtracts $22M from cash (strategic spend)
2. Adds $8M back (retained cash)

But step 2 is redundant. The cash that wasn't spent is already not subtracted in step 1.

**Correct formula:**
```
Closing Cash = Opening Cash + Operating Profit − Strategic Spend
             = $60M + $45M − $22M
             = $83M
```

**NOT:** $60M + $45M − $22M + $8M

The line `const q1ClosingCash = currentState.cash + q1OpProfit - strategicSpend + retainedCash;` should be:
```typescript
const q1ClosingCash = currentState.cash + q1OpProfit - strategicSpend;
```

The `retainedCash` variable is redundant because it was already excluded from strategicSpend.

---

## DISCREPANCY 2: Q1 REVENUE INFLATION & ALIGNMENT MULTIPLIER MISAPPLICATION

### Current Code (engine.ts, Lines 217–233)

```typescript
// Q1 Revenue: Base market tailwind + allocation effects
const baseMarketTailwind = 1.02; // +2%
let q1Revenue = currentState.revenue * baseMarketTailwind;  // Step 1: $200M × 1.02 = $204M

// Consumer allocation creates near-term revenue
const consumerRevenueLift = (allocation.consumerGrowth / 30) * (newCapabilities.consumer / 100) * 0.05;
q1Revenue += q1Revenue * consumerRevenueLift;  // Step 2: $204M × 0.393% = +$0.80M

// Enterprise has small current-quarter pipeline benefit
if (allocation.enterpriseSales > 0 && newCapabilities.enterprise >= 45) {
  const enterpriseLift = (allocation.enterpriseSales / 30) * 0.02;
  q1Revenue += q1Revenue * enterpriseLift;  // Skipped (enterprise cap 35 < 45)
}

// Apply alignment multiplier
const alignmentMultiplier = getAlignmentMultiplier(executionAlignment);
q1Revenue = q1Revenue * alignmentMultiplier;  // Step 3: $204.80M × 1.05 = $215.04M
```

### Numeric Trace (Current Code)

| Step | Calculation | Result | Issue |
|------|-------------|--------|-------|
| 1 | $200M × 1.02 | $204M | ✓ Correct |
| 2a | Consumer lift ratio: 4M/30M = 0.1333 | — | — |
| 2b | Consumer capability: 59/100 = 0.59 | — | — |
| 2c | Consumer effect: 0.1333 × 0.59 × 5% = 0.393% | — | — |
| 2d | Add to revenue: $204M × 0.00393 = +$0.80M | $204.80M | **❌ ERROR: Consumer matures Q2** |
| 3 | Apply alignment 1.05× to total revenue | $215.04M | **❌ ERROR: Multiplier to total, not incremental** |

---

## LOCKED SPECIFICATION REQUIREMENTS

### From V4 Economics & Consequence Engine

**Q1 Revenue Structure:**

> "Q1: No shock. +2% tailwind. Establish capabilities. Q1 Consumer matures Q2. Q1 University matures Q2."

**Key constraints:**
- Consumer investment Q1 → revenue matures Q2 (NOT Q1)
- University investment Q1 → revenue matures Q2 (NOT Q1)
- AI → "essentially no Q1 revenue benefit" (from locked spec doc)
- Enterprise → "only a small current-quarter pipeline/revenue effect" IF capability >= 45
- Alignment multiplier → "applies only to incremental strategy-generated revenue, not total company revenue"

**What this means for Q1:**
1. Base revenue calculation: $200M × 1.02 = $204M ✓
2. Consumer lift: $0 (matures Q2, not Q1)
3. University lift: $0 (matures Q2, not Q1)
4. AI lift: $0 (no Q1 commercial benefit)
5. Enterprise lift: $0 (capability 35 < threshold 45)
6. Total strategic-generated revenue: $0
7. Alignment multiplier on strategic revenue: 1.05× × $0 = $0
8. **Final Q1 revenue: $204M**

---

## DISCREPANCY CONFIRMATION

### Error 1: Consumer Same-Quarter Revenue

**Locked spec:** "Q1 Consumer matures Q2"  
**Current code:** Applies consumer lift in Q1 (Line 222–223)  
**Impact:** Inflates Q1 revenue by ~$0.80M incorrectly

### Error 2: Alignment Multiplier Applied to Total Revenue

**Locked spec:** "Alignment multiplier applies only to incremental strategy-generated revenue"  
**Current code:** Applies 1.05× to entire $204.80M revenue (Line 233)  
**Impact:** Inflates Q1 revenue by additional ~$2.40M incorrectly

**Correct application:** Should be 1.05× × $0 (no strategic revenue) = $0 alignment boost

### Error 3: Cash Reserve Double-Counting

**Locked spec:** (Implicit) Cash retained is not separately added after spend subtraction  
**Current code:** Adds retainedCash after subtracting strategicSpend (Line 243)  
**Impact:** Overstates closing cash by $8M ($91M vs. $83M)

---

## CORRECTED Q1 CALCULATIONS

### Corrected Revenue Formula

```
Q1 Revenue = Base revenue × market tailwind + strategic revenue × alignment multiplier

Where:
- Base revenue = $200M
- Market tailwind = 1.02
- Strategic revenue = Consumer + University + AI + Enterprise (only if cap ≥ 45) = $0
- Alignment multiplier = 1.05 (but only applies to non-zero strategic revenue)

Q1 Revenue = $200M × 1.02 + ($0 × 1.05)
           = $204M + $0
           = $204M
```

### Corrected Cash Formula

```
Closing Cash = Opening Cash + Operating Profit − Strategic Spend

Where:
- Opening cash = $60M
- Operating profit = Revenue − OpCost = $204M − $170M = $34M
- Strategic spend = 4+4+6+4+4 = $22M
- Retained cash is already excluded from strategic spend (not added separately)

Closing Cash = $60M + $34M − $22M
             = $72M
```

---

## CORRECTED Q1 NUMERICAL OUTPUTS

### Financial Results

| Metric | Incorrect (Current Code) | Correct (Per Spec) | Difference |
|--------|--------------------------|-------------------|-----------|
| **Revenue** | $215.0M | $204.0M | −$11.0M |
| **Operating Profit** | $45.0M | $34.0M | −$11.0M |
| **Closing Cash** | $91.0M | $72.0M | −$19.0M |
| **Stock Price** | $105.60 | $102.86 | −$2.74 |

### Stock Price Recalculation (Corrected)

**Factor 1: Growth vs expectation (35% weight)**
```
Growth: ($204M − $200M) / $200M = 2.0%
Stock impact: 0.02 × 0.35 × 100 = 0.7 points
```

**Factor 2: Margin change (30% weight)**
```
Q1 margin: $34M / $204M = 16.67%
Baseline margin: $30M / $200M = 15.0%
Change: 1.67%
Stock impact: 0.0167 × 0.30 × 100 = 0.501 points
```

**Factor 3: Alignment (15% weight)**
```
(68 − 60) × 0.15 = 1.2 points
```

**Total:** 0.7 + 0.501 + 1.2 = 2.401 points  
**New stock price:** $100.00 + $2.40 = **$102.40**

### Capability Results (Unchanged)

Capabilities are not affected by the revenue/cash errors. They depend only on investment allocation and multipliers:

| Capability | Corrected |
|------------|-----------|
| Consumer | 59 (4.0M × 1.0) |
| Enterprise | 35 (4.0M × 1.2) |
| AI | 18 (5.8M × 1.3) |
| Talent | 59 (4.0M × 1.0) |
| Credential | 44 (4.0M × 1.0) |
| Execution | 68 (broad alignment) |

### Culture, Product Quality, Trust (Unchanged)

| Metric | Corrected |
|--------|-----------|
| Culture | 73 (72 + 1.2 from people spend) |
| Product Quality | 70 (unchanged) |
| Trust | 70 (unchanged) |

---

## CORRECTED SUMMARY TABLE

| Metric | Start | End (Corrected) | Change | Formula |
|--------|-------|-----------------|--------|---------|
| Revenue | $200.0M | $204.0M | +$4.0M | Base + 2% tailwind only; no strategic benefits in Q1 |
| Operating Profit | $30.0M | $34.0M | +$4.0M | $204M − $170M |
| Cash | $60.0M | $72.0M | +$12.0M | Start + profit − $22M spend (no double-count) |
| Stock Price | $100.00 | $102.40 | +$2.40 | Growth +0.70 + margin +0.50 + alignment +1.20 |
| Product Quality | 70 | 70 | — | Not modified in Q1 |
| Culture | 72 | 73 | +1 | People × 0.3 |
| Trust | 70 | 70 | — | Not modified in Q1 |
| Consumer Cap | 55 | 59 | +4 | 4.0M × 1.0 |
| Enterprise Cap | 30 | 35 | +5 | 4.0M × 1.2 |
| AI Cap | 10 | 18 | +8 | 5.8M × 1.3 |
| Talent Cap | 55 | 59 | +4 | 4.0M × 1.0 |
| Credential Cap | 40 | 44 | +4 | 4.0M × 1.0 |
| Execution | 60 | 68 | +8 | Broad alignment |

---

## REQUIRED CODE CORRECTIONS

### Fix 1: Remove Cash Reserve Addition (engine.ts, Line 243)

**Current:**
```typescript
const q1ClosingCash = currentState.cash + q1OpProfit - strategicSpend + retainedCash;
```

**Corrected:**
```typescript
const q1ClosingCash = currentState.cash + q1OpProfit - strategicSpend;
```

**Rationale:** strategicSpend already excludes retainedCash; adding it separately double-counts.

### Fix 2: Remove Consumer Revenue Lift in Q1 (engine.ts, Lines 221–223)

**Current:**
```typescript
// Consumer allocation creates near-term revenue
const consumerRevenueLift = (allocation.consumerGrowth / 30) * (newCapabilities.consumer / 100) * 0.05;
q1Revenue += q1Revenue * consumerRevenueLift;
```

**Corrected:**
```typescript
// Q1: Consumer investment matures Q2, not Q1 (per locked spec)
// No consumer revenue lift in Q1
```

**Rationale:** Locked spec: "Q1 Consumer matures Q2"

### Fix 3: Limit Alignment Multiplier to Strategic Revenue (engine.ts, Lines 231–233)

**Current:**
```typescript
// Apply alignment multiplier
const alignmentMultiplier = getAlignmentMultiplier(executionAlignment);
q1Revenue = q1Revenue * alignmentMultiplier;
```

**Corrected:**
```typescript
// Q1: Strategic revenue is 0 (Consumer, University, AI have no Q1 benefit; Enterprise skipped)
// Alignment multiplier applies only to incremental strategy-generated revenue
// Since strategic revenue = $0, alignment boost = $0
// q1Revenue remains at $204M
```

**Rationale:** Locked spec: "Alignment multiplier applies only to incremental strategy-generated revenue"

---

## VERIFICATION AGAINST LOCKED SPECIFICATION

| Requirement | Current Code | Correct Per Spec | Status |
|-------------|--------------|------------------|--------|
| Q1 consumer revenue benefit | YES (same quarter) | NO (matures Q2) | ❌ ERROR |
| Q1 university revenue benefit | NO (skipped) | NO (matures Q2) | ✓ CORRECT |
| Q1 AI revenue benefit | NO (skipped) | NO (no commercial benefit) | ✓ CORRECT |
| Q1 enterprise revenue benefit | NO (cap < 45) | NO (cap < 45) | ✓ CORRECT |
| Alignment multiplier applies to all revenue | YES | NO (only incremental strategic) | ❌ ERROR |
| Cash reserve double-counted | YES | NO | ❌ ERROR |
| Base revenue + tailwind | $204M ✓ | $204M | ✓ CORRECT |
| Final Q1 revenue | $215M | $204M | ❌ ERROR |

---

## IMPACT SUMMARY

**Errors inflate Q1 results:**
- Revenue: +$11.0M (5.4% overstatement)
- Operating Profit: +$11.0M (32% overstatement)
- Closing Cash: +$19.0M (26% overstatement)
- Stock Price: +$3.20 (3.1% overstatement)

**All four errors must be corrected before validation can proceed.**

---

**Status:** Ready for implementation  
**Next step:** Apply corrections to engine.ts and recalculate all validation guide expected outputs

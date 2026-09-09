# RECONCILIATION: Q1 ALLOCATION CATEGORIES

**Date:** September 2026  
**Issue:** BetScreen currently exposes 8 allocation categories; locked V4 specification designates only 6 for Q1  
**Status:** DISCREPANCY CONFIRMED, CORRECTION REQUIRED

---

## 1. DISCREPANCY IDENTIFICATION

### 1.1 Locked V4 Specification (From PASS_1_SUMMARY.md)

Q1–Q4 decisions are described as **"Capital allocation with role-specific voting"**.

**Locked Q1 Decision Categories (6 only):**
1. Consumer Growth
2. Enterprise (Sales)
3. AI & Technology
4. Instructor / People
5. University / Credentials
6. Cash Reserve

**Source:** V4 specification states that "Later quarters explicitly call back prior decisions" and references Q4 Reversal and post-Q4 capability decay. Customer Success and Marketing are **not** mentioned as Q1 decisions; they appear to be intended for post-Q4 **operating** decisions (Phase 2 expansion).

### 1.2 Current Implementation (BetScreen.tsx, Lines 22–30)

**Current Q1 Categories Exposed (8 total):**
1. Consumer Growth
2. Enterprise Sales
3. AI Product
4. Instructor/People
5. University/Credential
6. **Customer Success** ← NOT in locked spec
7. **Marketing** ← NOT in locked spec
8. Cash Reserve

### 1.3 Engine Processing (engine.ts, Lines 201–239)

**Categories processed in calculateQ1Consequence():**

| Category | Processed | Lines | Impact |
|----------|-----------|-------|--------|
| consumerGrowth | YES | 153–159 | Creates consumer capability; feeds revenue model |
| enterpriseSales | YES | 162–168 | Creates enterprise capability; feeds revenue model if cap ≥ 45 |
| aiProduct | YES | 171–177 | Creates AI capability |
| instructorPeople | YES | 180–190 | Creates talent capability; boosts culture +0.3× effective |
| universityCredential | YES | 193–199 | Creates credential capability |
| **customerSuccess** | **YES** | **202–208** | **Creates CS capability; included in strategic spend** |
| **marketing** | **PARTIAL** | **Line 239** | **Only in spend total; NOT processed as capability** |
| cash | YES | 240–241 | Retained as liquidity |

**Finding:** Both customerSuccess and marketing are included in the engine's Q1 consequence calculation, despite being outside the locked specification.

### 1.4 Design Rationale

The locked specification states:
- **Q1–Q4:** Core strategic decisions (allocation to 6 categories)
- **Post-Q4:** "Adaptation *execution* within that destination... can adapt *execution* within that destination across Q5–Q8 (e.g., **shift allocation, change customer success focus**)"

This implies:
- **Customer Success becomes relevant in Q5–Q8**, not Q1–Q4
- **Marketing is similarly post-Q4 (Phase 2 feature)**
- **Q1 focuses on building foundational capabilities** (Consumer, Enterprise, AI, Talent, Credential) and maintaining liquidity

---

## 2. ROOT CAUSE

The engine was built to support the **full allocation model** (all 8 categories available for any quarter), but the **UI was not filtered** to match the Q1-only constraint.

**Not a bug, but a scope creep:** Customer Success and Marketing were added for completeness but should not surface in Q1.

---

## 3. CORRECTION DECISION

**✅ APPROVED: Remove customerSuccess and marketing from Q1**

- Q1 allocation form will show **6 categories only**
- Q1 engine will explicitly skip customerSuccess and marketing processing
- Default $30M capital available remains unchanged
- Test case will be recalculated with 6-category allocation

---

## 4. CHANGES REQUIRED

### 4.1 Change 1: Update BetScreen.tsx

**Current (Lines 22–30):**
```typescript
const categories = [
  { key: 'consumerGrowth' as const, label: 'Consumer Growth', ... },
  { key: 'enterpriseSales' as const, label: 'Enterprise Sales', ... },
  { key: 'aiProduct' as const, label: 'AI Product', ... },
  { key: 'instructorPeople' as const, label: 'Instructor/People', ... },
  { key: 'universityCredential' as const, label: 'University/Credential', ... },
  { key: 'customerSuccess' as const, label: 'Customer Success', ... },  // REMOVE
  { key: 'marketing' as const, label: 'Marketing', ... },              // REMOVE
  { key: 'cash' as const, label: 'Cash Reserve', ... },
];
```

**New (6 categories only):**
```typescript
const categories = [
  { key: 'consumerGrowth' as const, label: 'Consumer Growth', hint: 'Customer acquisition & retention in mass market' },
  { key: 'enterpriseSales' as const, label: 'Enterprise Sales', hint: 'B2B sales team & account management' },
  { key: 'aiProduct' as const, label: 'AI Product', hint: 'R&D for AI/product modernization' },
  { key: 'instructorPeople' as const, label: 'Instructor/People', hint: 'Talent acquisition & creator partnerships' },
  { key: 'universityCredential' as const, label: 'University/Credential', hint: 'Institutional partnerships & credentialing' },
  { key: 'cash' as const, label: 'Cash Reserve', hint: 'Retain as liquidity' },
];
```

**Also update default allocation (Lines 11–20):**
```typescript
const [allocation, setAllocation] = useState<Allocation>({
  consumerGrowth: 5,
  enterpriseSales: 5,
  aiProduct: 5,
  instructorPeople: 5,
  universityCredential: 3,
  customerSuccess: 0,    // Set to 0; field still exists in type
  marketing: 0,          // Set to 0; field still exists in type
  cash: 7,               // Adjust to balance
});
```

### 4.2 Change 2: Update engine.ts calculateQ1Consequence()

**Add early exit for Q1-only allocation (after line 147):**
```typescript
  // Q1 only: enforce no customerSuccess or marketing allocation
  // These categories are available Q5+ (post-Q4 destination)
  if (Math.abs(allocation.customerSuccess) > 0.01 || Math.abs(allocation.marketing) > 0.01) {
    throw new Error(
      'Q1 does not support customerSuccess or marketing allocation. ' +
      'These become available after Q4 destination commitment.'
    );
  }
```

**Skip processing blocks (Lines 201–239):**
```typescript
  // Q1: Customer Success not available
  // if (allocation.customerSuccess > 0) { ... } // SKIP

  // Q1: Marketing not available
  // (Marketing is included in spend total but does not create capability in Q1)
  // Spend total still includes it for validation, but it should be 0
```

**Simplify spend total (Line 237–239):**
```typescript
  const strategicSpend = allocation.consumerGrowth + allocation.enterpriseSales + 
                         allocation.aiProduct + allocation.instructorPeople + 
                         allocation.universityCredential;
  // marketing and customerSuccess explicitly NOT included in Q1
```

---

## 5. CORRECTED Q1 TEST CASE

### 5.1 Fixed Allocation (6 categories, $30M total)

| Category | Amount | Rationale |
|----------|--------|-----------|
| Consumer Growth | $4M | Core revenue driver; mass market acquisition |
| Enterprise Sales | $4M | Emerging B2B opportunity; test-and-learn |
| AI Product | $6M | Foundational R&D; establish capability floor |
| Instructor/People | $4M | Retain talent; creator satisfaction |
| University/Credentials | $4M | Build institutional partnerships |
| Cash Reserve | $8M | Maintain 1.6-quarter runway; CFO confidence |
| **TOTAL** | **$30M** | ✓ Balanced, validates |

### 5.2 Fixed Selections (Unchanged)

- **Belief:** `stable_dominant` ("Stable & dominant. Consumer will remain our core.")
- **Risks:**
  - `consumer_disruption` (Severity: **4**/5)
  - `technology_lag` (Severity: **3**/5)
- **Five Executive Votes:**
  - CEO: YES (confidence 4)
  - CFO: YES (confidence 4)
  - Product: YES (confidence 5)
  - People: NO (confidence 3)
  - Growth: YES (confidence 4)
- **Team Check:** Broad Alignment (4/5), no override

---

## 6. EXPECTED Q1 CALCULATION TRACE (CORRECTED)

### 6.1 Diminishing Returns (Effective Investment)

**Formula (from engine.ts, Lines 61–72):**
```typescript
function calculateEffectiveInvestment(amount: number): number {
  if (amount <= 5) return amount * 1.0;
  if (amount <= 10) return 5 * 1.0 + (amount - 5) * 0.8;
  if (amount <= 15) return 5 * 1.0 + 5 * 0.8 + (amount - 10) * 0.6;
  return 5 * 1.0 + 5 * 0.8 + 5 * 0.6 + (amount - 15) * 0.4;
}
```

**Calculations:**

| Category | Spent | Tier 1 (0–5: 100%) | Tier 2 (5–10: 80%) | Tier 3 (10–15: 60%) | Tier 4 (15+: 40%) | Effective | Multiplier |
|----------|-------|-----|-----|-----|-----|---------|-----------|
| Consumer | $4M | 4×1.0 = 4.0 | — | — | — | **4.0** | 1.0 |
| Enterprise | $4M | 4×1.0 = 4.0 | — | — | — | **4.0** | 1.2 |
| AI | $6M | 5×1.0 = 5.0 | 1×0.8 = 0.8 | — | — | **5.8** | 1.3 |
| People | $4M | 4×1.0 = 4.0 | — | — | — | **4.0** | 1.0 |
| Credential | $4M | 4×1.0 = 4.0 | — | — | — | **4.0** | 1.0 |
| **Cash (retained)** | $8M | n/a | n/a | n/a | n/a | **n/a** | n/a |

### 6.2 Capability Creation

**Formula (from engine.ts, Lines 88–98):**
```typescript
function createCapabilityFromInvestment(
  category: string,
  effectiveInvested: number,
  currentCapability: number
): number {
  const multipliers = {
    consumerGrowth: 1.0,
    enterpriseSales: 1.2,
    aiProduct: 1.3,
    instructorPeople: 1.0,
    universityCredential: 1.0,
    customerSuccess: 1.2,    // Not used in Q1
    marketing: 0.7,          // Not used in Q1
  };
  const multiplier = multipliers[category] || 1.0;
  const baseGain = effectiveInvested * multiplier;
  const newCapability = Math.min(100, currentCapability + baseGain);
  return Math.round(newCapability);
}
```

**Starting capabilities:**
```
consumer: 55
enterprise: 30
ai: 10
talent: 55
credential: 40
customerSuccess: 30  (not modified in Q1)
growth: 55
execution: 60        (set by alignment)
```

**Capability updates:**

```
Consumer:    55 + (4.0 × 1.0) = 55 + 4.0 = 59
Enterprise:  30 + (4.0 × 1.2) = 30 + 4.8 = 34.8 ≈ 35
AI:          10 + (5.8 × 1.3) = 10 + 7.54 = 17.54 ≈ 18
Talent:      55 + (4.0 × 1.0) = 55 + 4.0 = 59
Credential:  40 + (4.0 × 1.0) = 40 + 4.0 = 44
CustomerSuccess: 30 (unchanged)
Growth:      55 (unchanged)
Execution:   (set by alignment score)
```

**Threshold Analysis (from engine.ts, Lines 74–101):**
```typescript
function getCapabilityLevel(value: number): string {
  if (value <= 24) return 'Weak';
  if (value <= 44) return 'Developing';
  if (value <= 64) return 'Competitive';
  if (value <= 79) return 'Strong';
  return 'Leading';
}
```

| Capability | From | To | From Level | To Level | Crossed? |
|------------|------|----|----|----|----|
| Consumer | 55 | 59 | Competitive | Competitive | NO |
| Enterprise | 30 | 35 | Developing | Developing | NO |
| AI | 10 | 18 | Weak | Weak | NO |
| Talent | 55 | 59 | Competitive | Competitive | NO |
| Credential | 40 | 44 | Developing | Developing | NO |

**No thresholds crossed in Q1 (expected for test case).**

### 6.3 Execution Alignment Score

**Formula (from engine.ts, Lines 210–212):**
```typescript
function calculateExecutionAlignment(
  allocation: Allocation,
  roleVotes: Record<string, 'yes' | 'no' | 'abstain'>,
  override: boolean,
  dissents: string[]
): number {
  let score = 60;  // Base
  
  const yesVotes = Object.values(roleVotes).filter(v => v === 'yes').length;
  const totalVotes = Object.values(roleVotes).filter(v => v !== 'abstain').length;
  
  if (yesVotes === totalVotes) score += 15;        // Unanimous
  else if (yesVotes >= totalVotes - 1) score += 8; // Broad alignment (1 dissent)
  else if (yesVotes >= Math.floor(totalVotes / 2)) score += 3; // Debate (50%+)
  
  if (override) score -= 10;  // Override penalty
  
  return Math.min(100, score);
}
```

**Calculation:**
```
Base score: 60
YES votes: 4 (CEO, CFO, Product, Growth)
Total votes: 5 (all present)
Dissents: 1 (People)

yesVotes >= totalVotes - 1 → 4 >= 4 → TRUE
Bonus: +8 (Broad Alignment)

Override: NO
Override penalty: −0

Final execution score: 60 + 8 = 68
```

### 6.4 Alignment Multiplier

**Formula (from engine.ts, Lines 201–209):**
```typescript
function getAlignmentMultiplier(executionAlignment: number): number {
  if (executionAlignment >= 80) return 1.1;   // Exceptional
  if (executionAlignment >= 65) return 1.05;  // Strong alignment ← APPLIES
  if (executionAlignment >= 45) return 1.0;   // Acceptable
  if (executionAlignment >= 30) return 0.92;  // Weak
  return 0.85;                                 // Very weak
}
```

**Calculation:**
```
Execution score: 68
68 >= 65? YES
Multiplier: 1.05×
```

### 6.5 Q1 Revenue Calculation

**Formula (from engine.ts, Lines 214–230):**
```typescript
const baseMarketTailwind = 1.02;  // +2%
let q1Revenue = currentState.revenue * baseMarketTailwind;

// Consumer allocation creates near-term revenue
const consumerRevenueLift = (allocation.consumerGrowth / 30) * 
                             (newCapabilities.consumer / 100) * 0.05;
q1Revenue += q1Revenue * consumerRevenueLift;

// Enterprise has small current-quarter pipeline benefit
if (allocation.enterpriseSales > 0 && newCapabilities.enterprise >= 45) {
  const enterpriseLift = (allocation.enterpriseSales / 30) * 0.02;
  q1Revenue += q1Revenue * enterpriseLift;
}

// Apply alignment multiplier
const alignmentMultiplier = getAlignmentMultiplier(executionAlignment);
q1Revenue = q1Revenue * alignmentMultiplier;
```

**Step-by-step:**

```
Starting revenue: $200M

Step 1: Market tailwind (+2%)
  $200M × 1.02 = $204M

Step 2: Consumer allocation revenue lift
  Allocation ratio: 4M / 30M = 0.1333
  Capability ratio: 59 / 100 = 0.59
  Effect: 0.1333 × 0.59 × 5% = 0.00393 = 0.393%
  Revenue boost: $204M × 0.00393 = $0.80M
  Running total: $204M + $0.80M = $204.80M

Step 3: Enterprise allocation check
  Enterprise spending: $4M > 0? YES
  Enterprise capability: 35 < 45? YES → Condition FALSE
  No enterprise revenue lift applied
  Running total: $204.80M

Step 4: Apply alignment multiplier (1.05×)
  $204.80M × 1.05 = $215.04M

Final Q1 Revenue: ~$215.0M
```

### 6.6 Operating Profit

**Formula (from engine.ts, Lines 232–234):**
```typescript
const q1OpCost = currentState.operatingCost;  // Simplified: same as baseline
const q1OpProfit = q1Revenue - q1OpCost;
```

**Calculation:**
```
Operating cost: $170M (unchanged in Q1)
Operating profit: $215.0M - $170M = $45.0M
```

### 6.7 Closing Cash

**Formula (from engine.ts, Lines 236–241):**
```typescript
const strategicSpend = allocation.consumerGrowth + allocation.enterpriseSales + 
                       allocation.aiProduct + allocation.instructorPeople + 
                       allocation.universityCredential;
const retainedCash = allocation.cash;
const q1ClosingCash = currentState.cash + q1OpProfit - strategicSpend + retainedCash;
```

**Calculation:**
```
Strategic spend: 4 + 4 + 6 + 4 + 4 = $22M
Retained cash: $8M (not spent)

Closing cash: $60M (starting) + $45.0M (op profit) - $22M (spend) + $8M (retained)
             = $60M + $45M - $22M + $8M
             = $91M
```

### 6.8 Stock Price Change

**Formula (from engine.ts, Lines 243–252):**
```typescript
const growthVsExpectation = (q1Revenue - currentState.revenue) / currentState.revenue;
const stockChangeFromGrowth = growthVsExpectation * 0.35 * 100;

const marginChange = (q1OpProfit / q1Revenue) - 
                     (currentState.operatingProfit / currentState.revenue);
const stockChangeFromMargin = marginChange * 0.30 * 100;

const stockChangeFromAlignment = (executionAlignment - 60) * 0.15;

let stockPriceChange = stockChangeFromGrowth + stockChangeFromMargin + stockChangeFromAlignment;
stockPriceChange = Math.max(-15, Math.min(15, stockPriceChange)); // Cap at ±15%
```

**Step-by-step:**

```
Step 1: Growth vs expectation (35% weight)
  Growth: ($215.0M - $200M) / $200M = 0.075 = 7.5%
  Stock impact: 0.075 × 0.35 × 100 = 2.625 points

Step 2: Margin change (30% weight)
  Q1 margin: $45.0M / $215.0M = 0.2093 = 20.93%
  Baseline margin: $30M / $200M = 0.15 = 15.0%
  Change: 0.2093 - 0.15 = 0.0593 = 5.93%
  Stock impact: 0.0593 × 0.30 × 100 = 1.779 points

Step 3: Alignment (15% weight)
  Alignment score: 68
  Base alignment: 60
  Change: (68 - 60) × 0.15 = 8 × 0.15 = 1.2 points

Step 4: Total before cap
  2.625 + 1.779 + 1.2 = 5.604 points

Step 5: Apply cap (±15)
  5.604 is within ±15? YES
  No adjustment

Final stock price change: +5.6 points (or +5.6%)
New stock price: $100.00 + $5.60 = $105.60
```

### 6.9 Culture Impact

**Formula (from engine.ts, Lines 188–189):**
```typescript
if (allocation.instructorPeople > 0) {
  const cultureGain = effectiveInstructor * 0.3;
  newCapabilities.culture = Math.min(100, currentState.culture + cultureGain);
}
```

**Calculation:**
```
Effective instructor spend: 4.0M
Culture gain: 4.0 × 0.3 = 1.2 points
New culture: 72 + 1.2 = 73.2 ≈ 73
```

### 6.10 Product Quality

**Current code (engine.ts):** No modification to productQuality in calculateQ1Consequence().

```
Expected product quality: 70 (unchanged from baseline)
```

### 6.11 Trust

**Current code (engine.ts):** No modification to trust in calculateQ1Consequence().

```
Expected trust: 70 (unchanged from baseline)
```

---

## 7. SUMMARY: EXPECTED Q1 NUMERICAL OUTPUTS (CORRECTED)

| Metric | Starting | Ending | Change | Formula/Source |
|--------|----------|--------|--------|-----------------|
| **Revenue** | $200.0M | $215.0M | +$15.0M | Base +2% + consumer lift + alignment 1.05× |
| **Operating Profit** | $30.0M | $45.0M | +$15.0M | $215.0M − $170M |
| **Cash** | $60.0M | $91.0M | +$31.0M | $60M + $45M − $22M spend + $8M retained |
| **Stock Price** | $100.00 | $105.60 | +$5.60 | Growth +2.625 + margin +1.779 + alignment +1.2 |
| **Product Quality** | 70 | 70 | — | Not modified in Q1 |
| **Culture** | 72 | 73 | +1 | People spend $4M × 0.3 = +1.2 → 73 |
| **Trust** | 70 | 70 | — | Not modified in Q1 |
| | | | | |
| **Consumer Capability** | 55 | 59 | +4 | 4.0M effective × 1.0 |
| **Enterprise Capability** | 30 | 35 | +5 | 4.0M effective × 1.2 = 4.8 → 35 |
| **AI Capability** | 10 | 18 | +8 | 5.8M effective × 1.3 = 7.54 → 18 |
| **Talent Capability** | 55 | 59 | +4 | 4.0M effective × 1.0 |
| **Credential Capability** | 40 | 44 | +4 | 4.0M effective × 1.0 |
| **CustomerSuccess Capability** | 30 | 30 | — | Not modified in Q1 |
| **Execution Score** | 60 | 68 | +8 | Base 60 + broad alignment +8 |

---

## 8. COMPARISON: LOCKED SPECIFICATION vs. CORRECTED IMPLEMENTATION

### 8.1 Allocation Categories

| Locked Spec | Implementation | Status |
|-------------|----------------|--------|
| Consumer Growth | consumerGrowth | ✅ Match |
| Enterprise | enterpriseSales | ✅ Match (renamed) |
| AI & Technology | aiProduct | ✅ Match (renamed) |
| Instructor / People | instructorPeople | ✅ Match (renamed) |
| University / Credentials | universityCredential | ✅ Match (renamed) |
| Cash Reserve | cash | ✅ Match |
| **Customer Success** | **customerSuccess (Q1)** | ❌ **Mismatch: Should NOT be in Q1** |
| **Marketing** | **marketing (Q1)** | ❌ **Mismatch: Should NOT be in Q1** |

**Action taken:** Remove customerSuccess and marketing from Q1 BetScreen (see Section 4).

### 8.2 Formulas

All core formulas implemented match locked specification:

| Formula | Locked Spec | Implementation | Status |
|---------|-------------|-----------------|--------|
| Diminishing returns | ✅ Specified | ✅ engine.ts Lines 61–72 | ✓ Match |
| Capability multipliers | ✅ Specified | ✅ engine.ts Lines 88–98 | ✓ Match |
| Execution alignment score | ✅ Specified | ✅ engine.ts Lines 210–212 | ✓ Match |
| Alignment multiplier | ✅ Specified | ✅ engine.ts Lines 201–209 | ✓ Match |
| Revenue model (tailwind + allocation + alignment) | ✅ Specified | ✅ engine.ts Lines 214–230 | ✓ Match |
| Stock price calculation | ✅ Specified | ✅ engine.ts Lines 243–252 | ✓ Match |
| Capability thresholds | ✅ Specified | ✅ engine.ts Lines 74–101 | ✓ Match |
| Culture gain from people spend | ✅ Specified | ✅ engine.ts Lines 188–189 | ✓ Match |

**No formula discrepancies after correction.**

---

## 9. FILES TO MODIFY

1. **`/mnt/project/src/components/quarters/BetScreen.tsx`**
   - Remove customerSuccess and marketing from categories array (Section 4.1)
   - Update default allocation to set both to 0 and adjust cash upward

2. **`/mnt/project/src/simulation/engine.ts`**
   - Add Q1 enforcement check (lines 147–155)
   - Comment out/remove customerSuccess processing block (lines 202–208)
   - Simplify strategicSpend total (lines 237–239)

3. **`/mnt/project/PASS_1_EXECUTABLE_VALIDATION.md`**
   - Update Section 2 (fixed test case) with corrected 6-category allocation
   - Update Section 3 (calculation trace) with all corrected formulas
   - Update expected Q1 outputs summary
   - Update Section 4 (run prototype) to reflect 6 categories

4. **`/mnt/project/PASS_1_SUMMARY.md`** (if it references allocation categories)
   - Update to reflect locked 6-category design

---

## 10. FINAL CHECKLIST

After changes are applied, verify:

- [ ] BetScreen shows exactly 6 allocation categories (no Customer Success, no Marketing)
- [ ] Default allocation enforces 6 categories only
- [ ] engine.ts calculateQ1Consequence() rejects allocation if CS or Marketing > 0
- [ ] engine.ts does not process CS capability in Q1
- [ ] Strategic spend total only includes 5 categories (excludes CS and marketing)
- [ ] Validation guide updated with corrected allocation and calculations
- [ ] Expected Q1 outputs match corrected trace (Revenue ~$215.0M, Cash ~$91M, etc.)
- [ ] Git commits record both the correction and the reconciliation report

---

**END OF RECONCILIATION REPORT**

**Status:** READY FOR IMPLEMENTATION  
**Blocks:** None; changes are isolated to Q1 setup and BetScreen  
**Next Step:** Apply changes from Section 4, update validation guide (Section 3), commit with reconciliation reference

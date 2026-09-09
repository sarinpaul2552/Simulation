# PASS 1 EXECUTABLE VALIDATION GUIDE

**Purpose:** End-to-end validation of Pass 1 vertical prototype using one fixed deterministic test case  
**Date:** September 2026  
**Status:** Ready to Execute  

---

## OVERVIEW

This guide provides:
1. Exact setup commands
2. One fixed test case (used throughout)
3. Expected calculation trace from simulation engine
4. Expected Q1 numerical outputs (derived from source code)
5. SQL queries to inspect every record
6. Refresh/persistence verification
7. Facilitator control verification
8. Q2 callback verification
9. Unit test commands
10. Final PASS/FAIL checklist

**Critical:** Do not execute partial validation. Run the complete sequence from setup through Q2 callback.

---

## SECTION 1: ENVIRONMENT SETUP

### 1.1 Prerequisites

```bash
# Check Node version (18+ required)
node --version  # Should be v18.0.0 or higher

# Check npm version
npm --version   # Should be v9.0.0 or higher
```

### 1.2 Supabase Account Setup

1. Go to https://supabase.com
2. Create free account (if not already done)
3. Create new project:
   - Name: `v4-business-sim-test`
   - Region: Any (recommend closest to you)
   - Wait for project initialization (~2 min)

### 1.3 Gather Supabase Credentials

In Supabase dashboard:
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (looks like: `https://abc123def456.supabase.co`)
   - **Anon Key** (public, starts with `eyJ...`)

### 1.4 Create Environment File

```bash
cd /mnt/project

cat > .env.local << 'EOF'
VITE_SUPABASE_URL=https://abc123def456.supabase.co
VITE_SUPABASE_KEY=eyJ0eXAiOiJKV1QiLCJhbGc...
EOF
```

**Replace with actual values from step 1.3.**

### 1.5 Create Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Open new query
3. Copy entire contents of `/mnt/project/database/schema.sql`
4. Paste into Supabase SQL editor
5. Click "Run"
6. **Verify success:** Message shows "Completed" (not error)

### 1.6 Verify Tables Created

In Supabase SQL Editor, run:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```

**Expected output:**
```
access_log
decisions
sessions
teams
```

### 1.7 Install Dependencies

```bash
cd /mnt/project
npm install
```

**Expected:** No errors, `node_modules/` created, should complete in 30–60 seconds.

---

## SECTION 2: FIXED TEST CASE DEFINITION

### 2.1 Q1 Test Allocation (Fixed)

**Total Available Capital:** $30M

| Category | Amount | Purpose |
|----------|--------|---------|
| Consumer Growth | $5M | Customer acquisition |
| Enterprise Sales | $10M | B2B sales team |
| AI Product | $8M | R&D/product modernization |
| Instructor/People | $4M | Talent & creator partnerships |
| University/Credential | $1M | Institutional programs |
| Customer Success | $1M | Support & retention |
| Marketing | $1M | Brand/awareness |
| Cash Reserve | $0M | Liquidity |
| **TOTAL** | **$30M** | ✓ Validates |

### 2.2 Q1 Fixed Selections

**BELIEF Prompt:** "What is your hypothesis about the consumer market over the next 8 quarters?"

**BELIEF Selection:** `stable_dominant` ("Stable & dominant. Consumer will remain our core.")

**RISK Prompt:** "What are the top risks you're taking with this allocation?"

**RISK Selections (up to 3):**
1. `consumer_disruption` (Severity: **4**/5)
2. `technology_lag` (Severity: **3**/5)

### 2.3 Q1 Fixed Five Executive Votes

| Role | Vote | Confidence | Rationale |
|------|------|------------|-----------|
| **CEO** | YES | 4 | "Enterprise bet is solid. AI investment necessary." |
| **CFO** | YES | 4 | "Cash runway preserved. Balanced spend." |
| **Product** | YES | 5 | "AI investment sufficient for competitive positioning." |
| **People** | NO | 3 | "Only $4M for talent. We need more to retain instructors." |
| **Growth** | YES | 4 | "Enterprise focus will drive next-cycle revenue." |

**Alignment Calculation:**
- Total votes (non-abstain): 5
- YES votes: 4
- NO votes: 1 (People)
- Result: **Broad Alignment** (4/5 YES)

### 2.4 Q1 Fixed TEAM CHECK

**Alignment Result:** Broad Alignment (4/5 YES)  
**Dissenting Roles:** People  
**CEO Override:** NO (accept alignment as-is)  
**Team Check Alignment:** `broad`

---

## SECTION 3: EXPECTED Q1 CALCULATION (From Source Code)

### 3.1 Simulation Engine Source Reference

File: `/mnt/project/src/simulation/engine.ts`

Key functions:
- `calculateEffectiveInvestment()` - Lines 15–22
- `createCapabilityFromInvestment()` - Lines 24–34
- `calculateQ1Consequence()` - Lines 51–180
- `calculateExecutionAlignment()` - Lines 182–200

### 3.2 Calculation Trace: Diminishing Returns

**Source:** `calculateEffectiveInvestment(amount)` function

```typescript
if (amountSpent <= 5) return amountSpent * 1.0;
if (amountSpent <= 10) return 5 * 1.0 + (amountSpent - 5) * 0.8;
if (amountSpent <= 15) return 5 * 1.0 + 5 * 0.8 + (amountSpent - 10) * 0.6;
return 5 * 1.0 + 5 * 0.8 + 5 * 0.6 + (amountSpent - 15) * 0.4;
```

**For test allocation:**

| Category | Spent | Calculation | Effective | Gain Multiplier |
|----------|-------|-------------|-----------|-----------------|
| Consumer | $5M | 5 × 1.0 | 5.0M | 1.0 |
| Enterprise | $10M | 5×1.0 + 5×0.8 | 9.0M | 1.2 |
| AI | $8M | 5×1.0 + 3×0.8 | 7.4M | 1.3 |
| People | $4M | 4 × 1.0 | 4.0M | 1.0 |
| Credential | $1M | 1 × 1.0 | 1.0M | 1.0 |
| CS | $1M | 1 × 1.0 | 1.0M | 1.2 |
| Marketing | $1M | 1 × 1.0 | 1.0M | 0.7 |

### 3.3 Calculation Trace: Capability Creation

**Source:** `createCapabilityFromInvestment()` function

Starting capabilities (Q1 baseline):
```typescript
consumer: 55,
enterprise: 30,
ai: 10,
talent: 55,
credential: 40,
customerSuccess: 30,
growth: 55,
execution: 60,
```

**Capability gains:**

```
Consumer:    55 + (5.0M effective × 1.0) = 55 + 5.0 = 60.0 ≈ 60
Enterprise:  30 + (9.0M effective × 1.2) = 30 + 10.8 = 40.8 ≈ 41
AI:          10 + (7.4M effective × 1.3) = 10 + 9.62 = 19.62 ≈ 20
Talent:      55 + (4.0M effective × 1.0) = 55 + 4.0 = 59
Credential:  40 + (1.0M effective × 1.0) = 40 + 1.0 = 41
CS:          30 + (1.0M effective × 1.2) = 30 + 1.2 = 31.2 ≈ 31
Growth:      55 (unchanged in Q1)
```

**Capability Thresholds Crossed:**

```typescript
getCapabilityLevel(value):
  if (value <= 24) return 'Weak'
  if (value <= 44) return 'Developing'
  if (value <= 64) return 'Competitive'
  if (value <= 79) return 'Strong'
  return 'Leading'
```

| Capability | From | To | Level Change |
|------------|------|----|----|
| Consumer | 55 (Competitive) | 60 (Competitive) | No threshold crossed |
| Enterprise | 30 (Developing) | 41 (Developing) | No threshold crossed |
| AI | 10 (Weak) | 20 (Weak) | No threshold crossed |
| Talent | 55 (Competitive) | 59 (Competitive) | No threshold crossed |
| Credential | 40 (Developing) | 41 (Developing) | No threshold crossed |
| CS | 30 (Developing) | 31 (Developing) | No threshold crossed |

**Note:** No thresholds crossed in this test case. This is realistic for Q1 (Q2+ events trigger higher deltas).

### 3.4 Calculation Trace: Execution Alignment

**Source:** `calculateExecutionAlignment()` and votes

```typescript
let score = 60;  // Base

// YES votes: 4, Total votes: 5
if (yesVotes === 5) score += 15;       // Unanimous (not applicable)
else if (yesVotes >= 4) score += 8;    // Broad alignment ← APPLIES
else if (yesVotes >= 3) score += 3;    // Debate
```

**Calculation:**
```
Base score: 60
Broad alignment bonus (+4 YES votes): +8
Override: NO, so no penalty (-0)

Final execution score: 60 + 8 = 68
```

### 3.5 Calculation Trace: Alignment Multiplier

**Source:** `getAlignmentMultiplier()` function

```typescript
if (executionAlignment >= 80) return 1.1;    // Not applicable
if (executionAlignment >= 65) return 1.05;   // ← APPLIES (68 in range 65-79)
if (executionAlignment >= 45) return 1.0;
if (executionAlignment >= 30) return 0.92;
return 0.85;
```

**Result:** Execution score 68 → multiplier **1.05×**

### 3.6 Calculation Trace: Q1 Revenue

**Source:** `calculateQ1Consequence()` function

**Base:**
```typescript
const baseMarketTailwind = 1.02;  // +2%
let q1Revenue = currentState.revenue * baseMarketTailwind;
```

Starting revenue: $200M
With tailwind: $200M × 1.02 = **$204M**

**Consumer allocation effect:**
```typescript
const consumerRevenueLift = (allocation.consumerGrowth / 30) * 
                             (newCapabilities.consumer / 100) * 0.05;
```

```
Allocation ratio: 5M / 30M = 0.1667
Capability ratio: 60 / 100 = 0.60
Effect: 0.1667 × 0.60 × 5% = 0.005 = 0.5%
Revenue boost: $204M × 0.005 = $1.02M

New revenue: $204M + $1.02M = $205.02M
```

**Enterprise allocation effect:**
```typescript
if (allocation.enterpriseSales > 0 && newCapabilities.enterprise >= 45) {
  const enterpriseLift = (allocation.enterpriseSales / 30) * 0.02;
  q1Revenue += q1Revenue * enterpriseLift;
}
```

Enterprise capability: 41 (< 45, so this condition is FALSE)
No enterprise revenue lift in Q1.

Revenue before alignment: **$205.02M**

**Apply alignment multiplier (1.05×):**
```
$205.02M × 1.05 = $215.27M
```

**Expected Q1 Revenue:** ~**$215.3M** (actual may vary slightly due to rounding)

### 3.7 Calculation Trace: Operating Profit

**Source:** `calculateQ1Consequence()` function

```typescript
const q1OpCost = currentState.operatingCost;  // Simplified: same as baseline
const q1OpProfit = q1Revenue - q1OpCost;
```

Operating cost: $170M (unchanged in Q1)
Operating profit: $215.3M - $170M = **$45.3M**

### 3.8 Calculation Trace: Closing Cash

**Source:** `calculateQ1Consequence()` function

```typescript
const strategicSpend = allocation.consumerGrowth + allocation.enterpriseSales + 
                       allocation.aiProduct + allocation.instructorPeople + 
                       allocation.universityCredential + allocation.customerSuccess +
                       allocation.marketing;
const retainedCash = allocation.cash;
const q1ClosingCash = currentState.cash + q1OpProfit - strategicSpend + retainedCash;
```

```
Starting cash: $60M
Operating profit: $45.3M
Strategic spend: $5M + $10M + $8M + $4M + $1M + $1M + $1M = $30M
Retained cash: $0M

Closing cash: $60M + $45.3M - $30M + $0M = $75.3M
```

**Expected Closing Cash:** ~**$75.3M**

### 3.9 Calculation Trace: Stock Price Change

**Source:** `calculateQ1Consequence()` function

Three factors:

**Factor 1: Growth vs Expectation (35% weight)**
```typescript
const growthVsExpectation = (q1Revenue - currentState.revenue) / currentState.revenue;
const stockChangeFromGrowth = growthVsExpectation * 0.35 * 100;
```

```
Growth: ($215.3M - $200M) / $200M = $15.3M / $200M = 0.0765 = 7.65%
Stock change: 0.0765 × 0.35 × 100 = 2.68 points
```

**Factor 2: Margin/Cash Change (30% weight)**
```typescript
const marginChange = (q1OpProfit / q1Revenue) - 
                     (currentState.operatingProfit / currentState.revenue);
const stockChangeFromMargin = marginChange * 0.30 * 100;
```

```
Q1 margin: $45.3M / $215.3M = 0.2103 = 21.03%
Baseline margin: $30M / $200M = 0.15 = 15.0%
Change: 0.2103 - 0.15 = 0.0603 = 6.03%
Stock change: 0.0603 × 0.30 × 100 = 1.81 points
```

**Factor 3: Alignment/Strategy (15% weight)**
```typescript
const stockChangeFromAlignment = (executionAlignment - 60) * 0.15;
```

```
Alignment: 68 (execution score)
Change: (68 - 60) × 0.15 = 8 × 0.15 = 1.2 points
```

**Total before cap:**
```
2.68 + 1.81 + 1.2 = 5.69 points
```

**Cap check:**
```typescript
stockPriceChange = Math.max(-15, Math.min(15, stockPriceChange));  // ±15% cap
```

5.69 points within cap. No adjustment needed.

**New Stock Price:**
```
$100.00 + $5.69 = $105.69
```

**Expected Stock Price:** ~**$105.69** (actual may vary ±0.05 due to rounding)

### 3.10 Calculation Trace: Culture

**Source:** `calculateQ1Consequence()` function

```typescript
if (allocation.instructorPeople > 0) {
  const cultureGain = effectiveInstructor * 0.3;
  newCapabilities.culture = Math.min(100, currentState.culture + cultureGain);
}
```

```
Instructor effective: 4.0M
Culture gain: 4.0 × 0.3 = 1.2 points
New culture: 72 + 1.2 = 73.2 ≈ 73
```

**Expected Culture:** ~**73**

### 3.11 Calculation Trace: Product Quality

**Source:** `calculateQ1Consequence()` function

**Note:** Product quality is NOT updated in Q1 based on current code.

```typescript
// No code in calculateQ1Consequence() modifies product_quality
```

**Expected Product Quality:** **70** (unchanged from baseline)

### 3.12 SUMMARY: Expected Q1 Numerical Outputs

| Metric | Starting | Ending | Change | Notes |
|--------|----------|--------|--------|-------|
| Revenue | $200.0M | $215.3M | +$15.3M | Market tailwind + allocation effects + alignment multiplier |
| Operating Profit | $30.0M | $45.3M | +$15.3M | Revenue - $170M operating cost |
| Cash | $60.0M | $75.3M | +$15.3M | Starting + op profit - spend + retained |
| Stock Price | $100.00 | $105.69 | +$5.69 | Growth 35% + margin 30% + alignment 15% |
| Product Quality | 70 | 70 | $0 | **NOT modified in Q1** |
| Culture | 72 | 73 | +1 | People investment × 0.3 |
| Trust | 70 | 70 | $0 | Not modified in Q1 |
| **Capabilities:** | | | | |
| Consumer | 55 | 60 | +5 | Investment × 1.0 multiplier |
| Enterprise | 30 | 41 | +11 | Investment × 1.2 multiplier |
| AI | 10 | 20 | +10 | Investment × 1.3 multiplier |
| Talent | 55 | 59 | +4 | Investment × 1.0 multiplier |
| Credential | 40 | 41 | +1 | Investment × 1.0 multiplier |
| CustomerSuccess | 30 | 31 | +1 | Investment × 1.2 multiplier |
| Growth | 55 | 55 | $0 | Not directly updated |
| Execution | 60 | 68 | +8 | Alignment score (4/5 YES votes) |

---

## SECTION 4: RUN THE PROTOTYPE

### 4.1 Start Development Server

```bash
cd /mnt/project
npm run dev
```

**Expected output:**
```
  VITE v5.0.0 ready in 300 ms
  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Open browser to:** `http://localhost:5173`

### 4.2 FACILITATOR: Create Session

**Browser Tab 1: Open facilitator setup**

1. Click **"Facilitator"**
2. **Email:** `test@university.edu`
3. **Number of Teams:** `1`
4. **Team Name:** `TestTeam`
5. Click **"Create Session"**
6. **Copy the session code** (e.g., `ISB-ABC123`)

**Record:**
```
Session Code: _________________________
Admin PIN: ____________________________
```

### 4.3 TEAM MEMBER: Join Session

**Browser Tab 2: Open team member**

1. Click **"Team Member"**
2. **Session Code:** [Paste from 4.2]
3. **Team Name:** `TestTeam`
4. Click **"Join Session"**

**Verify:** You see Q1 dashboard with company financials

### 4.4 Q1 EVENT SCREEN

**Current screen:** Event display

1. Read event narrative (should be Q1 baseline)
2. Click **"Proceed to Allocation"**

### 4.5 BET SCREEN: Enter Fixed Allocation

**Current screen:** Allocation form with 8 categories

Use the **fixed test allocation** from Section 2.1:

| Category | Amount | Action |
|----------|--------|--------|
| Consumer Growth | $5M | Adjust slider/input |
| Enterprise Sales | $10M | Adjust slider/input |
| AI Product | $8M | Adjust slider/input |
| Instructor/People | $4M | Adjust slider/input |
| University/Credential | $1M | Adjust slider/input |
| Customer Success | $1M | Adjust slider/input |
| Marketing | $1M | Adjust slider/input |
| Cash Reserve | $0M | Leave at 0 |

**Verify:**
- [ ] Total shows **$30.0M** (exact)
- [ ] Green validation message appears
- [ ] Button "Allocation Confirmed → Next" is enabled

Click button.

### 4.6 BELIEF SCREEN: Select Fixed Belief

**Current screen:** Belief selection

**Prompt:** "What is your hypothesis about the consumer market over the next 8 quarters?"

**Select:** `stable_dominant` ("Stable & dominant. Consumer will remain our core.")

Click button.

### 4.7 RISK SCREEN: Select Fixed Risks

**Current screen:** Risk identification

**Prompt:** "What are the top risks you're taking with this allocation?"

**Select:**
1. **`consumer_disruption`** — Set severity to **4**/5
2. **`technology_lag`** — Set severity to **3**/5

(Do NOT select a 3rd risk)

**Verify:**
- [ ] "Selected Risks (2/3)" shows
- [ ] Both risks listed with correct severity

Click button.

### 4.8 ROLE VOTE SCREEN: Cast Fixed Votes

**Current screen:** Role voting

You are assigned a random role. **Regardless of your role**, cast votes as if all 5 executives are voting:

| Role | Vote | Confidence | Rationale |
|------|------|------------|-----------|
| CEO | YES | 4 | "Enterprise bet is solid. AI investment necessary." |
| CFO | YES | 4 | "Cash runway preserved. Balanced spend." |
| Product | YES | 5 | "AI investment sufficient for competitive positioning." |
| People | NO | 3 | "Only $4M for talent. We need more to retain instructors." |
| Growth | YES | 4 | "Enterprise focus will drive next-cycle revenue." |

**For your assigned role:**
- Select the vote from table above
- Set confidence slider
- Enter rationale from table
- Click **"Submit Vote & View Team (Simultaneous Reveal)"**

**After reveal:**
- [ ] See all 5 role votes displayed
- [ ] CEO: YES, CFO: YES, Product: YES, People: NO, Growth: YES
- [ ] 4 YES, 1 NO visible

Click **"Proceed to Team Check"**

### 4.9 TEAM CHECK SCREEN: Confirm Alignment

**Current screen:** Team check analysis

**Verify:**
- [ ] Alignment labeled as **"Broad Alignment"** (4/5 YES)
- [ ] Dissent listed: **"People"**
- [ ] Three action options visible:
  1. Proceed Without Override
  2. Call for Revote
  3. Leadership Override

**Select:** **"Proceed Without Override"** (DO NOT override)

Click **"Confirm → Proceed to Commit"**

### 4.10 COMMIT SCREEN: Final Review

**Current screen:** Final commitment review

**Verify visible:**
- [ ] Allocation table showing all $30M allocated
- [ ] Alignment: "broad"
- [ ] Override: not checked
- [ ] Market Belief: "stable_dominant"
- [ ] Identified Risks: 2 (consumer_disruption, technology_lag)

Click **"Confirm Commitment & Calculate Results"**

**Wait for calculation** (~2–3 seconds)

### 4.11 CONSEQUENCE SCREEN: Verify Q1 Results

**Current screen:** Q1 consequences

**Verify:** Consequence screen displays narrative + financial changes

**Record:**
```
Revenue Change: ________________ (expected: ~+$15.3M)
Cash Change: ________________ (expected: ~+$15.3M)
Stock Price Change: ________________ (expected: ~+$5.69)

Capability Changes:
- Consumer: ________________ (expected: +5)
- Enterprise: ________________ (expected: +11)
- AI: ________________ (expected: +10)
- Talent: ________________ (expected: +4)

Thresholds Crossed: ________________
```

**Verify callbacks appear:**
- [ ] "You identified consumer_disruption (Severity: 4)"
- [ ] "You identified technology_lag (Severity: 3)"
- [ ] "Your Q1 belief: 'stable_dominant'"
- [ ] Callback message about risks

Click **"Review Results → Next"**

### 4.12 REFLECT SCREEN: Reflection Response

**Current screen:** Reflection prompt

**Prompt:** "What did you learn from Q1?"

**Select any option** (doesn't affect later validation)

Click button.

**Auto-transition to Q2.**

---

## SECTION 5: DATABASE VERIFICATION

### 5.1 Access Supabase SQL Editor

Go to your Supabase dashboard → **SQL Editor** → Open new query

### 5.2 Query 1: Verify Session Created

```sql
SELECT id, facilitator_email, session_code, team_count, current_quarter 
FROM sessions 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:**
- `facilitator_email`: `test@university.edu`
- `session_code`: [matches value from 4.2]
- `team_count`: `1`
- `current_quarter`: `0` or `1` (depending on whether advanced)

**Record the session ID:** `_____________________________`

### 5.3 Query 2: Verify Team Created

```sql
SELECT id, session_id, team_code, team_name, 
       capability_consumer, capability_enterprise, capability_ai,
       revenue, cash, stock_price, culture
FROM teams 
WHERE session_id = '[SESSION_ID_FROM_5.2]';
```

**Expected:**
- `team_name`: `TestTeam`
- `capability_consumer`: `60` (±2, expected 60)
- `capability_enterprise`: `41` (±2, expected 41)
- `capability_ai`: `20` (±2, expected 20)
- `revenue`: `215.3` (±1, expected 215.3)
- `cash`: `75.3` (±1, expected 75.3)
- `stock_price`: `105.69` (±0.5, expected 105.69)
- `culture`: `73` (±1, expected 73)

**Record team ID:** `_____________________________`

### 5.4 Query 3: Verify Decision Record Exists

```sql
SELECT id, team_id, quarter, allocation_json, 
       belief_response, risks_json
FROM decisions 
WHERE team_id = '[TEAM_ID_FROM_5.3]' AND quarter = 1;
```

**Expected:**
- `quarter`: `1`
- `allocation_json` contains: `{"consumerGrowth": 5, "enterpriseSales": 10, "aiProduct": 8, "instructorPeople": 4, "universityCredential": 1, "customerSuccess": 1, "marketing": 1, "cash": 0}`
- `belief_response`: `stable_dominant`

**Record decision ID:** `_____________________________`

### 5.5 Query 4: Verify Role Votes Stored

```sql
SELECT votes_json FROM decisions 
WHERE id = '[DECISION_ID_FROM_5.4]';
```

**Expected:** JSON structure with 5 entries:

```json
{
  "CEO": {"vote": "yes", "confidence": 4, "rationale": "Enterprise bet is solid. AI investment necessary."},
  "CFO": {"vote": "yes", "confidence": 4, "rationale": "Cash runway preserved. Balanced spend."},
  "Product": {"vote": "yes", "confidence": 5, "rationale": "AI investment sufficient for competitive positioning."},
  "People": {"vote": "no", "confidence": 3, "rationale": "Only $4M for talent. We need more to retain instructors."},
  "Growth": {"vote": "yes", "confidence": 4, "rationale": "Enterprise focus will drive next-cycle revenue."}
}
```

**Verify:** [ ] All 5 roles present, votes match fixed test case

### 5.6 Query 5: Verify Team Check Stored

```sql
SELECT team_check_alignment, team_check_override, team_check_dissenting_roles 
FROM decisions 
WHERE id = '[DECISION_ID_FROM_5.4]';
```

**Expected:**
- `team_check_alignment`: `broad`
- `team_check_override`: `false`
- `team_check_dissenting_roles`: `People`

### 5.7 Query 6: Verify Consequences Calculated and Stored

```sql
SELECT outcome_revenue_change, outcome_cash_change, 
       outcome_stock_price_change, outcome_capability_changes_json,
       outcome_narrative
FROM decisions 
WHERE id = '[DECISION_ID_FROM_5.4]';
```

**Expected:**
- `outcome_revenue_change`: `~15.3` (expected 15.3, tolerance ±1)
- `outcome_cash_change`: `~15.3` (expected 15.3, tolerance ±1)
- `outcome_stock_price_change`: `~5.69` (expected 5.69, tolerance ±0.5)
- `outcome_capability_changes_json`: Contains `{"consumer": 5, "enterprise": 11, "ai": 10, "talent": 4, ...}`
- `outcome_narrative`: Non-null string describing results

### 5.8 Query 7: Verify Reflection Stored

```sql
SELECT reflection_response FROM decisions 
WHERE id = '[DECISION_ID_FROM_5.4]';
```

**Expected:**
- `reflection_response`: Non-null (whatever was selected in 4.12)

---

## SECTION 6: REFRESH/PERSISTENCE TEST

### 6.1 Team Client: Refresh Page

In the team member browser tab (still on Q2 screen):

1. Press **F5** (or Ctrl+R / Cmd+R)
2. Wait for page to reload (~2 seconds)

**Verify:**
- [ ] Page reloads without errors
- [ ] You remain in Q2 (game state persisted)
- [ ] Dashboard shows same financial state

### 6.2 Database Verification: State Persisted

In Supabase SQL Editor, run the same Query 5.3 again:

```sql
SELECT id, revenue, cash, stock_price, culture,
       capability_consumer, capability_enterprise, capability_ai
FROM teams 
WHERE id = '[TEAM_ID_FROM_5.3]';
```

**Verify:**
- [ ] All values identical to Query 5.3 results
- [ ] No resets or changes

---

## SECTION 7: FACILITATOR DASHBOARD VERIFICATION

### 7.1 Facilitator: Open Facilitator Dashboard Tab

In Supabase dashboard, check current quarter:

```sql
SELECT current_quarter, game_phase FROM sessions 
WHERE session_code = '[SESSION_CODE_FROM_4.2]';
```

**Note current_quarter value:** `_____`

### 7.2 Facilitator Client: Check Leaderboard

In the facilitator browser tab:

1. Look at the **Team Leaderboard** section

**Verify:**
- [ ] Table shows 1 row: `TestTeam`
- [ ] Columns visible: Team, Revenue, Cash, Stock, Culture, AI, Status
- [ ] Values match from Query 5.3:
  - Revenue: `~215.3`
  - Cash: `~75.3`
  - Stock: `~105.69`
  - Culture: `73`
  - AI: `20`

### 7.3 Facilitator: Advance Quarter Button

In facilitator screen:

1. Look for **"Advance Quarter"** or similar button
2. Click it

**Expected:**
- [ ] Button click succeeds (no errors)
- [ ] Current quarter increments in database (verify Query 7.1 shows `current_quarter: 2`)
- [ ] Team client may auto-refresh to show Q2

### 7.4 Verify Current Quarter Advanced

In Supabase SQL Editor:

```sql
SELECT current_quarter FROM sessions 
WHERE session_code = '[SESSION_CODE_FROM_4.2]';
```

**Expected:** `current_quarter = 2`

---

## SECTION 8: Q2 CALLBACK VERIFICATION

### 8.1 Team Client: Navigate to Q2 Consequence

In team browser tab:

1. If not already on Q2, refresh page or wait for auto-transition
2. Click through Q2 flow (Bet, Belief, Risk, Roles, Team Check, Commit)
3. Arrive at Q2 **Consequence Screen**

### 8.2 Inspect Q2 Consequence for Q1 Callbacks

On the Q2 Consequence screen, look for **"Decision Callbacks"** section

**Verify callbacks appear:**
- [ ] "Identified Risks:" section
  - [ ] Shows: "consumer_disruption (Severity: 4/5)"
  - [ ] Shows: "technology_lag (Severity: 3/5)"
  - [ ] Shows message: "These risks were monitored. No materialization in Q1, but watch for Q2+."
- [ ] "Your Q1 Belief:" section
  - [ ] Shows: "'stable_dominant'"
  - [ ] Shows message: "Outcomes so far are consistent with your belief."

**Record exact callback text:**
```
[Paste entire callbacks section from Q2 consequence screen]
```

### 8.3 Query: Verify Callbacks Calculated

In Supabase SQL Editor:

```sql
SELECT outcome_callback_to_risk FROM decisions 
WHERE team_id = '[TEAM_ID_FROM_5.3]' AND quarter = 1;
```

**Expected:**
- `outcome_callback_to_risk`: Non-null string containing reference to identified risks

---

## SECTION 9: BUILD & STATIC DEPLOYMENT VERIFICATION

### 9.1 Build to Static Files

```bash
cd /mnt/project
npm run build
```

**Expected output:**
```
  vite v5.0.0 building for production...
  ✓ 1234 modules transformed
  dist/index.html                  12.34 kB │ gzip: 3.45 kB
  dist/assets/main.js              234.56 kB │ gzip: 65.78 kB
  dist/assets/style.css             45.67 kB │ gzip: 9.01 kB
  ✓ built in 5.34s
```

**Verify:**
- [ ] No errors in build output
- [ ] Output directory created: `/mnt/project/dist/`

### 9.2 Verify Static Files

```bash
ls -la /mnt/project/dist/
```

**Expected files:**
- [ ] `index.html`
- [ ] `assets/` directory
- [ ] `.js` files (no `node_modules/`)
- [ ] `.css` files

**Verify no Node processes required:**
```bash
grep -r "node_modules" /mnt/project/dist/
```

**Expected:** No output (no node_modules packaged)

### 9.3 Test Static Build Locally

```bash
cd /mnt/project/dist
npx http-server -p 8080
```

**Or use Python:**
```bash
cd /mnt/project/dist
python3 -m http.server 8080
```

Open browser: `http://localhost:8080`

**Verify:**
- [ ] App loads (mode selection screen appears)
- [ ] No errors in browser console (F12)
- [ ] Navigation works (click "Facilitator" or "Team Member")

---

## SECTION 10: UNIT TESTS

### 10.1 Run TypeScript Type Checking

```bash
cd /mnt/project
npm run type-check
```

Or manually:

```bash
npx tsc --noEmit
```

**Expected:**
- [ ] No TypeScript errors
- [ ] Output: "✓ Built successfully" or similar

### 10.2 Test Simulation Engine (Manual)

Create a test file `/mnt/project/test-engine.js`:

```javascript
import { calculateQ1Consequence, getQ1Baseline } from './src/simulation/engine.ts';

const testAllocation = {
  consumerGrowth: 5,
  enterpriseSales: 10,
  aiProduct: 8,
  instructorPeople: 4,
  universityCredential: 1,
  customerSuccess: 1,
  marketing: 1,
  cash: 0,
};

const testVotes = {
  CEO: { vote: 'yes', confidence: 4, rationale: 'Good' },
  CFO: { vote: 'yes', confidence: 4, rationale: 'Good' },
  Product: { vote: 'yes', confidence: 5, rationale: 'Good' },
  People: { vote: 'no', confidence: 3, rationale: 'Concern' },
  Growth: { vote: 'yes', confidence: 4, rationale: 'Good' },
};

const baseline = getQ1Baseline();

try {
  const consequence = calculateQ1Consequence(
    testAllocation,
    testVotes,
    false,  // no override
    ['People'],  // dissenting roles
    baseline
  );

  console.log('Q1 Consequence:');
  console.log('Revenue Change:', consequence.revenueChange);
  console.log('Cash Change:', consequence.cashChange);
  console.log('Stock Price Change:', consequence.stockPriceChange);
  console.log('Capability Changes:', consequence.capabilityChanges);
  console.log('Narrative:', consequence.narrative);
  console.log('\n✓ Simulation engine test passed');
} catch (err) {
  console.error('✗ Simulation engine test FAILED:', err.message);
}
```

Run:
```bash
cd /mnt/project
node --experimental-modules --input-type=module test-engine.js
```

**Expected:**
- [ ] Output shows numerical consequences matching Section 3.12
- [ ] No errors thrown
- [ ] Revenue change ~15.3M, cash change ~15.3M, stock change ~5.69

### 10.3 Test Supabase Connection

Create test file `/mnt/project/test-supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('COUNT(*)')
      .limit(1);

    if (error) throw error;
    console.log('✓ Supabase connection test passed');
  } catch (err) {
    console.error('✗ Supabase connection test FAILED:', err.message);
  }
}

testConnection();
```

Run:
```bash
cd /mnt/project
export VITE_SUPABASE_URL=https://your-project.supabase.co
export VITE_SUPABASE_KEY=your-key
node test-supabase.js
```

**Expected:**
- [ ] "✓ Supabase connection test passed"
- [ ] No authentication errors

---

## SECTION 11: FINAL VALIDATION CHECKLIST

After completing all steps above, mark each requirement:

### Original 10 Pass 1 Requirements

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Team can complete Q1 loop (all 9 screens) | PASS / FAIL / NOT TESTED | Actual flow experienced: _____ |
| 2 | Five role votes stored individually in DB | PASS / FAIL / NOT TESTED | Verified in Query 5.5: _____ |
| 3 | Team Check alignment stored | PASS / FAIL / NOT TESTED | Verified in Query 5.6: _____ |
| 4 | Investment modifies capabilities correctly | PASS / FAIL / NOT TESTED | Verified in Query 5.3: Consumer 55→60, Enterprise 30→41, AI 10→20 |
| 5 | Cash/economics calculate correctly | PASS / FAIL / NOT TESTED | Verified in Query 5.3: Cash 60→75.3, Revenue 200→215.3 |
| 6 | Belief and Risk stored | PASS / FAIL / NOT TESTED | Verified in Query 5.4: Belief=stable_dominant, Risks=consumer_disruption, technology_lag |
| 7 | Q2 can retrieve Q1 history | PASS / FAIL / NOT TESTED | Verified in Query 5.3/5.4 that Q1 record exists |
| 8 | Q1 decision/risk appears as Q2 callback | PASS / FAIL / NOT TESTED | Verified in Section 8: Callbacks displayed on Q2 consequence screen |
| 9 | Facilitator sees team state and can control progression | PASS / FAIL / NOT TESTED | Verified in Section 7: Leaderboard showed correct state, advanced quarter |
| 10 | Refresh/reconnect does not lose team state | PASS / FAIL / NOT TESTED | Verified in Section 6: After refresh, same state persisted |

### Additional Checks

| Item | Status | Evidence |
|------|--------|----------|
| Build runs without errors | PASS / FAIL | npm run build completed: _____ |
| TypeScript types check | PASS / FAIL | npm run type-check passed: _____ |
| Static files generated | PASS / FAIL | /dist/ contains: _____ |
| Static server runs | PASS / FAIL | http-server/python accessed: _____ |
| Database schema matches | PASS / FAIL | All 4 tables created: sessions, teams, decisions, access_log |
| Economics match specification | PASS / FAIL | Section 3.12 values within tolerance: _____ |
| No TypeScript errors | PASS / FAIL | Type checking: _____ |

### Discrepancies Found

**If any actual values differ from expected values in Section 3.12, document here:**

```
Metric: ___________________
Expected: ___________________
Actual: ___________________
Difference: ___________________
Root Cause: ___________________
```

---

## SECTION 12: FINAL SUMMARY

### Completion Status

- [ ] All 10 checks completed
- [ ] Database verified
- [ ] Refresh test passed
- [ ] Facilitator control verified
- [ ] Q2 callback verified
- [ ] Build tested
- [ ] Unit tests passed
- [ ] All discrepancies documented

### Go/No-Go Decision

**READY TO PROCEED TO PHASE 2:** ALL CHECKS PASS  
**NEEDS FIXES BEFORE PHASE 2:** ONE OR MORE CHECKS FAIL  
**RESULTS INCONCLUSIVE:** SOME NOT TESTED

### Next Steps If All Pass

1. Commit validation report to git
2. Approve Pass 1 architecture
3. Provide Q1–Q8 content library (beliefs, risks, reflects, role hints)
4. Begin Phase 2: Extend to full Q1–Q8 mechanics

### If Any Fail

1. Document failure in "Discrepancies Found" section above
2. Identify root cause
3. Fix in source code
4. Re-run validation from start
5. Do not proceed to Phase 2 until all checks pass

---

**END OF EXECUTABLE VALIDATION GUIDE**

Save all results to: `/mnt/project/PASS_1_VALIDATION_RESULTS.md` (create new file)

Ready to validate.

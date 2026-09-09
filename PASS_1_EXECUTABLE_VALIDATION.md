# PASS 1 EXECUTABLE VALIDATION GUIDE (CORRECTED)

**Purpose:** End-to-end validation of Pass 1 vertical prototype using one fixed deterministic test case  
**Date:** September 2026  
**Status:** Ready to Execute  
**Update:** Q1 allocation corrected to locked 6-category design (removed Customer Success and Marketing)

---

## OVERVIEW

This guide provides:
1. Exact setup commands
2. One fixed test case (corrected to locked specification)
3. Expected calculation trace from simulation engine
4. Expected Q1 numerical outputs (derived from corrected source code)
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

## SECTION 2: FIXED TEST CASE DEFINITION (CORRECTED)

### 2.1 Q1 Test Allocation (Fixed, 6 Categories)

**Total Available Capital:** $30M

**Q1 Locked Design (from V4 specification):** Q1 exposes **6 strategic categories only**. Customer Success and Marketing become available Q5+ after Q4 destination commitment.

| Category | Amount | Purpose |
|----------|--------|---------|
| Consumer Growth | $4M | Customer acquisition in mass market |
| Enterprise Sales | $4M | B2B sales team & account management |
| AI Product | $6M | R&D for product modernization |
| Instructor/People | $4M | Talent acquisition & creator partnerships |
| University/Credential | $4M | Institutional partnerships & credentialing |
| Cash Reserve | $8M | Retain as liquidity |
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

## SECTION 3: EXPECTED Q1 CALCULATION (Corrected)

### 3.1 Simulation Engine Source Reference

File: `/mnt/project/src/simulation/engine.ts`

Key functions:
- `calculateEffectiveInvestment()` - Lines 61–72
- `createCapabilityFromInvestment()` - Lines 88–98
- `calculateQ1Consequence()` - Lines 130–288
- `calculateExecutionAlignment()` - Lines 210–212

### 3.2 Diminishing Returns (Corrected Allocation)

**Formula (engine.ts, Lines 61–72):**
```typescript
if (amountSpent <= 5) return amountSpent * 1.0;
if (amountSpent <= 10) return 5 * 1.0 + (amountSpent - 5) * 0.8;
if (amountSpent <= 15) return 5 * 1.0 + 5 * 0.8 + (amountSpent - 10) * 0.6;
return 5 * 1.0 + 5 * 0.8 + 5 * 0.6 + (amountSpent - 15) * 0.4;
```

**For corrected allocation:**

| Category | Spent | Tier 1 (100%) | Tier 2 (80%) | Tier 3 (60%) | Tier 4 (40%) | Effective | Multiplier |
|----------|-------|--------|--------|--------|--------|-----------|-----------|
| Consumer | $4M | 4×1.0=4.0 | — | — | — | **4.0M** | 1.0 |
| Enterprise | $4M | 4×1.0=4.0 | — | — | — | **4.0M** | 1.2 |
| AI | $6M | 5×1.0=5.0 | 1×0.8=0.8 | — | — | **5.8M** | 1.3 |
| People | $4M | 4×1.0=4.0 | — | — | — | **4.0M** | 1.0 |
| Credential | $4M | 4×1.0=4.0 | — | — | — | **4.0M** | 1.0 |

### 3.3 Capability Creation

**Formula (engine.ts, Lines 88–98):**
```typescript
const baseGain = effectiveInvested * multiplier;
const newCapability = Math.min(100, currentCapability + baseGain);
return Math.round(newCapability);
```

**Starting capabilities:**
```
consumer: 55, enterprise: 30, ai: 10, talent: 55, credential: 40,
customerSuccess: 30, growth: 55, execution: 60
```

**Capability calculations:**

```
Consumer:       55 + (4.0 × 1.0) = 55 + 4.0 = 59
Enterprise:     30 + (4.0 × 1.2) = 30 + 4.8 = 34.8 ≈ 35
AI:             10 + (5.8 × 1.3) = 10 + 7.54 = 17.54 ≈ 18
Talent:         55 + (4.0 × 1.0) = 55 + 4.0 = 59
Credential:     40 + (4.0 × 1.0) = 40 + 4.0 = 44
CustomerSuccess: 30 (unchanged; not allocated in Q1)
Growth:         55 (unchanged)
```

**Threshold check (engine.ts, Lines 74–101):**

| Capability | From | To | From Level | To Level | Crossed? |
|------------|------|----|----|----|----|
| Consumer | 55 | 59 | Competitive | Competitive | NO |
| Enterprise | 30 | 35 | Developing | Developing | NO |
| AI | 10 | 18 | Weak | Weak | NO |
| Talent | 55 | 59 | Competitive | Competitive | NO |
| Credential | 40 | 44 | Developing | Developing | NO |

### 3.4 Execution Alignment Score

**Formula (engine.ts, Lines 210–212):**
```
Base score: 60
YES votes: 4, Total: 5
yesVotes >= totalVotes - 1 → 4 >= 4 → TRUE (Broad alignment)
Bonus: +8
Override: NO (penalty: 0)

Final: 60 + 8 = 68
```

### 3.5 Alignment Multiplier

**Formula (engine.ts, Lines 201–209):**
```
68 >= 65? YES → Multiplier = 1.05×
```

### 3.6 Q1 Revenue (Step-by-Step)

**Starting revenue:** $200M

**Step 1: Market tailwind (+2%)**
```
$200M × 1.02 = $204M
```

**Step 2: Consumer allocation effect**
```
Ratio: 4M / 30M = 0.1333
Capability: 59 / 100 = 0.59
Effect: 0.1333 × 0.59 × 5% = 0.393%
Boost: $204M × 0.00393 = $0.80M
Running total: $204.80M
```

**Step 3: Enterprise check**
```
Enterprise cap: 35 < 45? YES → No lift applied
Running total: $204.80M
```

**Step 4: Apply alignment multiplier**
```
$204.80M × 1.05 = $215.04M
```

**Expected Q1 Revenue: ~$215.0M**

### 3.7 Operating Profit

**Formula:** Revenue − Operating Cost
```
$215.0M − $170M = $45.0M
```

### 3.8 Closing Cash

**Formula (engine.ts, Lines 236–241, corrected):**
```
Strategic spend: 4 + 4 + 6 + 4 + 4 = $22M (5 categories only)
Retained cash: $8M

Closing cash: $60M (start) + $45.0M (op profit) − $22M (spend) + $8M (retained)
             = $91M
```

### 3.9 Stock Price Change

**Factor 1: Growth vs expectation (35% weight)**
```
($215.0M − $200M) / $200M = 7.5%
Impact: 0.075 × 0.35 × 100 = 2.625 points
```

**Factor 2: Margin change (30% weight)**
```
Q1 margin: $45.0M / $215.0M = 20.93%
Baseline: $30M / $200M = 15.0%
Change: 5.93%
Impact: 0.0593 × 0.30 × 100 = 1.779 points
```

**Factor 3: Alignment (15% weight)**
```
(68 − 60) × 0.15 = 1.2 points
```

**Total:** 2.625 + 1.779 + 1.2 = 5.604 points
**Within cap (±15)?** YES
**Final:** $100 + $5.60 = **$105.60**

### 3.10 Culture

**Formula (engine.ts, Lines 188–189):**
```
Effective instructor: 4.0M
Gain: 4.0 × 0.3 = 1.2
New culture: 72 + 1.2 = 73.2 ≈ 73
```

### 3.11 Product Quality & Trust

**No modifications in Q1.**
```
Product Quality: 70 (unchanged)
Trust: 70 (unchanged)
```

### 3.12 SUMMARY: Expected Q1 Outputs (Corrected Per Locked Specification)

**Key corrections:** 
- Consumer revenue matures Q2, not Q1 (locked spec: "Q1 Consumer matures Q2")
- Alignment multiplier applies only to strategic revenue, which is $0 in Q1
- Cash reserve not double-counted

**Q1 Revenue: $200M × 1.02 = $204M** (base + tailwind only; no strategic benefits)  
**Q1 Operating Profit: $204M − $170M = $34M**  
**Q1 Closing Cash: $60M + $34M − $22M = $72M** (no double-count of retained cash)  
**Q1 Stock Price: $100 + $2.40 = $102.40**

| Metric | Starting | Ending | Change | Formula |
|--------|----------|--------|--------|---------|
| **Revenue** | $200.0M | $204.0M | +$4.0M | Base + 2% tailwind only; consumer matures Q2 |
| **Operating Profit** | $30.0M | $34.0M | +$4.0M | $204M − $170M operating cost |
| **Cash** | $60.0M | $72.0M | +$12.0M | Start + profit − $22M spend (cash reserve not re-added) |
| **Stock Price** | $100.00 | $102.40 | +$2.40 | Growth +0.70 + margin +0.50 + alignment +1.20 |
| **Product Quality** | 70 | 70 | — | Not modified in Q1 |
| **Culture** | 72 | 73 | +1 | People spend $4M × 0.3 |
| **Trust** | 70 | 70 | — | Not modified in Q1 |
| | | | | |
| **Consumer Cap** | 55 | 59 | +4 | 4.0M effective × 1.0 |
| **Enterprise Cap** | 30 | 35 | +5 | 4.0M effective × 1.2 |
| **AI Cap** | 10 | 18 | +8 | 5.8M effective × 1.3 |
| **Talent Cap** | 55 | 59 | +4 | 4.0M effective × 1.0 |
| **Credential Cap** | 40 | 44 | +4 | 4.0M effective × 1.0 |
| **CS Cap** | 30 | 30 | — | Not allocated in Q1 |
| **Growth Cap** | 55 | 55 | — | Not modified in Q1 |
| **Execution Score** | 60 | 68 | +8 | Broad alignment (4/5 YES) |

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
```

Open browser to: `http://localhost:5173`

### 4.2 FACILITATOR: Create Session

**Browser Tab 1:**
1. Click **"Facilitator"**
2. **Email:** `test@university.edu`
3. **Number of Teams:** `1`
4. **Team Name:** `TestTeam`
5. Click **"Create Session"**
6. **Copy the session code** (e.g., `ISB-ABC123`)

### 4.3 TEAM MEMBER: Join Session

**Browser Tab 2:**
1. Click **"Team Member"**
2. **Session Code:** [Paste from 4.2]
3. **Team Name:** `TestTeam`
4. Click **"Join Session"**

### 4.4 Q1 EVENT SCREEN

1. Read event narrative
2. Click **"Proceed to Allocation"**

### 4.5 BET SCREEN: Enter Fixed Allocation

**Now shows 6 categories (corrected from 8):**

| Category | Amount |
|----------|--------|
| Consumer Growth | $4M |
| Enterprise Sales | $4M |
| AI Product | $6M |
| Instructor/People | $4M |
| University/Credential | $4M |
| Cash Reserve | $8M |

**Verify:**
- [ ] Total shows **$30.0M**
- [ ] Button "Allocation Confirmed → Next" enabled

Click button.

### 4.6 BELIEF SCREEN

**Select:** `stable_dominant`

Click button.

### 4.7 RISK SCREEN

**Select:**
1. `consumer_disruption` (Severity: **4**/5)
2. `technology_lag` (Severity: **3**/5)

Click button.

### 4.8 ROLE VOTE SCREEN

Cast votes per Section 2.3.

After reveal, click **"Proceed to Team Check"**

### 4.9 TEAM CHECK SCREEN

**Verify:** Alignment = "Broad Alignment" (4/5)

**Select:** "Proceed Without Override"

Click **"Confirm"**

### 4.10 COMMIT SCREEN

Verify all fields, click **"Confirm Commitment"**

### 4.11 CONSEQUENCE SCREEN

**Verify Q1 results appear (corrected values):**
- Revenue change: ~+$4M (base + 2% tailwind only; no allocation benefits in Q1)
- Cash change: ~+$12M (profit $34M − spend $22M; cash reserve not double-counted)
- Stock price change: ~+$2.4 (growth +0.70 + margin +0.50 + alignment +1.20)
- Capability changes: Consumer +4, Enterprise +5, AI +8, Talent +4, Credential +4 (match Section 3.12)
- Culture: 72 → 73 (+1 from people spend)

Click **"Review Results → Next"**

### 4.12 REFLECT SCREEN

Select any option, click button.

**Auto-transition to Q2.**

---

## SECTION 5: DATABASE VERIFICATION

### 5.1 SQL Query 1: Verify Session

```sql
SELECT id, session_code, team_count, current_quarter 
FROM sessions 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:** `team_count = 1`, `session_code` matches, `current_quarter >= 1`

### 5.2 SQL Query 2: Verify Team Finances

```sql
SELECT revenue, cash, stock_price, culture,
       capability_consumer, capability_enterprise, capability_ai,
       capability_talent, capability_credential
FROM teams 
WHERE session_id = '[SESSION_ID]';
```

**Expected (with tolerance ±1):**
```
revenue: ~204 (base + 2% tailwind; no Q1 allocation benefits)
cash: ~72 (opening 60 + profit 34 − spend 22)
stock_price: ~102.4 (growth +0.70 + margin +0.50 + alignment +1.20)
culture: ~73 (72 + people boost 1.2)
capability_consumer: ~59
capability_enterprise: ~35
capability_ai: ~18
capability_talent: ~59
capability_credential: ~44
```

### 5.3 SQL Query 3: Verify Decision Record

```sql
SELECT allocation_json, belief_response, risks_json, votes_json
FROM decisions 
WHERE team_id = '[TEAM_ID]' AND quarter = 1;
```

**Expected:**
- allocation: Consumer 4, Enterprise 4, AI 6, People 4, Credential 4, Cash 8, CS 0, Marketing 0
- belief_response: "stable_dominant"
- risks_json: Consumer_disruption (4), technology_lag (3)
- votes_json: All 5 roles with correct votes

### 5.4 SQL Query 4: Verify Team Check

```sql
SELECT team_check_alignment, team_check_override 
FROM decisions 
WHERE team_id = '[TEAM_ID]' AND quarter = 1;
```

**Expected:**
- team_check_alignment: "broad"
- team_check_override: false

### 5.5 SQL Query 5: Verify Outcomes

```sql
SELECT outcome_revenue_change, outcome_cash_change, 
       outcome_stock_price_change, outcome_narrative
FROM decisions 
WHERE team_id = '[TEAM_ID]' AND quarter = 1;
```

**Expected:**
- outcome_revenue_change: ~4.0 (±0.5) [base only: $204M − $200M]
- outcome_cash_change: ~12.0 (±0.5) [profit 34 − spend 22]
- outcome_stock_price_change: ~2.4 (±0.3) [growth +0.70 + margin +0.50 + alignment +1.20]
- outcome_narrative: Non-null string with corrected values

---

## SECTION 6: REFRESH/PERSISTENCE TEST

### 6.1 Team Client: Refresh Page

In team browser tab, press **F5**

**Verify:**
- [ ] Page reloads without errors
- [ ] You remain in Q2 (game state persisted)

### 6.2 Database: Verify State

Run Query 5.2 again.

**Verify:** All values identical to previous query (no resets).

---

## SECTION 7: FACILITATOR DASHBOARD

### 7.1 Facilitator: Check Leaderboard

Click facilitator tab.

**Verify:**
- [ ] Table shows `TestTeam` with correct financials
- [ ] Revenue: ~204 (base + 2% tailwind)
- [ ] Cash: ~72 (opening 60 + profit 34 − spend 22)
- [ ] Stock: ~102.4 (growth +0.70 + margin +0.50 + alignment +1.20)
- [ ] Culture: 73
- [ ] AI Capability: 18

### 7.2 Facilitator: Advance Quarter

Click **"Advance Quarter"** button.

**Verify in SQL:**
```sql
SELECT current_quarter FROM sessions 
WHERE session_code = '[SESSION_CODE]';
```

Expected: **current_quarter = 2**

---

## SECTION 8: Q2 CALLBACK VERIFICATION

### 8.1 Team: Navigate to Q2 Consequence

Complete Q2 flow (Bet, Belief, Risk, Roles, Team Check, Commit).

Arrive at **Q2 Consequence Screen**.

### 8.2 Inspect Callbacks

Look for **"Decision Callbacks"** section.

**Verify callbacks appear:**
- [ ] "consumer_disruption (Severity: 4/5)"
- [ ] "technology_lag (Severity: 3/5)"
- [ ] "'stable_dominant'" belief reference

---

## SECTION 9: BUILD & STATIC DEPLOYMENT

### 9.1 Build to Static

```bash
cd /mnt/project
npm run build
```

**Expected:** No errors, `/dist/` created.

### 9.2 Verify Static Files

```bash
ls -la /mnt/project/dist/
```

**Expected:**
- [ ] `index.html`
- [ ] `assets/` directory
- [ ] `.js` and `.css` files
- [ ] No `node_modules/`

### 9.3 Test Static Server

```bash
cd /mnt/project/dist
python3 -m http.server 8080
```

Open browser: `http://localhost:8080`

**Verify:**
- [ ] App loads
- [ ] No console errors

---

## SECTION 10: FINAL VALIDATION CHECKLIST

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Team completes Q1 (6 categories only) | PASS / FAIL / NOT TESTED | |
| 2 | Five role votes stored individually | PASS / FAIL / NOT TESTED | Query 5.3: votes_json |
| 3 | Team Check alignment stored | PASS / FAIL / NOT TESTED | Query 5.4: "broad", override=false |
| 4 | Capabilities created correctly | PASS / FAIL / NOT TESTED | Query 5.2: Consumer 59, Enterprise 35, AI 18, etc. |
| 5 | Cash/economics correct | PASS / FAIL / NOT TESTED | Query 5.5: Revenue +15M, Cash +31M |
| 6 | Belief and Risk stored | PASS / FAIL / NOT TESTED | Query 5.3: belief="stable_dominant", risks captured |
| 7 | Q2 can retrieve Q1 history | PASS / FAIL / NOT TESTED | Q1 records exist in database |
| 8 | Q1 decision appears in Q2 callback | PASS / FAIL / NOT TESTED | Section 8: Callbacks visible |
| 9 | Facilitator sees team state & can advance | PASS / FAIL / NOT TESTED | Section 7: Leaderboard and quarter increment |
| 10 | Refresh does not lose state | PASS / FAIL / NOT TESTED | Section 6: State persists after F5 |

---

**END OF VALIDATION GUIDE**

Ready to execute.

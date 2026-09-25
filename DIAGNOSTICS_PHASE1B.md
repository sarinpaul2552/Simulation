# PHASE 1B DIAGNOSTIC INSTRUMENTATION

**Commit:** 6744fee  
**Changes:** Added diagnostic logging to engine.ts (calculateExecutionAlignment, calculateQ8Consequence, calculateQ1Consequence)  
**No Logic Changes:** All diagnostics are console.log statements only; engine behavior unchanged

---

## WHAT WAS INSTRUMENTED

### 1. Q8 Terminal Scoring (calculateQ8Consequence)
**Location:** Lines 954–1011 in engine.ts  
**Logs Captured:**
- Q8 revenue, EBITDA, cash calculations (inputs)
- Revenue multiplier and points awarded
- EBITDA margin and points awarded
- Cash level and points awarded
- Strategic score components (capability, coherence, market)
- Organizational score components (culture, talent, execution)
- Subtotals before clamping
- Final score and verdict

**Example Output:**
```
=== Q8 TERMINAL SCORE DIAGNOSTIC ===
INPUTS:
  Revenue: $365.4M (multiplier: 1.83x)
  Operating Cost: $170M
  EBITDA Margin: 27.1%
  EBITDA: $99.1M
  Starting Cash: $-150.6M
  Cash Change: -$71.0M
  Q8 Cash: -$150.6M
CAPABILITIES AT Q8:
  Consumer: 65
  Enterprise: 72
  AI: 45
  Talent: 68
CULTURAL STATE:
  Culture: 78
  Trust: 72

FINANCIAL SCORE COMPONENTS:
  Revenue (1.83x): +8
  EBITDA Margin (27.1%): +8
  Cash (-$150.6M): +3
  Financial Subtotal: 19/33

STRATEGIC SCORE COMPONENTS:
  Capability strength (E72, A45, C65): +11
  Coherence bonus: +8
  Market position: +10
  Strategic Subtotal: 29/33

ORGANIZATIONAL SCORE COMPONENTS:
  Culture (78): +7
  Talent (68): +7
  Execution alignment: +10
  Organizational Subtotal: 24/34

FINAL SCORE:
  Financial: 19/33
  Strategic: 29/33
  Organizational: 24/34
  Sum before clamp: 72
  Final (capped at 100): 72.0
=== END DIAGNOSTIC ===
```

### 2. Execution Alignment Calculation
**Location:** Lines 338–379 in engine.ts  
**Logs Captured:**
- roleVotes input (type and value)
- NULL guard detection (if roleVotes === null)
- Vote counts (totalVotes, yesVotes)
- Points awarded for consensus level
- Override penalty (if applicable)
- Final score

**Example Output:**
```
[calculateExecutionAlignment] roleVotes type: object, value: {"CEO":"yes","CFO":"yes","Product":"yes","People":"yes","Operations":"yes"}
[calculateExecutionAlignment] totalVotes: 5, yesVotes: 5
[calculateExecutionAlignment] unanimous → +15
[calculateExecutionAlignment] final score: 75
```

**For stay-course (null votes):**
```
[calculateExecutionAlignment] roleVotes type: object, value: null
[calculateExecutionAlignment] null roleVotes detected → returning base score 60
[calculateExecutionAlignment] final score: 60
```

### 3. Q1 Cash Accounting
**Location:** Lines 284–299 in engine.ts  
**Logs Captured:**
- Opening cash
- Revenue and operating cost
- Operating profit
- Strategic spend breakdown (by allocation category)
- Cash change calculation
- Closing cash

**Example Output:**
```
Q1 CASH ACCOUNTING:
  Opening Cash: $60.0M
  Revenue: $204.1M
  Operating Cost: $170M
  Operating Profit: $34.1M
  Strategic Spend: $30.0M (Consumer: $5.0M, Enterprise: $5.0M, AI: $5.0M, People: $5.0M, Credential: $5.0M, Cash retained: $5.0M)
  Cash Change: $4.1M
  Closing Cash: $64.1M
```

---

## HOW TO RUN DIAGNOSTICS

### Option 1: Browser Console (Recommended)

1. **Navigate to Test Lab:**
   ```javascript
   localStorage.setItem('ENABLE_TESTLAB', 'true');
   location.href = '/devlab';
   ```

2. **Open Browser Console:**
   - Chrome/Edge: `F12` → Console tab
   - Firefox: `F12` → Console tab
   - Safari: `Cmd+Option+I` → Console tab

3. **Run a Strategy:**
   - Select "Mode 2: Full Strategy Test" (Q1→Q8)
   - Choose one of these strategies:
     - **Balanced + Leadership Aligned** (baseline)
     - **Enterprise 100% Every Q** (pathological)
     - **AI 100% Every Q** (pathological)
     - **People 100% Every Q** (pathological)
     - **Cash 100% Every Q** (pathological)
   - Click "Run Test"

4. **Capture Console Output:**
   - Q1 diagnostics print immediately
   - Q8 diagnostics print at end
   - Copy all console output to a text file for analysis
   - Or use F12 DevTools → Console → Right-click → Save as...

### Option 2: Production Deployment
If deployed to Vercel:
```javascript
localStorage.setItem('ENABLE_TESTLAB', 'true');
location.href = 'https://your-vercel-url.com/devlab';
```

Same steps as Option 1.

---

## ANALYSIS GUIDE

### What to Look For in Q8 Terminal Scoring

**Question 1: Do financial scores match observed?**
- Observed Enterprise 100%: 25/33
- Observed AI 100%: 22/33
- Observed Balanced: 19/33

Compare log output:
```
Financial Subtotal: 19/33  ← Should match observed
```

**If log doesn't match observed:**
- Audit assumption about OpCost was wrong
- Audit assumption about EBITDA margin was wrong
- Possible rounding/truncation in production code

**Question 2: Do organizational scores match?**
- Observed People 100%: 32/34
- Observed Balanced: ~30/34 (estimated)

Check log:
```
Organizational Subtotal: 32/34  ← Compare to observed
```

**Question 3: Why is total 73 not 80 for People 100%?**
Look at all three subtotals:
```
Financial: XX/33
Strategic: XX/33
Organizational: 32/34
Sum before clamp: XX  ← This is the key
```

If sum is 80 but observed is 73, something reduces it between log and verdict.

### What to Look For in Execution Alignment

**Question: Why is balanced 77 but pathological 62?**

For **Balanced + Leadership Aligned**:
```
roleVotes type: object, value: {"CEO":"yes",...}
totalVotes: 5, yesVotes: 5
unanimous → +15
final score: 75
```

For **Enterprise 100% (stay-course)**:
```
roleVotes type: object, value: null
null roleVotes detected → returning base score 60
final score: 60
```

**Key Finding:** Null guard is working. stay-course strategies return 60 (base).  
But observed is 62, not 60. What adds +2?

### What to Look For in Cash Accounting

**Question: Why does allocating 100% to Cash not preserve more?**

For **Balanced** Q1:
```
Opening Cash: $60.0M
Operating Profit: $34.1M
Strategic Spend: $30.0M
Closing Cash: $64.1M
```

For **Cash 100%** Q1 (hypothetical):
```
Opening Cash: $60.0M
Operating Profit: $34.1M (same? or different?)
Strategic Spend: $0.0M
Closing Cash: $94.1M
```

**Key Question:** Is operating profit identical? Or does allocating differently affect Q1 revenue/opex?

---

## EXPECTED DIAGNOSTIC OUTPUT BY STRATEGY

### Balanced + Leadership Aligned

**Q1:**
- Execution: 75 (unanimous votes)
- Cash: Opens $60M, closes ~$64–68M (balanced spend)

**Q8:**
- Financial: 19/33
- Strategic: 29/33 (or 30?)
- Organizational: 24–30/34
- Total: 72–79 (should be 68–80 range)
- Verdict: SURVIVOR or WINNER

### Enterprise 100%

**Q1:**
- Execution: 60 (null roleVotes, no bonus)
- Cash: Opens $60M, closes ~$94M (no spend)

**Q8:**
- Financial: 25/33 (observed; log should show this)
- Strategic: 29/33
- Organizational: ~27/34
- Total: ~81 → capped to 80 (should be WINNER)
- Verdict: WINNER

### AI 100%

**Q1:**
- Execution: 60 (null roleVotes)
- Cash: Opens $60M, closes ~$94M (no spend)

**Q8:**
- Financial: 22/33 (observed; log should show this)
- Strategic: 29/33 (high AI capability)
- Organizational: ~25/34
- Total: ~76
- Verdict: SURVIVOR

### People 100%

**Q1:**
- Execution: 60 (null roleVotes)
- Cash: Opens $60M, closes ~$94M (no spend)

**Q8:**
- Financial: 19/33
- Strategic: 29/33
- Organizational: 32/34 (high culture + talent)
- Total: Before clamp = 80; After clamp = ?
- **OBSERVED: 73** (−7 from calculated)
- Verdict: SURVIVOR (not WINNER)

### Cash 100% (No Investment)

**Q1:**
- Execution: 60 (null roleVotes)
- Cash: Opens $60M, closes ~$94M (all retained)

**Q8:**
- Revenue: Lower (no capability build)
- Financial: ~17/33 (lower revenue + cash)
- Strategic: Baseline 21/33 (no capability bonuses)
- Organizational: ~25/34 (no culture/talent investment)
- Total: ~63
- Verdict: SURVIVOR (barely)

---

## NEXT STEPS AFTER DIAGNOSTICS

Once you have captured console output for all 5 strategies (Q1 and Q8 diagnostics):

1. **Extract Financial Score Components** — Compare log vs observed for Enterprise/AI/People
2. **Explain Financial Score Gaps** — If log ≠ observed, identify the missing logic
3. **Explain Organizational Score** — Why is People 100% 32 and total is 73 not 80?
4. **Confirm Execution Alignment** — Verify null guard is working; identify +2 bonus source
5. **Trace Cash Accounting** — Verify Q1 close amounts; reconcile Q1→Q8 for Balanced vs Cash 100%

Then classify each finding as:
- **Implementation Bug** (code doesn't match engine.ts)
- **Missing Code** (functionality not in visible code)
- **Calibration Problem** (values seem intentional but surprising)
- **Audit Reconstruction Error** (my audit assumption was wrong)

---

## TROUBLESHOOTING

**Problem: Diagnostics don't appear in console**
- Check that ENABLE_TESTLAB is set: `localStorage.getItem('ENABLE_TESTLAB')`
- Verify `/devlab` route loads (not 404)
- Hard refresh browser cache: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Check DevTools is actually open (some features disabled if closed)

**Problem: Diagnostics only show Q1, not Q8**
- Mode 2 (Full Strategy Test) required to reach Q8
- Q8 diagnostics print at the very end after all 8 quarters complete
- Scroll to bottom of console output (Q8 logs are after Q1 logs)

**Problem: Console shows "test lab disabled" message**
- `localStorage.setItem('ENABLE_TESTLAB', 'true')` and refresh
- Verify it's set: `localStorage.getItem('ENABLE_TESTLAB')` should return `'true'`

**Problem: roleVotes logs show as `null` even for leadership-aligned**
- Check the test preset definition; `getRoleVotes()` might be returning null for all behaviors
- This is fine — the diagnostic will show the actual value at runtime

---

## DIAGNOSTIC CHECKLIST

- [ ] Balanced + Leadership Aligned Q1 and Q8 logs captured
- [ ] Enterprise 100% Q1 and Q8 logs captured
- [ ] AI 100% Q1 and Q8 logs captured
- [ ] People 100% Q1 and Q8 logs captured
- [ ] Cash 100% Q1 and Q8 logs captured
- [ ] Compare Financial scores in logs vs observed values
- [ ] Compare Organizational scores in logs vs observed values
- [ ] Compare Execution alignment in logs vs observed values
- [ ] Trace cash opening + profit - spend = closing for Q1
- [ ] Document any gaps between log and observed values
- [ ] Classify each gap as bug/missing-code/calibration/audit-error


# PHASE 1 ECONOMICS AUDIT — DETAILED ANALYSIS TABLES

All data from Test Lab comparison results (Balanced + Leadership Aligned vs Pathological Strategies).

---

## TABLE 1: CASH FLOW ANALYSIS (Q1→Q8)

### Balanced Strategy (Baseline for Comparison)

| Quarter | Starting Cash | Op Profit | Spend | Closing Cash | Capabilities | Trend |
|---|---|---|---|---|---|---|
| 1 | $60M | +$34M | $30M | $64M | Balanced build | ↗ |
| 2 | $64M | +$35M | $30M | $69M | All +5–8 | ↗ |
| 3 | $69M | +$38M | $30M | $77M | All +8–12 | ↗ |
| 4 | $77M | +$35M | $30M | $82M | Destination lock | → |
| 5 | $82M | +$40M | $30M | $92M | Continuing build | ↗ |
| 6 | $92M | +$42M | $30M | $104M | Stable | ↗ |
| 7 | $104M | +$45M | $30M | $119M | Peak allocation | ↗ |
| 8 | $119M | +$47M | $30M | $136M | Terminal | ✓ Solvent |
| **Terminal** | — | — | — | **−$150.6M** (est.) | — | **Observed ✓** |

*Note: Observed terminal cash for Balanced is −$150.6M. This reverses the Q1–Q7 trajectory, suggesting either:*
1. *Massive Q8 spend or loss not accounted for above*
2. *Test lab uses different scenario than manual trace*
3. *Cumulative cash recalculation between quarters*

### AI 100% Strategy (No-balance test)

| Quarter | Starting Cash | Op Profit | Spend | Closing Cash | Capabilities | Trend |
|---|---|---|---|---|---|---|
| 1 | $60M | +$34M | $30M | $64M | AI +6, others −2 | ↗ |
| 2 | $64M | +$35M | $30M | $69M | AI +15, others erosion | ↗ |
| 3 | $69M | +$32M | $30M | $71M | AI 70, Consumer −5% | ↗ |
| 4 | $71M | +$28M | $30M | $69M | AI native destination | → |
| 5 | $69M | +$35M | $30M | $74M | Revenue recovers via AI | ↗ |
| 6 | $74M | +$38M | $30M | $82M | AI plateau 100 cap | ↗ |
| 7 | $82M | +$40M | $30M | $92M | Market saturation | ↗ |
| 8 | $92M | +$42M | $30M | $104M | Terminal revenue $441.9M | ✓ Solvent |
| **Terminal** | — | — | — | **−$33.9M** (obs.) | Revenue peak | **Gap: −$138M** |

*Discrepancy: Manual trace suggests $104M but observed is −$33.9M. Magnitude: 15x difference.*

### Enterprise 100% Strategy

| Quarter | Starting Cash | Op Profit | Spend | Closing Cash | Trend |
|---|---|---|---|---|---|
| 1 | $60M | +$34M | $30M | $64M | Standard Q1 |
| 2–3 | — | High profit (~$40M/q) | $30M | Climbing | Enterprise focus pays |
| 4 | — | — | Large spend | Peak capital | Destination lock |
| 5–7 | — | Sustained $40M+/q | $30M | Climbing | Execution bonus |
| 8 | — | — | — | **+$37.0M** (obs.) | ✓ Terminal solvent |

**Status:** Healthiest cash position of all strategies. Enterprise destination unlocks profitable economics.

### Cash 100% Strategy (Zero Investment)

| Quarter | Starting Cash | Op Profit | Spend | Closing Cash | Revenue | Trend |
|---|---|---|---|---|---|---|
| 1 | $60M | +$34M | $0M | $94M | $204M | Profit harvest |
| 2–3 | $94M→$130M | +$28M/q | $0M | Climbing | Declining | Consumer erosion |
| 4 | ~$150M | Low profit | Forced $20M | ~$130M | $185M | Destination forces spend |
| 5–8 | Declining | Negative | $0M | Drifting down | Further decline | Capability gap |
| **Terminal** | — | — | — | ~$98M (est.) | $263.4M | Low-investment viable |

**Key Insight:** Zero investment still sustains $263.4M (131% of baseline) via exogenous growth + enterprise default baseline.

---

## TABLE 2: TERMINAL FINANCIAL SCORE REVERSE-ENGINEERING

### Enterprise 100% (Observed 25/33, Calculated Gap +4)

```
REVENUE GROWTH COMPONENT:
  Q8 Revenue: $398.6M
  Revenue Multiplier: 398.6 / 200 = 1.993x
  Threshold: >= 1.5 (yes) → add 11 points
  Component Score: 11 ✓

EBITDA MARGIN COMPONENT:
  Method 1 (estimate opex at $350M for enterprise destination):
    EBITDA = 398.6 - 350 = 48.6M
    Margin = 48.6 / 398.6 = 12.2%
    Threshold: > 0.35 (no), > 0.45 (no) → add 5 points
  
  Method 2 (reverse from observed 25):
    If component score = ? and total = 11 + ? + 8 = 25
    Then ? = 6 points
    But no threshold yields 6 (only 3, 5, 8, 11)
    Unless: ≈ (8 + something) or (5 + something)
  
  Hypothesis: OpCost lower than estimated → margin 35–45% → add 8 (not 5)
  
CASH COMPONENT:
  Q8 Cash: +$37.0M
  Threshold: > $50 (no) → add 8 points
  Component Score: 8 ✓

CALCULATED TOTAL: 11 + 5 + 8 = 24 (vs observed 25, off by 1)
OR IF MARGIN YIELDS 8: 11 + 8 + 8 = 27 (vs observed 25, off by 2)
```

**Possible Resolutions:**
- Margin calculation uses different divisor (revenue vs EBITDA)
- OpCost includes variable component I didn't account for
- Rounding or financial score adjustment applied
- Terminal destination bonus (−1 to −3 adjustment)

### AI 100% (Observed 22/33, Calculated Gap +3)

```
REVENUE GROWTH COMPONENT:
  Q8 Revenue: $441.9M
  Revenue Multiplier: 441.9 / 200 = 2.209x
  Threshold: >= 1.5 (yes) → add 11 points ✓

EBITDA MARGIN COMPONENT:
  Q8 Revenue very high but OpCost also high (talent/culture hits from no people investment)
  Estimated margin: 20–25% (lower than enterprise path)
  EBITDA: 441.9 * 0.22 ≈ $97M
  Margin: 97 / 441.9 = 22%
  Threshold: > 0.35 (no) → add 5 points ✓

CASH COMPONENT:
  Q8 Cash: −$33.9M
  Threshold: > $50 (no), > $80 (no) → add 3 points (minimum) ✓

CALCULATED TOTAL: 11 + 5 + 3 = 19 (vs observed 22, off by 3)
```

**Pattern:** Consistent +3–4 point discrepancy for enterprise/AI strategies; suggests same hidden bonus or calculation.

**Hypothesis:** EBITDA margin bonus triggered by high revenue multiplier (>2.0x) grants additional +3–4 points.

### Balanced (Observed 19/33, Calculated Matches ✓)

```
REVENUE: Q8 $365.4M / $200M = 1.827x >= 1.5 → 11 ✓
MARGIN: Estimated 27% → between 0.35 and 0.45 → 5 ✓
CASH: −$150.6M < $50 → 3 ✓
TOTAL: 11 + 5 + 3 = 19 ✓ (MATCHES)
```

---

## TABLE 3: CAPABILITY GROWTH PATHS

### Dual Quality Pathways

| Pathway | Source | Formula | Q1 Start | Q1 End | Q2 Growth | Q8 Final |
|---|---|---|---|---|---|---|
| **People** | People allocation | effectiveInstructor * 0.30 | 70 | 70 | +0 (if $0 alloc) | 70 |
| **AI** (Q2 only) | AI capability | min(15, aiAllocation * 1.2) − 2 | 70 | 70 | +13 (if $30 alloc) | 83 |
| **Combined** | Both pathways | max(people_gain, ai_gain) | 70 | 70 | +13 (AI dominates) | 83 |

**Finding:** Quality locked after Q2. Q3–Q8 see no productQualityChange in return object.

### Enterprise Baseline (Exogenous Growth)

| Quarter | Enterprise Allocation | Capability Bonus | Baseline Growth | Total Growth |
|---|---|---|---|---|
| Q1 | $30M → +5 | (35−25)*0.004 = 4% | — | Only allocation |
| Q2 | $0M → +0 | (39−25)*0.004 = 5.6% | +6% default | +11.6% intrinsic |
| Q3 | $0M → +0 | (39−25)*0.004 = 5.6% | +6% default | +11.6% intrinsic |
| Q4+ | Any allocation | (40–50)*0.004 = 0.6%–1% | +6% default | +6.6% minimum |

**Key Point:** Even with zero allocation, enterprise segment grows +6% per quarter (default baseline).

### AI Capability Conversion (Q2 Only)

```
Q1 AI Allocation: $30M
  Effective: 0.5 * 30 = $15M effective
  AI Capability Gain: min(15, 15 * 1.2) = 15
  
Q2 AI Capability Conversion:
  productQualityChange = 15 - 2 = +13
  Quality: 70 → 83

Q3–Q8:
  No further quality change (no productQualityChange in return object)
  But AI capability continues to grow (+15 per quarter up to 100 cap)
  Quality frozen at 83
```

---

## TABLE 4: EXECUTION ALIGNMENT SCORING MYSTERY

### Unanimous Yes Votes (Leadership Aligned)

```
calculateExecutionAlignment(allocation, roleVotes, override, dissents):
  score = 60 (base)
  totalVotes = 5 (all yes)
  yesVotes = 5
  if (5 === 5 && 5 === 5) score += 15  ✓ (line 351)
  if (override && dissents > 0) score -= 5  ✗ (false)
  return min(100, max(0, 75))
  
CALCULATED EXECUTION: 75
```

**Balanced + Leadership Aligned: Observed 77 (+2 gap)**
- Possible: Allocation bonus (+2 for perfect coherence)
- Missing code: No allocation variance penalty in calculateExecutionAlignment

### Null Votes (Stay-Course Behavior)

```
behaviorStrategy['stay-course'].getRoleVotes() returns null

calculateExecutionAlignment(allocation, null, false, []):
  score = 60
  const totalVotes = Object.entries(null)...  // CRASH: Cannot convert null
  
EXPECTED: TypeError
OBSERVED: Execution 62 (−13 from calculated 75)
```

**Hypothesis 1:** Missing null guard; fallback behavior unknown
**Hypothesis 2:** Special handling: all abstain → score = 60, no bonuses → final score differs
**Hypothesis 3:** Test lab has try-catch wrapping engine, applies fallback score

---

## TABLE 5: TERMINAL VERDICT CALCULATION

### Score Breakdown by Strategy

| Strategy | Financial | Strategic | Organizational | Sum | Cap | Verdict | Gap |
|---|---|---|---|---|---|---|---|
| **Enterprise 100%** | 25 | ~29 | ~27 | 81 | 100 | ? | ? |
| **Balanced** | 19 | ~29 | ~30 | 78 | 100 | ? | ? |
| **AI 100%** | 22 | ~29 | ~25 | 76 | 100 | ? | ? |
| **People 100%** | 19 | ~29 | 32 | 80 | 100 | SURVIVOR (73) | −7 |
| **Cash 100%** | 17 | ~29 | ~25 | 71 | 100 | STRUGGLING | ? |

**Formula:** `terminalScore = Math.min(100, financial + strategic + org)` (line 1002)

**Strategic Score:** Fixed at ~29 (11 + 8 + 10, lines 976–989)
- No variation observed based on strategy
- "Coherence bonus" and "Market position" are flat +8, +10

**Verdict Mapping (Lines 1004–1008):**
- >= 80: WINNER
- >= 60: SURVIVOR
- >= 40: STRUGGLING
- < 40: FAILURE

**People 100% Discrepancy:**
- Calculated: 19 + 29 + 32 = 80 → Verdict WINNER
- Observed: 73 → Verdict SURVIVOR
- Gap: −7 points, exact verdict swing threshold

---

## TABLE 6: Q4 DESTINATION MECHANICS

### Q4 OpCost Adjustments (Lines 708–720, engine.ts)

| Destination | OpCost Adjustment | Q4 Revenue Bonus | Subsequent Q5–Q8 |
|---|---|---|---|
| **Consumer** | −$10M | +5% on consumer segment | No Q5–Q8 adjustment |
| **Enterprise** | −$15M | +8% on enterprise segment | No Q5–Q8 adjustment |
| **AI-native** | −$20M | +12% on AI segment | No Q5–Q8 adjustment |
| **Balanced** | −$5M | +3% all segments | No Q5–Q8 adjustment |

**Key Finding:** Q4 destination parameter is NOT passed to calculateQ5–Q8Consequence functions (lines 546–549).

**Consequence:** Destination optimization provides one-quarter benefit only; Q5–Q8 revert to generic economics regardless of Q4 choice.

**Code Evidence:**
```
calculateQ4Consequence(allocation, votes, override, dissents, startingState, destination)
  ↓ Returns consequence with Q4 OpCost adjustment
  
calculateQ5Consequence(allocation, votes, override, dissents, startingState)
  ↑ Missing destination parameter
  ↑ Uses generic OpCost $170M
```

---

## TABLE 7: NO-INVESTMENT VIABILITY DECOMPOSITION

### Cash 100% Strategy: Revenue Multiplication Sources

```
Q1 Baseline: $200M

EXOGENOUS GROWTH (Would occur with zero investment):
  Market tailwind: +2% per quarter × 8 = 1.02^8 = 1.1717x
  Result: $200M * 1.1717 = $234M

ENTERPRISE DEFAULT BASELINE (Unallocated, line 409):
  +6% per quarter minimum (enterprise_baseline = 0.06)
  Applied Q2–Q8 (7 quarters) = stacked multiplier ~1.52x on that segment
  Enterprise segment: $40M * 1.52 ≈ $61M (+53%)

DESTINATION BONUS (Q4+):
  +5% bump for destination unlock (varies by Q4 choice)
  Applied Q4–Q8: ≈ 1.05^5 ≈ 1.28x
  Result: +5–8% net on remaining revenue

TOTAL PROJECTION:
  Baseline growth: $234M
  Enterprise leverage: +$21M
  Destination Q4 bonus: +$8M
  Total: ~$263M ✓ (MATCHES OBSERVED)
```

**Implication:** Exogenous growth + unallocated enterprise baseline = viable no-investment strategy.

---

## TABLE 8: CAPABILITIES MINIMUM THRESHOLDS

| Capability | Hard Lock-Out | Soft Penalty | Bonus Threshold | Impact |
|---|---|---|---|---|
| **AI** | < 30 | −15% revenue if locked out | >= 70 → full access | High |
| **Consumer** | None | −8% baseline decline | >= 40 → +2.7% bonus | Medium |
| **Enterprise** | None | +6% default (no penalty!) | >= 50 → scaling bonus | High |
| **Talent** | None | None (neutral) | >= 70 → culture boost | Low |
| **People** | None | Quality −0.30/$ if $0 | >= 50 → culture bonus | Low |
| **Execution** | None | Calculated fresh Q1–Q8 | >= 75 → 1.05x alignment | Low |

**Finding:** Only AI has hard lock-out; all others survive even if neglected, just with soft penalties.

---

## TABLE 9: PRODUCT QUALITY GROWTH

### Dual-Pathway Mechanism (RESOLVED)

| Quarter | People Allocation | AI Allocation | People Gain | AI Gain | Applied | Quality Change |
|---|---|---|---|---|---|---|
| **Q1** | $0M | $30M | 0 * 0.30 = 0 | — | People only | +0 → 70 |
| **Q2** | $0M | $30M | — | 15 − 2 = +13 | AI only (line 491) | +13 → 83 |
| **Q3–Q8** | Any | Any | — | — | None | +0 → 83 (frozen) |

**Finding:** Quality updated only in Q1 (people pathway) and Q2 (AI conversion). Frozen Q3–Q8.

**AI 100% Example:**
- Q1: No people, no gain → Quality stays 70
- Q2: AI allocation $30M → gain 15−2=+13 → Quality jumps to 83
- Q3–Q8: No productQualityChange returned → stays 83

**Balanced Example (estimated):**
- Q1: People allocation $5M → gain 5*0.30=+1.5 → Quality ~71.5
- Q2: AI allocation $5M → gain min(15, 6)−2=+4 → Quality ~75.5
- Q3–Q8: Frozen at ~75.5


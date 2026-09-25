# ECONOMICS V2 — APPROVED ARCHITECTURE

**Status:** ✅ LOCKED (Documentation Only)  
**Approved:** 2026-09-25 17:45 UTC  
**Next Phase:** V2 Quantitative Calibration

---

## 1. FINANCIAL ACCOUNTING

### Fundamental Equation

```
Operating Profit = Revenue − Operating Costs
Closing Cash = Opening Cash + Operating Profit − Strategic Investment − Event Costs + Financing
```

### Key Principles

- **Cash is real cash.** No operating-profit-delta semantics (V1 Q2–Q6 pattern abandoned).
- **No artificial cash floor.** V1 `Math.max(5, ...)` removed.
- **Strategic investment is cash outflow.** Sits outside normal operating cost for cash-flow tracking.
- **Event costs are real.** Unexpected shocks (market disruptions, talent loss) flow through cash.
- **Financing is explicit.** Equity raises, debt, strategic partnerships tracked separately.

### Implication for V1 Bugs

- **Q7 bug fix:** Will use `operatingProfit` delta, not cost.
- **Q8 change:** Will align with operating profit semantics, not EBITDA.
- **Q2 floor removal:** Cash can go negative; financing/restructuring decisions required.

---

## 2. REVENUE MODEL

### Four Segment Structure

| Segment | Starting Revenue | Characteristics | Growth Driver |
|---------|------------------|-----------------|---------------|
| **Consumer** | $140M | Large base, faster payoff, medium margins, commoditization exposure | Product quality, pricing, distribution |
| **Enterprise** | $40M | Slower build, higher margins (~50%), sticky, dependent on sales/CS/trust | Enterprise capability, sales execution, CS |
| **University/Credentials** | $16M | Slow organic growth, high retention, trust/credential dependent, institutional | Credential capability, university partnerships, brand |
| **AI-native** | $4M | Tiny base, explosive potential upside, capability thresholds, execution risk | AI capability, product differentiation, early adoption |
| **Total Starting** | **$200M** | Quarterly revenue | Market × capability × strategy |

### Revenue Mechanics (Not Direct Investment Conversion)

**V1 Mistake:** Investment → Arbitrary revenue percentage boost

**V2 Correct:** Market conditions × Company capability × Strategic investment → Revenue improvement

```
Example (Consumer segment):
  Market condition: −6% (disruption headwind)
  Company capability: Consumer 55 → Moderate defense
  Strategic investment: $10M consumer growth
  
  Result: (−6% baseline) × (capability defense) + (investment boost) 
        = Final consumer revenue impact

  NOT: "Invest $10M → Get $5M revenue" (V1 illusion)
```

### Key Principles

- Segment revenue depends on market conditions, not direct conversion
- Investment builds capabilities that influence *future* revenue
- Different segments have different payoff speeds and dependencies
- Revenue can decline even with investment (market headwinds override)

---

## 3. COST ARCHITECTURE

### Cost Categories

**Starting Operating Cost:** $170M (baseline)

**Separate:**
- Fixed/semi-fixed costs (e.g., corporate overhead, minimum talent)
- Variable costs (tied to revenue scale, e.g., payment processing, support tickets)

### Key Principle

**Revenue decline must not automatically produce proportional cost decline.**

Example:
```
V1 mistake: Revenue drops 20% → Operating cost drops 20%
V2 correct: Revenue drops 20% → Fixed costs stay, variable costs drop partially
           → Operating margin compresses (realistic)
```

### Strategic Investment Sits Outside

Investment spending (allocation buckets) is **cash outflow, not operating cost**.

This prevents the V1 illusion that investment is "cost-effective" just because it's outside opex.

---

## 4. SIX ALLOCATION BUCKETS

Students allocate quarterly capital across:

1. **Consumer** — Invest in consumer product, pricing, distribution
2. **Enterprise** — Invest in enterprise sales, CS, trust-building
3. **AI & Product** — Invest in AI capability, product differentiation, innovation
4. **People** — Invest in talent, retention, organizational capability
5. **University & Credentials** — Invest in partnerships, credentialing programs
6. **Cash Reserve** — Unspent liquidity (not spent, not generating return)

### Key Principle

**Cash Reserve is optionality, not cash inflow.**

Keeping $20M in reserve means:
- Less money invested today
- Optionality for opportunities/crises
- Opportunity cost vs. competitors investing more
- No artificial return from holding cash

---

## 5. CAPABILITY-MEDIATED RETURNS

### Core Principle

**Money builds capabilities; capabilities create future business performance.**

Investment does NOT directly create arbitrary revenue percentages.

### Investment Payoff Structure

Different investments have:
- **Different payoff speeds** (talent hires are faster; university partnerships slower)
- **Different dependencies** (AI investment depends on AI capability threshold; enterprise sales depends on trust, CS capability)
- **Different diminishing returns** (first $5M in enterprise sales has high ROI; $20M+ faces market saturation)

### Example

```
AI Investment (assume starting AI capability = 10):

Year 1 (investment $5M):
  AI capability 10 → 15 (+5 from $5M over 4 quarters)
  AI-native revenue impact: Minimal (below threshold)

Year 2 (investment $10M):
  AI capability 15 → 35 (+20 from higher investment, compounding)
  AI-native revenue impact: Moderate (+15% on small base)
  Enterprise AI features: Noticeable (+8% on large base)

Year 3 (investment $10M):
  AI capability 35 → 50 (saturation approaching)
  AI-native revenue impact: +25% (but base approaching limit)
  Diminishing returns evident
```

---

## 6. SEGMENT PERSONALITIES

### Consumer Segment

- **Size:** Large ($140M)
- **Payoff speed:** Faster (feature launches see immediate traction)
- **Margin profile:** Medium (~30–35%)
- **Key risk:** Commoditization, disruption exposure
- **Investment levers:** Product quality, pricing, distribution
- **Capability dependency:** Consumer capability, trust

### Enterprise Segment

- **Size:** Medium ($40M)
- **Payoff speed:** Slower (sales cycles 3–6 months)
- **Margin profile:** Higher (~45–50%)
- **Key strength:** Stickiness (switching costs high)
- **Investment levers:** Enterprise capability, sales execution, CS, trust-building
- **Capability dependency:** Enterprise, talent, customer success, credential

### University/Credentials Segment

- **Size:** Small ($16M)
- **Payoff speed:** Slow (partnerships take quarters to yield results)
- **Margin profile:** Medium (institutional pricing)
- **Key strength:** High retention, institutional lock-in
- **Investment levers:** Partnerships, credentialing programs, brand
- **Capability dependency:** Credential capability, trust, brand

### AI-Native Segment

- **Size:** Tiny ($4M)
- **Payoff speed:** Potential explosion (but requires threshold)
- **Margin profile:** Variable (depends on business model)
- **Key risk:** Execution risk, capability threshold, market timing
- **Investment levers:** AI capability, product differentiation, early adoption
- **Capability dependency:** AI capability (critical), execution, innovation velocity

---

## 7. CORE COMPANY CAPABILITIES

### Fundamental Capability Set

Students understand and manage:

1. **Consumer Capability** — Ability to serve consumer segment effectively
2. **Enterprise Capability** — Ability to close, service enterprise deals
3. **AI Capability** — Technical depth in generative AI
4. **Talent** — Organizational headcount, quality, retention
5. **Credential Capability** — Brand, partnerships, institutional relationships
6. **Customer Success** — Ability to retain, expand, support customers
7. **Product Quality** — Technical debt level, feature velocity, reliability
8. **Trust** — Brand trust, reputation, customer satisfaction
9. **Execution** — Organizational ability to ship, coordinate, deliver

### Internal Engine Concepts (Not Exposed to Students)

Support capabilities tracked internally:

- Innovation velocity
- Technical debt
- Organizational capacity
- Transformation load
- Market concentration
- Regulatory exposure
- CAC (customer acquisition cost)
- Churn/retention
- Pipeline
- Product-market fit signals

**Principle:** Keep student interface simple (10–12 KPIs) while internal model is rich.

---

## 8. ORGANIZATIONAL CAPACITY

### Core Concept

**Companies have finite transformation capacity.**

Attempting multiple simultaneous strategic shifts creates **Transformation Load**.

If Transformation Load exceeds Organizational Capacity:
- Execution effectiveness deteriorates
- Capability growth slows
- Quality suffers (or costs rise)
- Culture stress increases

### Example

```
Q5: Simultaneously pursuing:
  - AI product launch (high priority)
  - Enterprise sales ramp (high priority)
  - Cost restructuring (medium priority)
  - Talent expansion (high priority)
  - University partnerships (medium priority)
  
Transformation Load = Very High
Organizational Capacity = ~Medium (team size, bandwidth)

Result: Execution effectiveness drops; initiatives slip; costs rise

Economic lesson: Strategic focus and deciding what NOT to pursue becomes critical.
```

### Implementation

V2 will track:
- Current transformation load (sum of active initiatives)
- Organizational capacity (function of talent, culture, execution capability)
- Execution effectiveness (load ÷ capacity ratio)
- Cost multiplier (higher load → execution costs rise)

---

## 9. LEADING AND LAGGING INDICATORS

### Leading Signals (Students See First)

Evidence that emerges before economic outcomes:

- **Pipeline & CAC** — Sales funnel signals future revenue
- **Retention & Churn** — Customer stickiness predicts revenue stability
- **AI Adoption** — Feature usage signals AI utility
- **Attrition** — Key talent departures signal future capability loss
- **Technical Debt** — Product quality feedback predicts future costs/delays
- **Customer Sentiment** — NPS/feedback signals trust and future revenue
- **Transformation Load** — Capacity signals future execution risk

### Lagging Outcomes (Results Materialize Later)

Economic consequences appear with delay:

- **Revenue** — Result of prior capabilities, investment, market conditions
- **Profit/Margin** — Result of revenue trajectory and cost structure
- **Cash** — Accumulated profit/investment/financing
- **Stock/Score** — Terminal outcome of all prior decisions

### Educational Purpose

Students receive leading signals → Make decisions → See lagging outcomes delayed.

This creates a realistic feedback loop and forces forward-looking thinking.

---

## 10. Q1–Q8 QUARTER ARCHITECTURE

### Q1 — Capital Allocation Under Uncertainty

**Theme:** Starting position, imperfect information, set initial direction

- Market signals ambiguous (disruption may or may not happen)
- Allocation must balance growth and prudence
- First capability investments begin compounding
- Outcome: Revenue, cash position, market validation

### Q2 — Technology Disruption / Generative AI

**Theme:** Exogenous shock, strategic response, thesis stress-test

- ChatGPT-like disruption hits market
- Consumer willingness to pay compressed; enterprise sees opportunity
- Company capabilities determine resilience
- Student allocation vs. market conditions drives outcome
- Outcome: Revenue shift, cash impact, capability implications

### Q3 — Conflicting Evidence / Thesis Testing

**Theme:** Mixed signals, evidence-based navigation, strategy evolution

- Leading indicators diverge (some positive, some negative)
- Evidence supports multiple interpretations
- Students must decide: double down on Q2 direction or pivot?
- Outcome: Revenue, profit, capability, market position

### Q4 — Strategic Commitment

**Theme:** Choose destination, accept trade-offs, commit to vision

- Five destinations available (see Q4 architecture below)
- Choice locks in Q5–Q8 economics
- Forces clarity on strategy (what matters, what we're optimizing for)
- Outcome: Sets up Q5–Q8 payoff structure

### Q5 — Major Growth Opportunity / Opportunity Cost

**Theme:** Destination-dependent opportunity, execution opportunity cost

- Q4 destination creates specific growth opportunity
- But pursuing it requires resources/focus
- Other businesses may decline if neglected
- Example: Enterprise AI opportunity requires AI investment, sales growth, enterprise capability
- Outcome: Destination-aligned growth, other segment trade-offs

### Q6 — Recession / Resource Constraint

**Theme:** External pressure, execution under constraint, strategic prioritization

- Market contraction (recession, customer spending freeze, competitive pressure)
- Cash becomes scarce; every dollar allocation matters
- Strategic focus becomes survival lever
- Student allocation strategy proves its worth (or exposes weaknesses)
- Outcome: Cash runway, profit, strategic viability

### Q7 — Strategy-Dependent Operational Crisis

**Theme:** Execution stress, organizational strain, leadership choices

- Growth scaled company faces operational limits
- Talent, culture, systems stress become visible
- Different strategies create different crises
  - Consumer focus: Commoditization pressure, margin compression
  - Enterprise focus: Sales execution capability gaps
  - AI focus: Talent retention, technical debt accumulation
  - Balanced: All pressures simultaneously
- Student strategy chosen in Q4 determines Q7 crisis type
- Outcome: Profit, cash, capability, culture impact

### Q8 — Final Strategic/Future Decision

**Theme:** Active strategic choice, not just scoring

- NOT a passive "here's your score" screen
- Q8 should present a final strategic decision (e.g., "Sell company? Double down? Restructure?")
- Student choice in Q8 affects terminal outcome and score
- Outcome: Terminal financial score, strategic score, organizational score, final verdict

---

## 11. Q4 STRATEGIC DESTINATIONS

### Five Destination Options

Restore the original five destinations from pre-V1 audit:

1. **Consumer AI Learning Platform**
   - Thesis: AI-enabled consumer experience wins
   - Q5–Q8 economics: Consumer investment has higher payoff; AI capability critical
   - Risk: Commoditization; margin pressure if not differentiated
   - Upside: Large TAM, fast payoff

2. **AI-powered Enterprise Learning Company**
   - Thesis: Enterprise market values AI for workforce development
   - Q5–Q8 economics: Enterprise + AI investment synergize; higher margins
   - Risk: Slower build; execution dependency
   - Upside: Stickier, higher margin, defensible

3. **Premium Human + AI**
   - Thesis: Human expertise + AI augmentation is premium offering
   - Q5–Q8 economics: Balanced investment; talent and product quality critical
   - Risk: Expensive to maintain; margins compressed by talent costs
   - Upside: Defensible, high trust, resilient to disruption

4. **University/Credential Infrastructure**
   - Thesis: Institutional partnerships lock-in; credentials are sustainable moat
   - Q5–Q8 economics: Credential + partnership investment payoff; slow but stable
   - Risk: Slow growth; regulatory/institutional risk
   - Upside: High retention, institutional lock-in, recurring revenue

5. **Balanced Learning Marketplace**
   - Thesis: Diversification reduces risk; capture multiple segments
   - Q5–Q8 economics: All segments invested; no concentration bet
   - Risk: Jack of all trades; may not win in any segment
   - Upside: Resilient; can pivot based on evidence

### Destination Economics

Q1–Q3: Exploration and learning (students gather evidence)

Q4: Commitment choice (locks in strategic direction)

Q5–Q8: Economics respond to destination choice
- Different investments have different payoff
- Different capabilities become critical
- Different risks emerge
- Switching is possible but carries realistic transition costs

### Transition Costs

If student changes destination (e.g., Consumer Focus → Enterprise Focus mid-game):
- Prior consumer investments have reduced value
- Prior enterprise investments have increased value
- Execution load increases (pivot costs organizational capacity)
- Cash cost (restructuring, severance, asset write-downs)

**Principle:** Evidence-based adaptation should not be mechanically punished, but switching carries real costs.

---

## 12. LIQUIDITY AND FINANCING

### Cash Reality

Strategic investment must ultimately be funded from:
- Operating profit
- Available liquidity (cash reserve)
- Financing (external capital injection)

### When Cash Runs Short

If projected cash becomes insufficient:
- **Option A:** Reduce investment (scale back ambitions)
- **Option B:** Raise equity (dilute shareholders, slower future growth)
- **Option C:** Take debt (increase future obligations)
- **Option D:** Strategic partnerships (trade capital/control for resources)
- **Option E:** Cost restructuring (reduce opex, impact capabilities)
- **Option F:** Sell assets/business units (monetize but reduce optionality)

### No Arbitrary Insolvency Patch Yet

V2 does not yet define:
- When solvency triggers (< $0M? < $5M? < operating cost?)
- What happens when insolvency triggers (game over? restructuring? bankruptcy?)
- Financing mechanics detail (interest, dilution, terms?)
- Strategic partnership implications

**Plan:** Quantitative calibration phase will define these mechanics.

### Current Implementation Plan

V2 quantitative calibration will:
1. Define solvency thresholds
2. Specify financing options and costs
3. Model restructuring consequences
4. Validate against historical learning game precedent

---

## 13. SCORING ARCHITECTURE

### Three Dimensions (Retained from V1)

1. **Financial Score** — Revenue, profitability, cash runway
2. **Strategic Score** — Market position, capability, competitive advantage
3. **Organizational Score** — Talent, culture, execution capability

### V2 Change: Viability Gates

**V1 Mistake:** Catastrophic financial failure could be offset by strong organizational score.

**V2 Correct:** Add viability gates so extreme failure in one dimension cannot be offset by others.

Examples:

```
Financial Gate:
  If cash < −$50M (or other threshold), score clamped regardless of org strength
  
Strategic Gate:
  If no viable product/market fit signals, strategic score capped
  
Organizational Gate:
  If talent/culture collapse too far, organizational score capped
  
Combined:
  Final score = MIN(financial_component, strategic_component, organizational_component, terminal_viability)
```

### Exact Thresholds Not Yet Locked

V2 quantitative calibration will define:
- Gate thresholds
- Which metrics trigger gates
- Clamping logic (0? 20%? 50%?)

### Core Principle

Maximizing short-term financial performance while destroying strategic/organizational viability should have real consequences.

---

## 14. ASYMMETRIC LEADERSHIP INFORMATION

### Five Leadership Roles

Preserve the role-based voting system:

1. **CEO** — Board/strategy context, overall direction
2. **CFO** — Financial/runway information, capital constraints
3. **Product** — Product/technology/technical-debt information
4. **People** — Talent/culture/capacity information
5. **Growth** — Market/CAC/churn/pipeline information

### V2 Enhancement: Role-Specific Private Information

Each role receives **different leading indicators** before outcomes materialize.

Example:

```
Q5 (Major Growth Opportunity):

CEO sees:
  - Market opportunity summary
  - Board/investor expectations
  - Strategic implications
  
CFO sees:
  - Cash runway projections
  - Investment required by destination
  - Financing options (if needed)
  
Product sees:
  - Technical debt status
  - AI readiness (if Q4 choice was AI focus)
  - Product-market fit signals
  
People sees:
  - Attrition risk
  - Talent capacity for growth
  - Culture stress from transformation load
  
Growth sees:
  - CAC, churn, pipeline by segment
  - AI adoption rates
  - Market size shifts
```

### Voting Implication

With private information:
- CEO may want aggressive strategy; CFO sees cash risk
- Product sees technical debt; Growth sees market opportunity
- Voting becomes economically meaningful (not just rubber-stamp)
- Students learn that different perspectives see different risks

### Implementation Note

Private information display requires frontend changes; quantitative calibration phase will specify which metrics each role sees.

---

## 15. CORE DESIGN PHILOSOPHY

### No Universally Correct Strategy

The simulation teaches that outcomes depend on the **interaction** between:
- Market evidence (Q2 disruption, Q6 recession)
- Previous investments (Q1 allocation compounds to capabilities)
- Capabilities (determine what revenue improvements are possible)
- Strategic destination (Q4 choice locks economics)
- Execution (can amplify or squander investments)
- Financial position (cash constrains options)

### Strategy Archetypes

**Concentrated strategies can outperform Balanced when conditions support them:**

```
Example: Consumer AI Learning Platform (Q4 choice)
  If Q2 disruption → market toward consumer AI (good evidence)
  If Q3 confirms consumer AI adoption (good signal)
  If consumer investment compounds (good returns)
  Result: Concentrated strategy wins
  
But if market evidence contradicts:
  If Q2 disruption → market moves to enterprise (bad for consumer focus)
  If Q3 confirms enterprise outperforms
  Result: Concentrated strategy loses to balanced
```

**Balanced provides resilience but may sacrifice upside/focus:**

```
Example: Balanced Learning Marketplace
  All segments invested moderately
  Multiple revenue streams reduce risk
  But no segment gets enough investment to dominate
  Result: Resilient but may miss upside vs concentrated bets
```

**Cash preservation buys optionality but creates opportunity cost:**

```
Example: High cash reserve ($40M of $60M)
  Optionality: Can respond to crises, seize opportunities
  Opportunity cost: Competitors investing $50M beat us in feature/scale
  Result: Defensible but potentially outflanked
```

**Strategy switching can be correct when supported by evidence:**

```
Example: Start Consumer Focus, pivot to Enterprise Focus (Q5 after Q3/Q4 evidence)
  Cost: Transition costs, organizational load, asset write-downs
  Benefit: Align strategy to evidence, capture emerging opportunity
  Result: Pragmatic adaptation, realistic cost-benefit
```

### Teaching Point

**Strategy is not binary (correct/incorrect).** It's contextual:
- Same strategy works in some markets, fails in others
- Same strategy works with good execution, fails with poor execution
- Switching strategies based on evidence is sometimes right, sometimes wrong
- There is no predetermined "correct" path

---

## 16. STUDENT EXPERIENCE

### Interface Principle

**Keep the interface simple despite deeper economics.**

Students should see roughly **10–12 decision-relevant KPIs/signals**, not the full internal model.

### Student-Facing Metrics (Examples)

1. **Revenue** — Overall and by segment
2. **Operating Profit** — Financial health
3. **Cash** — Liquidity runway
4. **Stock Price** — Valuation signal
5. **Capabilities** (3–5 highest priority) — Strategic strengths
6. **Transformation Load** — Execution risk signal
7. **Leading Indicators** (2–3 per role) — Evidence signals
8. **Strategic Clarity** — Q4 destination choice
9. **Culture/Talent** — Organizational health
10. **Market Position** — Competitive standing

### Information Flow

**Q1–Q3:** Build up leading indicators (students gather evidence)

**Q4:** Commit to destination (strategic choice)

**Q5–Q7:** Leading indicators flow through to lagging outcomes (consequences materialize)

**Q8:** Final outcome + active decision

### Governing Principle

**Easy interface. Difficult decisions.**

Simple KPIs and clean interface hide complex tradeoffs:
- Investing in AI requires talent (but attrition risk rises)
- Pursuing growth requires cash (but runs out in recession)
- Balanced strategy is safe (but lacks focus to win any segment)
- Following evidence is pragmatic (but switching has real costs)

Students make real strategic choices using simple tools, then face real consequences.

---

## IMPLEMENTATION SEQUENCING (V2 Phases)

### Phase 1: Quantitative Calibration (Next)
- Define solvency thresholds
- Specify segment revenue models
- Set capability payoff curves
- Lock scoring gates and thresholds

### Phase 2: Bug Fixes & Core Refactor (After calibration)
- Fix Q7 formula (operatingCost → operatingProfit)
- Fix Q8 formula (align with operating profit semantics)
- Remove Q2 floor; enable negative cash
- Implement four-segment revenue model

### Phase 3: Capability Refactor (Incremental)
- Separate fixed/variable costs
- Implement transformation load concept
- Add organizational capacity mechanics
- Add capability dependency thresholds

### Phase 4: Q4 Destinations (Incremental)
- Restore five destination options
- Implement Q5–Q8 economics response to destination
- Add transition cost mechanics
- Validate destination differentiation

### Phase 5: Financing & Solvency (Incremental)
- Implement financing options (equity, debt, partnerships)
- Add solvency gate mechanics
- Model restructuring consequences
- Add bankruptcy/reset path if needed

### Phase 6: Role-Based Information (UI + Engine)
- Define role-specific private indicators
- Implement asymmetric information display
- Validate voting dynamics with private info

### Phase 7: Q8 Active Decision (UI + Engine)
- Convert Q8 from passive score screen to active choice
- Implement Q8 decision options (sell, restructure, scale, etc.)
- Tie Q8 choice to final score impact

---

## DOCUMENTATION STATUS

**ECONOMICS_V2_ARCHITECTURE.md** (this document)
- Approved specification
- No code changes yet
- Reference for all V2 implementation phases

**Next:** ECONOMICS_V2_QUANTITATIVE_CALIBRATION.md (to be created during phase 1 calibration)

---

**Economics V2 Architecture: LOCKED**  
**Approved:** 2026-09-25 17:45 UTC  
**Ready for:** V2 Quantitative Calibration Phase

No production code changes until quantitative calibration is complete.

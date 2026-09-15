# Pass 3B: Q3–Q8 Proposal
## Quarter-by-Quarter Storyline, Decisions, Consequences & Economic Logic

**Status:** For Approval Before Implementation  
**Baseline:** Commit `0de3743` (locked, passing all acceptance tests)  
**Scope:** Q3-Q8 narrative content, economic consequences, decision frameworks, role hints

---

## EXECUTIVE SUMMARY

### The 8-Quarter Arc

**Q1: Growth Looks Easy** (✓ Implemented)
- Market tailwind, no threats. Teams explore different bets.

**Q2: ChatGPT Arrives** (✓ Implemented)
- Market disruption. Consumer weakens, Enterprise wakes up, AI emerges.

**Q3: Market Consolidation** (→ Proposed)
- Shakeout begins. Weak players fade. Capabilities and cash management separate winners from losers.

**Q4: Destination Locked** (→ Proposed)
- Teams make irreversible strategic choice: Are you Consumer, Enterprise, AI-native, or balanced?
- Cannot pivot after Q4. Determines economic trajectory Q5-Q8.

**Q5: Early Validation** (→ Proposed)
- First quarter executing chosen strategy. Initial evidence it works or cracks.

**Q6: Competitive Response** (→ Proposed)
- Market competitors adapt. Crowded positions face new pressure. Defensible strategies shine.

**Q7: Integration Challenge** (→ Proposed)
- Scaling the chosen strategy tests organizational capabilities. Execution matters.

**Q8: Final Quarter** (→ Proposed)
- Market matures. Positions solidify. Winners and losers clear. Full scorecard.

---

## DESIGN PHILOSOPHY

### Key Principles

1. **Coherence > Balance**
   - Teams that commit to a clear strategy (aggressive AI, or premium consumer, or enterprise focus) can win decisively
   - Balanced-but-vague strategies underperform coherent bold bets
   - This mirrors the design principle locked in Pass 1

2. **Strategy Irreversibility**
   - Q4 is the pivot point: teams choose destination and lock in
   - Q5-Q8 forced to execute chosen strategy (no more switching)
   - This creates tension and learning: "Are you confident enough to commit?"
   - Forces reflection on whether earlier choices were coherent

3. **Consequences Compound**
   - Good allocation strategy in Q1-Q3 builds capabilities
   - Poor cash management early creates Q5-Q8 survival pressure
   - Role conflicts and misalignment surface in later quarters
   - Teams see the cost of their earlier decisions

4. **Role-Specific Tensions**
   - CEO: Strategy ownership, pivots vs. commitment
   - CFO: Cash runway, can we afford the chosen strategy?
   - Product: Building for chosen destination requires focus. Scope creep kills execution.
   - People: Talent retention hardens after Q4 lock (can't keep everyone)
   - Growth: Revenue model changes based on Q4 choice. What worked before won't work after.

---

## Q3: Market Consolidation

### Event Narrative
```
Six months into the ChatGPT era, the market is consolidating.

Early reactions to ChatGPT have shaken out weak competitors. Instructors are leaving traditional
platforms. Learners are trying free generative AI tools. Enterprise buyers are evaluating AI-enabled
alternatives. University partners are under pressure to respond to technology disruption.

Meanwhile, consolidation is happening in plain sight:
- Udacity pivots to enterprise focus (clear destination)
- LinkedIn Learning doubles down on enterprise (clear destination)
- Newer entrants (Scrimba, Brilliant) go after AI-native learners
- Regional platforms fade

Your Q1-Q2 choices are now visible to the market. Your capabilities, cash position, and strategic focus
(or lack thereof) determine whether you're building toward a defensible position or scrambling.

This quarter is about recognizing market reality and preparing for the locked choice in Q4.
```

### Available Capital
$30M (same as Q1-Q2)

### Decision Framework: Belief
```
Prompt: "After 6 months of market consolidation, where is your competitive advantage?"

Options:
- "consumer_quality": Premium consumer experience. Free AI can't replicate human teaching.
- "enterprise_ai": Enterprise + AI integration. We're uniquely positioned as a trusted platform.
- "ai_native": Pure AI-native learning. We're reimagining education for generative AI era.
- "mixed_market": We own multiple segments. Diversification is our strength.
- "uncertain": We're still figuring it out. More time needed.
```

### Decision Framework: Risks
```
Prompt: "What are the survival risks for your strategy?"

Options:
- "cash_burn": We're not cash-flow positive. Burning rate unsustainable.
- "talent_exodus": Best engineers/instructors leaving. Hard to execute.
- "capability_gap": Competitors ahead on AI/enterprise. Can't catch up.
- "market_shift": Q4 destination choice might be wrong. Betting on declining segment.
- "execution_misalignment": Team doesn't agree on strategy. Conflict in Q4 choice.
```

### Consequence Economics: calculateQ3Consequence

#### Revenue Model (Market-Driven)
```
Consumer Segment (-8% baseline)
- Market share concentrated among survivors
- Willingness to pay declining (free alternatives)
- Mitigation: Quality differentiation (Product Quality >= 70) reduces to -5%

Enterprise Segment (+8% baseline)
- Consolidation winner: enterprises choosing platforms now
- AI-enabled solutions commanding premium
- Your Enterprise capability matters: +0.5% per 10 points of Enterprise capability

AI-Native Segment (+35% baseline)
- Smaller base, but exploding
- Venture-backed startups chasing this segment
- Your AI capability unlocks this: only achievable if AI capability >= 25
```

#### Capability Changes
```
Consumer Capability:
- Baseline: -5 (market shift)
- Mitigation: Consumer allocation * 0.4 (harder to build than before)
- Result: Steady decline unless deliberately rebuilt (expensive now)

Enterprise Capability:
- Baseline: +6 (market opportunity)
- Boost: Enterprise allocation * 0.7 (market tailwind helps)
- Result: Enterprise becomes easier to build in Q3

AI Capability:
- Baseline: +4 (market maturation of tooling)
- Boost: AI allocation * 1.5 (high-value allocation now)
- Ceiling: +20 per quarter (cannot exceed 100)

Talent Capability:
- Decline: -2 (attrition pressure if not invested)
- Mitigation: People investment * 0.5
- Result: Must maintain investment to prevent exodus
```

#### Cash Impact
```
Operating Costs:
- Base: $170M (from Q2)
- AI spend adds $0.4M per $1M invested (R&D cost)
- Revenue % cost: 2% of new revenue (operational efficiency)

Cash Runway Threshold (Critical):
- If cash < $15M going into Q4, Q5-Q8 become survival mode
- Teams see: "You have 6 quarters of runway at this burn rate"
- Threshold trigger: "⚠️ Cash runway critical. You must achieve profitability in chosen strategy by Q7."
```

#### Stock Price
```
Market rewards:
- Clear strategic focus (+5% if allocation is focused, not scattered)
- AI investment (+8% if AI allocation > 5)
- Enterprise focus (+6% if Enterprise allocation > 8)

Market penalizes:
- Consumer-only focus (-8% if Consumer > 18 and others all < 5)
- Cash burn signaling (-5% if cash declined significantly)
- Unclear positioning (-3% if allocation scattered across all categories)
```

#### Thresholds & Narrative Callouts
```
If Consumer capability < 30:
  "⚠️ Consumer market slipping away. Hard to recapture after Q4 lock."

If Enterprise capability >= 50 and allocated Q1-Q3:
  "✓ Enterprise foundation solid. This could be your post-Q4 destination."

If AI capability >= 40:
  "✓ AI leadership emerging. Market sees you as AI-native player."

If cash < $20M:
  "⚠️ Limited fiscal flexibility for Q4. Your Q4 choice must be cash-generative."

If Culture < 60:
  "⚠️ Team stress mounting. Uncertain strategy is demoralizing. Q4 lock may help morale or demoralize if wrong."

If Execution alignment < 50:
  "⚠️ Role misalignment showing. Team disagrees on direction. Q4 vote will be contentious."
```

#### Narrative Template
```
Q3 reveals your actual position in a consolidating market.

Your Q1-Q2 choices have compounded. If you invested consistently in a direction,
you've built defensible capability. If you played it safe and balanced, you're now
in the middle—competitive against no one, strong against nothing.

Market dynamics:
- Consumer: [declining/stable/growing] based on your allocation and consumer capability
- Enterprise: [opportunity emerging/missed/captured] based on your enterprise focus
- AI: [leading/competitive/behind] based on your AI investment

Financial position:
- Cash runway: [X quarters]
- Product quality: [rating] — reflects your people investment
- Culture: [rating] — reflects team alignment and stress

Role tensions surface:
${ceoRole}: "Q4 we choose destination. Are we making the right bet based on Q1-Q3 evidence?"
${cfoRole}: "Cash matters. Can our chosen strategy become profitable by Q7?"
${productRole}: "We've been building in multiple directions. Q4 lock means focus. Are we ready?"
${peopleRole}: "Attrition risk. Team needs clarity on destination. Locked choice might reduce uncertainty."
${growthRole}: "Revenue model changes based on Q4 choice. Which market will we win in?"

Consequence: [Financial impact] | Capabilities: [Updated scores] | Stock: [Change]
```

---

## Q4: Destination Locked
### The Pivotal Quarter

### Event Narrative
```
Q4 is the strategic lock-in quarter. This is the moment teams move from exploration to commitment.

Everything from Q1-Q3 has been an extended evaluation period. Now the market is clear:
- Consumer is contracting (not growing)
- Enterprise is the fastest-growing segment
- AI is where differentiation happens
- Cash position determines how aggressive you can be

You must now choose: Are you building for Consumer excellence, Enterprise dominance,
AI-native innovation, or a deliberate balanced strategy?

This choice is irreversible. Q5-Q8 your revenue model, capability investments,
and financial sustainability lock based on this decision. You cannot pivot in Q5.

This is not a small bet. This is: "This is who we are, and we're betting the company on it."
```

### Design: The Irreversible Lock

#### Q4 Differs from Q1-Q2-Q3

**Q1-Q3:** Allocation choices are flexible. Teams can experiment.

**Q4:** Allocation choice is locked in as strategic commitment for Q5-Q8.
- Teams see: "This choice determines your revenue model Q5-Q8. No pivoting."
- Financially: Revenue recognition and cost structure change based on choice.
- Organizationally: Role expectations shift. People hired/retained based on destination.
- Competitively: Market sees your choice. Competitors respond.

#### Available Capital
$30M (same)

#### Decision Framework: Strategic Commitment (NEW)
```
Prompt: "Choose your destination for Q5-Q8. This allocation pattern defines your strategy."

Options (guided by Q1-Q3 evidence):
- "premium_consumer": Invest heavily in consumer (allocation: 18+ consumer, 5- enterprise, 3- AI)
  Economics: Lower margin, volume-based, high churn risk, moat = quality
  
- "enterprise_focus": Invest heavily in enterprise (allocation: 3- consumer, 15+ enterprise, 8+ AI)
  Economics: High margin, longer sales cycles, stickiness, moat = integration
  
- "ai_native": Invest purely in AI-native learning (allocation: 2- consumer, 4- enterprise, 20+ AI)
  Economics: Highest growth, highest risk, winner-take-most, moat = tech
  
- "balanced_market": Invest across all three (allocation: 10 consumer, 10 enterprise, 8 AI)
  Economics: Stable, moderate growth, diversified risk, moat = market presence
  
- "pivot": Abandon earlier strategy entirely and go aggressive in new direction
  Impact: Sunk investment Q1-Q3 partially wasted, but can retool for Q5-Q8
```

#### Role Vote: Q4 is especially contentious
```
CEO votes: Strategy ownership—did you make right Q4 choice?
CFO votes: Cash—can this strategy hit profitability Q7?
Product votes: Can we build it? Scope must match capability.
People votes: Do we have talent for this? Retention risk?
Growth votes: Is this market winnable?
```

#### Consequence Economics: calculateQ4Consequence

**Special Mechanics for Q4:**
```
1. Revenue model locks based on strategic choice
   - Consumer destination: 60% of revenue from consumer segment (lower margin = risk)
   - Enterprise destination: 55% from enterprise, 25% from AI-native
   - AI-native destination: 40% consumer (shrinking), 20% enterprise, 40% AI-native (growth)

2. Capability investment multiplier
   - Q5-Q8 effectiveness of allocation depends on Q4 choice
   - If you chose Enterprise but allocate consumer, effectiveness is 0.6x
   - Coherence matters: your allocation must match your strategy

3. Stock price reflects market confidence in choice
   - Coherent choice: +12% (market rewards clarity)
   - Misaligned choice: -8% (market doubts execution)
   - If roles unanimously agree: +5% bonus
   - If CEO overrode majority: -3% (market sees conflict)

4. Team culture impact
   - If choice matches team consensus (alignment score high): +5 culture
   - If CEO overrides team: -8 culture (team demoralized)
   - Talent retention risk: if culture < 50 after Q4, expect Q5 attrition

5. Cash consequences Q5-Q8
   - Q5-Q8 cash flows depend on revenue model of chosen strategy
   - Consumer strategy: faster cash burn, needs profitability urgently
   - Enterprise strategy: slower revenue ramp, longer runway
   - AI-native: highest burn, highest upside
```

#### Critical Narrative
```
Q4 Consequence Narrative:

"Your Q4 choice signals to market, team, and capital providers who you are.

Your team's alignment (or conflict) on this choice matters for Q5-Q8 execution.
If roles pulled together to lock in this destination, you're unified. If CEO overrode
significant dissent, team motivation is fragile.

Your evidence from Q1-Q3 matters: If allocation pattern already suggested this
destination, market sees continuity and confidence. If Q4 is a hard pivot,
market sees either brilliant adaptation or desperation.

Q5-Q8 are now determined. No more exploring. No more hedging.
You are [Consumer leader / Enterprise player / AI-native innovator / ???].
Everything Q5-Q8 is about executing that choice.

Financial sustainability hinges on this strategy being viable.
If your chosen market is shrinking, you have 4 quarters to become so efficient or
differentiated you survive. If your chosen market is growing, you have 4 quarters to capture it.

Let's see what happens next."
```

---

## Q5: Early Validation

### Event Narrative
```
Q5 is the first quarter of execution under your locked strategy.

The market responds to your Q4 choice:
- If you chose Consumer, buyers notice you're not chasing enterprise
- If you chose Enterprise, startups try to underprice you
- If you chose AI-native, incumbents release competitor products
- If you chose balanced, you blend in (safe, unremarkable)

Your capabilities have matured (or atrophied) based on Q1-Q4 investment.
Your cash position is what it is. Your team is either unified or fractured.

This quarter, you get early evidence: Is your strategy working?
```

### Consequence Economics: calculateQ5Consequence

#### Market Response to Your Q4 Choice
```
Consumer Destination:
- Market: -3% (free AI alternatives still growing, customers still trying)
- But: Product quality advantage means revenue retention (-3% vs -8% for others)
- Result: You lose market share to AI, but lose less than unfocused competitors

Enterprise Destination:
- Market: +12% (enterprises consolidating on platforms, willingness to pay high)
- Your enterprise capability gap vs. competitors matters: per 10 points, +1% boost
- Result: Strong revenue growth if you've built enterprise capability

AI-Native Destination:
- Market: +40% (pure growth market, not yet saturated)
- Your AI capability: per 10 points, +2% boost (high leverage)
- Result: Explosive growth if AI capability >= 40, but risky if < 30 (commoditized)

Balanced Destination:
- Market: Weighted average of above (5% overall)
- No exceptional opportunity, no exceptional risk
- Result: Stable, no excitement
```

#### Capability Coherence Penalty
```
If Q5 allocation doesn't match Q4 destination:
- Mismatch penalty: -15% on strategic revenue gains
- Example: Chose Enterprise in Q4, but allocate 12 to consumer in Q5
- This signals team/board disagreement on destination
- Stock price -8% (market sees incoherence)
```

#### Profitability Pressure
```
If chosen strategy doesn't naturally generate profit:
- Consumer strategy at 40M revenue needs OpEx < 30M
- Enterprise strategy at 220M revenue needs OpEx < 150M
- AI-native strategy at 100M revenue, needs OpEx < 60M

If strategy is not achieving profitability target:
- Stock price penalty: -5% per quarter off track
- Cash runway reduced by 1 quarter
- Team morale hit: -3 culture
```

#### Thresholds
```
If revenue growing 5%+ in chosen market: ✓ Strategy validating
If revenue flat/negative despite allocation: ⚠️ Strategy questioned
If cash runway drops below 4 quarters: 🚨 Survival mode triggered
```

---

## Q6: Competitive Response

### Event Narrative
```
Q5 proved your strategy is real, not theoretical.

Now competitors respond:
- If you chose Premium Consumer, Udacity and Coursera start aggressive pricing
- If you chose Enterprise, Microsoft, Salesforce, and others enter
- If you chose AI-native, every ed-tech startup pivots to compete
- If you were balanced, you have no clear advantage

Crowded markets get violent. Defensible positions pay off.
Weak positions get crushed.

Q6 is where weak execution becomes obvious.
```

### Consequence Economics: calculateQ6Consequence

#### Competitive Pressure by Destination
```
Consumer Destination:
- New competitor discount wars: -8% (unless product quality >= 75 for quality moat)
- Your differentiation (quality, instructor network, trust) matters
- Result: If you built quality/trust, +3% offset. If you didn't, -8% net.

Enterprise Destination:
- Microsoft and Salesforce release AI-learning modules: -5% enterprise growth
- Your integration depth and switching costs matter (Enterprise capability >= 60)
- Result: If enterprise capability >= 60, only -2% impact. If < 60, -8%.

AI-Native Destination:
- Venture-backed AI startups with better UX: -6% (pure technology competition)
- Your AI capability and execution matter: per 10 points > 50, reduce to -2%
- Result: Technology leaders win, followers lose.

Balanced Destination:
- Market sees you as "me too": -5% as competitors own specific segments better
- No moat, no advantage, steady erosion
```

#### Role Tensions Peak in Q6
```
Growth role pressure:
- "We're losing share. Need to pivot or discounts."
- Tension: CEO locked in Q4 strategy. No pivoting allowed.

Product role pressure:
- "Competitors have better features. We can't compete."
- Tension: Budget already allocated. Can't reallocate.

CFO pressure:
- "Cash runway shrinking. Need profitability now."
- Tension: Strategy may not be profitable yet.

People role pressure:
- "Talent attrition accelerating. Uncertainty killing morale."
- Tension: Can't hire fast enough to scale.
```

#### Stock Price Reality Check
```
If competitive position strong: +8%
If competitive position weak: -12%
If culture shows stress (role conflict): -5%
If cash runway < 3 quarters: -10%
```

---

## Q7: Integration Challenge

### Event Narrative
```
You've committed to a strategy for 3 quarters now.

Q7 asks: Can you actually scale it?

Scaling isn't just more customers. It's:
- Can your organization handle 10x volume?
- Do you have the talent?
- Are your systems robust?
- Can you maintain quality while scaling?
- Will your chosen market support this volume?

Q7 reveals whether your strategy was smart or just lucky.
```

### Consequence Economics: calculateQ7Consequence

#### Execution Capability Becomes Critical
```
Execution Alignment score (hidden 0-100) now determines scaling success

If Execution >= 80: Can scale chosen strategy +8%
If Execution 60-80: Can scale chosen strategy +4%
If Execution < 60: Scaling reveals cracks: -5% (talent shortage, system failures)

Example:
- High alignment: Team unified, scaled effectively, revenue gained
- Low alignment: Team fighting over direction, scaling causes culture damage, revenue gained less
```

#### Capability Limits
```
Scaling revenue by 20% requires underlying capabilities to support it

If your Consumer capability is 35 but you need to scale consumer revenue 20%: -6% (can't keep up)
If your Enterprise capability is 65 and you're scaling enterprise 20%: +3% (systems ready)
If your AI capability is 50 and scaling AI revenue 20%: -2% (marginal—bleeding out)
```

#### Final Cash Runway Assessment
```
At Q7, teams see: "What's left?"
- If on track for Q8 profitability: ✓ Runway sufficient
- If not: 🚨 Q8 is make-or-break

Cash consequences:
- Strategy working and cash strong: No penalty, +2% for confident market outlook
- Strategy working but cash tight: -5% (market sees survival pressure)
- Strategy not working and cash tight: -15% (market sees doom)
```

---

## Q8: Final Quarter

### Event Narrative
```
Eight quarters. One market cycle. Final outcomes visible.

By Q8, winners and losers are clear:
- Did your consumer strategy capture enough loyal users to be sustainable?
- Did your enterprise strategy build deep enough integrations to justify premium pricing?
- Did your AI strategy achieve enough differentiation to be defensible?
- Did your balanced strategy... hold market share?

Q8 is not about new decisions. It's about reflection.

What worked? What didn't? What would you change if you could go back?

That's the learning: Strategy is visible only in hindsight. You made the best decision
you could with available information, but hindsight always shows where you were wrong.
```

### Consequence Economics: calculateQ8Consequence

#### Terminal Value Calculation
```
Q8 revenue reflects full execution of chosen strategy across 8 quarters

Revenue scenarios by strategy:
- Consumer destination: $180-240M (depends on quality/retention; more volatile)
- Enterprise destination: $250-320M (depends on sales cycles; more stable)
- AI-native destination: $200-280M (depends on market adoption; volatile)
- Balanced destination: $210-260M (middle ground, moderate volatility)

Operating profit:
- Consumer: 30-40% margin (high variable cost, customer acquisition)
- Enterprise: 45-60% margin (high gross margin, scalable)
- AI-native: 35-50% margin (tech margin, but R&D heavy)
- Balanced: 38-48% margin (blended)

Terminal stock price:
- Based on revenue multiple, growth rate, profitability, cash position
- Market multiple: 8-15x EBITDA depending on growth and profitability
```

#### Role Retrospective
```
Each role evaluates Q4 lock-in choice:

CEO: "Strategic clarity helped or hurt execution?"
CFO: "Was chosen strategy profitable?"
Product: "Did we innovate ahead of competition?"
People: "Did we attract and retain right talent?"
Growth: "Did we capture our target market?"
```

#### Thresholds & Outcomes
```
Winner outcomes:
- Revenue > $280M, EBITDA margin > 40%, cash > $50M
- Market leader in chosen segment
- Execution alignment > 75
- Team unified, culture strong

Survivor outcomes:
- Revenue $200-280M, EBITDA margin 25-40%, cash $20-50M
- Competent player, not leader
- Defensible position, not growing
- Team somewhat fractured, culture stressed

Failure outcomes:
- Revenue < $200M, EBITDA margin < 15%, cash < $20M
- Forced to sell, merge, or shut down
- Strategy didn't work or execution failed
- Team demoralized, high attrition
```

#### Final Narrative
```
Eight quarters. You made 8 allocation choices, 8 strategic decisions, 8 role votes.

Your Q4 lock-in choice determined who you became. It was the right choice or the wrong choice.
If it was right, you're now profitable, growing, and market leader in your segment.
If it was wrong, you're struggling, and fourth place was always the ceiling.

This is what strategy is: choosing who you will become and what you're willing to sacrifice
to get there. Your choices revealed your conviction, or your confusion.

Next time, you'd do some things differently. We all would.

---

Lessons from your journey:
- Your allocation choices compounded across quarters
- Misalignment between declared strategy and allocation always costs
- Capabilities take time to build. Burning cash to build them faster has limits.
- Cash runway is a constraint you must respect. Running out of money is game over.
- Role consensus or CEO override shapes execution quality
- Markets reward focused strategies, punish hedged bets
- Irreversible choices (Q4 lock) force clarity and commitment

Thank you for playing. What did you learn?
```

---

## DESIGN SUMMARY: Q3-Q8 Economics & Architecture

### Unchanged from Q1-Q2
- Allocation budget: $30M per quarter (6 categories: consumer, enterprise, AI, people, credential, customer success/marketing)
- Diminishing returns: same function (100% → 80% → 60% → 40%)
- Capability ceiling: 100
- Role voting: CEO, CFO, Product, People, Growth (same)
- Team check: unanimous or override allowed (same)
- Session persistence: no changes

### New for Q3-Q8
- **Q4 Lock Mechanic**: Strategic choice is locked, no more pivoting
- **Destination-Aware Revenue**: Revenue model changes based on Q4 choice
- **Coherence Scoring**: Allocation must match strategic choice or penalty applied
- **Profitability Thresholds**: Strategy must achieve profitability by Q7 or cash runs out
- **Competitive Pressure**: Q6-Q8 reflect market response to strategy choice
- **Execution Scaling**: Q7 tests whether team can actually execute at scale

### Consequence Engines Needed
- `calculateQ3Consequence`: Market consolidation, capability decay, cash pressure
- `calculateQ4Consequence`: Strategic lock-in, irreversible choice, team moat
- `calculateQ5Consequence`: Early validation, market tailwind/headwind, capability coherence
- `calculateQ6Consequence`: Competitive response, differentiation payoff, role tensions
- `calculateQ7Consequence`: Scaling challenge, execution alignment, final cash runway
- `calculateQ8Consequence`: Terminal value, profitability, role retrospective, lessons

### Decision Content (gameplay.json)
Each quarter needs:
- **event**: Narrative describing market situation
- **belief**: Prompt asking teams to interpret market
- **risks**: Identify key risks specific to their strategy
- **reflect**: Prompt asking teams to assess their position

### Role Hints (gameplay.json)
Each quarter needs role-specific guidance based on strategy and financial position

---

## APPROVAL CHECKLIST

Before proceeding with implementation, confirm:

- [ ] Q3-Q8 narrative arc is coherent and aligns with education/ed-tech market knowledge
- [ ] Q4 "locked choice" mechanic feels like meaningful tension/consequence (not just gimmick)
- [ ] Revenue models by strategy are realistic and differentiated
- [ ] Economics punish scattered/incoherent strategies and reward focused bets
- [ ] Role tensions and decision prompts feel authentic to business leadership conflicts
- [ ] No changes to Q1/Q2 economics or session/persistence architecture
- [ ] Consequence functions are implementable in TypeScript (no exotic calculations)
- [ ] Terminal value and scorecard calculations align with initial $200M baseline

---

## NEXT STEPS (if approved)

1. Implement consequence engines in simulation/engine.ts
2. Populate gameplay.json with Q3-Q8 narrative, beliefs, risks, role hints
3. Hook consequence engines to GameScreen/ConsequenceScreen
4. Test with full 8-quarter run-through
5. Validate role-vote impact on outcomes
6. Acceptance test: play through full 8 quarters, verify learning arc


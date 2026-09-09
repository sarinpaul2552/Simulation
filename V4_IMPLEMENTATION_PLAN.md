# V4 IMPLEMENTATION PLAN — REVISED

**Status:** READY FOR APPROVAL  
**Date:** September 9, 2026  
**Approach:** Thin vertical prototype first, then full build (not sequential phases)

---

## EXECUTIVE SUMMARY

V4 is a fundamental redesign of V3. Rather than an 8-week sequential build, this plan proposes:

1. **Vertical Prototype (Week 1–2):** Build Q1 → role voting → Team Check → commit → Q2 callback to validate architecture
2. **Full Build (Weeks 2–4):** Extend to Q1–Q8 once prototype proves data model and decision flow
3. **Testing & Launch (Week 4–5):** Balance testing, facilitator guide, deployment

**Core V4 Design:**
- **Gameplay Loop**: BET → BELIEF → RISK → ROLE VOTE → TEAM CHECK → COMMIT → CONSEQUENCE → REFLECT
- **Decision Model**: Capital allocation with role-specific voting (not multiple-choice)
- **Persistence**: All decisions, beliefs, risks, votes, and overrides tracked and called back
- **Economy**: Capabilities that persist across quarters, diminishing returns, role-vote consequences, dynamic Q8
- **Narrative**: Q4 is genuinely irreversible (teams adapt execution, but cannot switch destination)
- **Debrief**: Personalized \"Believed → Did → Happened\" timeline + scorecard

---

## 1. V3 PRESERVATION & RECOVERY

**V3 will be tagged and branched for permanent recovery:**
- Create Git tag: `v3-final` (marks stable V3 release)
- Create Git branch: `release/v3` (if hotfixes needed)
- Entire V3 codebase + assets remain accessible
- V4 development proceeds on `main`
- Both versions deployable independently

This is **not** a folder-convention backup; it is a proper release artifact.

---

## 2. V4 DATA MODEL

### Core Structure
```
Team {
  capabilities: {
    consumer: 0–100
    enterprise: 0–100
    ai: 0–100
    talent: 0–100
    credential: 0–100
    customerSuccess: 0–100
    growth: 0–100
    execution: 0–100 (hidden alignment score)
  }
  financials: { revenue, cash, operatingProfit, stockPrice }
  quality: { productQuality, culture, trust }
  strategy: { q4Commitment, modelMixTarget, modelMixActual }
  decisions: array[8] {
    quarter, allocation, belief, risks, roleVotes, teamCheck, outcome, reflection
  }
}
```

### Key Fields to Persist
- **allocation**: Where the $X Million was spent (per category)
- **belief**: What team expected to happen (text response)
- **risks**: 1–3 identified risks (array with severity)
- **roleVotes**: Each role's YES/NO/ABSTAIN + rationale
- **teamCheck**: Was it unanimous? If override, which roles dissented?
- **outcome**: Financial changes, capability changes, callbacks to risks
- **reflection**: What team learned (text response, flagged if evidence-based adaptation)

---

## 3. CORE MECHANICS

### Diminishing Returns (per quarter, per category)
- $0–5M: 100% effective
- $6–10M: 80% effective
- $11–15M: 60% effective
- >$15M: 40% effective

### Persistent Capabilities
- Each $1M effective investment adds persistent capability points
- Capabilities compound across quarters
- Capped at 100
- Subject to decay if not maintained (post-Q4, per strategy)

### Capability Thresholds
- 0–24: Weak
- 25–44: Developing
- 45–64: Competitive
- 65–79: Strong
- 80–100: Leading

### Execution Alignment Multiplier
- Calculated from whether allocation reinforces declared strategy
- 80–100 alignment: 1.10× 
- 65–79: 1.05×
- 45–64: 1.00×
- 30–44: 0.92×
- <30: 0.85×

### Role-Vote Consequences
- Aligned discussion: Execution +2
- Debated but agreed: Execution +1 (if concern addressed)
- Override that materializes risk: Culture −4, Trust −4, Execution −3
- Override that succeeds: Execution +2

---

## 4. QUARTERLY MECHANICS (Q1–Q8)

### Q1–Q3: Foundation + Disruption
- Build capabilities through allocation
- Market events test strategy
- Belief/risk identification stored
- Role votes + team check capture alignment

### Q4: Irreversible Choice
- Team chooses strategic destination (AI Platform, Enterprise L&D, etc.)
- Destination-specific capability boost
- Transformation capital ($25M–$50M) invested
- Cannot be easily reset, but can be abandoned at cost later

### Q5–Q6: Opportunity + Pressure
- Q5: Flagship contract (win probability engine from capabilities + investment)
- Q6: Recession + ROI proof (Enterprise can expand if ROI is strong)

### Q7: Financing Crisis (Conditional)
- Only if cash runway <2 quarters
- Choices: Equity, debt, cost-cuts, strategic partner, slow expansion
- Cost-cuts have capability/culture consequences
- Talent-loss risk engine from People cuts + Culture state

### Q8: Dynamic Consequence + Recovery
- Event selected from strongest unresolved consequence (talent loss > cash crisis > customer fail)
- Recovery capital calculated from actual cash state
- Recovery actions can address the crisis but at cost
- Ends with reflection on what was learned

---

## 5. CALLBACKS & CONSEQUENCES

### Callback Engine
When an outcome is calculated, check:
1. **Risk materialization**: Did a risk identified in Q1–Q7 actually occur?
   → Display: \"You identified [risk]. [Role] voted NO. Leadership overrode. Result: [outcome].\"
2. **Belief validation**: Did the team's belief match the actual outcome?
   → Display: \"You expected [belief]. Reality: [outcome]. New lesson: ...\"
3. **Dissent validation**: Did a dissenting role's concern turn out to be right?
   → Apply: Culture −4, Trust −4, Execution −3 (in addition to business consequence)
4. **Override success**: Did an override lead to success despite opposition?
   → Apply: Execution +2, CEO +decision-quality bonus

### Narrative Generation
- Combine callbacks into a single consequence narrative
- Example: \"Consumer revenue fell 6% (market effect) but recovered 2% (your brand strength). ChatGPT impact: −4% net. You expected noise. New data: threat. Your Q2 belief was wrong.\"

---

## 6. FINAL DEBRIEF

### Personalized Timeline
Generate a narrative card per quarter:
```
Q1: Growth Looks Easy
  BELIEVED: \"Consumer market is stable.\"
  DID: Allocated $25M Consumer, $5M cash
  HAPPENED: Revenue $210M. Confidence gained.

Q2: ChatGPT Arrives
  BELIEVED: \"This is noise.\"
  DID: Allocated $23M Consumer, $0M AI
  HAPPENED: Consumer revenue −6%. Regret.

[...8 quarters...]

Q8: Consequence
  EVENT: Talent crisis from Q5 People cuts
  BELIEVED: \"Quick recovery fix.\"
  DID: Allocated $7M Retention, $5M cash
  HAPPENED: Talent stabilized. Culture recovered +3.
```

### Scorecard
Dimensions (ranked 1–4, not scored 0–100 visible):
- Financial Health
- Growth & Market Position
- Product/AI Capability
- Culture & Leadership
- Strategic Coherence
- Strategic Adaptability
- Leadership Quality

Awards (where earned):
- \"Most Coherent\" — stayed true to Q4, executed consistently
- \"Best Pivot\" — changed direction, evidence-supported, succeeded
- \"Best Bet\" — largest successful investment
- \"Hardest Lesson\" — most expensive wrong assumption

---

## 7. TECH STACK (APPROVED CONFIGURATION)

### Frontend (Static Deployment)
- **Framework**: React (TypeScript)
- **Build**: Vite → static HTML/CSS/JS
- **Styling**: Tailwind CSS
- **State**: React Context + custom hooks
- **Deployment**: Vercel or Hostinger (static hosting, no Node server)

### Backend (Supabase Only)
- **Database**: PostgreSQL (Supabase Cloud)
- **Auth**: Supabase Auth
- **Realtime**: Supabase subscriptions (facilitator leaderboard)
- **RLS**: Row-level security (teams see only own data)

### Simulation Engine (Portable)
- **Location**: Client-side, not Supabase-dependent
- **Consequence**: Entire game logic can be extracted and tested independently
- **Future-Proof**: Backend replaceable without rewriting simulation

### Architecture Constraint
- **No Node Server**: Frontend remains static HTML/CSS/JS
- **Hostinger Compatible**: Deployable as flat files
- **Simulation Portable**: Game logic not tied to Supabase

---

## 8. CRITICAL IMPLEMENTATION DECISIONS (APPROVED)

### Decision 1: React (Approved)
- V3 vanilla JS works for simple forms
- V4 complex state (voting → reveal → override → callbacks → Q8 → debrief) requires React
- React Context + hooks sufficient; no Redux needed

### Decision 2: Supabase (Approved)
- PostgreSQL for complex queries
- RLS for access control
- Realtime for leaderboard
- Eliminates server ops

### Decision 3: V3 Preservation (Proper Release)
- Tag: `v3-final` (permanent snapshot)
- Branch: `release/v3` (for hotfixes)
- V4 on `main`
- Both recoverable

### Decision 4: Static Frontend
- Frontend = Vite → static files (no Node server)
- Simulation engine = client-side logic
- Supabase = persistence + auth only
- Backend replaceable anytime

---

## 9. VERTICAL PROTOTYPE APPROACH (Weeks 1–5, Not 8-Week Sequential Build)

**Key Principle**: Build thin vertical slice first, validate architecture, then extend to full game.

### Phase 1: Q1 Prototype (Weeks 1–2)
**Goal**: Prove data model and decision flow with one complete quarter cycle.

**Scope (Q1 Only):**
- Facilitator setup screen
- 2–3 teams join session
- Facilitator presents Q1 event
- **Team Workflow:**
  1. BET screen (allocation form, $30M constraints)
  2. BELIEF screen (multiple-choice prompt)
  3. RISK screen (identify 1–3 risks)
  4. ROLE VOTE screen (5 roles, YES/NO/ABSTAIN)
  5. TEAM CHECK screen (reveal votes, alignment logic, override option)
  6. COMMIT screen (lock decision)
  7. CONSEQUENCE screen (show results + **test callback to prior risk**)
  8. REFLECTION screen (tailored prompt)

**Key Validations:**
- ✅ Allocation form enforces 100% total
- ✅ Role voting privacy → reveal works
- ✅ Alignment calculation + override logic
- ✅ **Callback engine** (\"You identified [risk]. [Role] voted NO. Result: [outcome]\")
- ✅ Supabase persistence (refresh test)
- ✅ Facilitator leaderboard real-time

**Output**: Working Q1 cycle. If it works, Phase 2 is unblocked. If it breaks, architectural issues exposed early (cheap to fix).

### Phase 2: Full Build Q1–Q8 (Weeks 2–4)
**Only start after Phase 1 sign-off.**

Extends prototype to all quarters:
- Q2–Q7 decision flow (repeats Q1 cycle)
- Q4 Strategic Commitment (conditional choices)
- Q5 Flagship contract (win probability engine)
- Q6 Recession (ROI proof mechanics)
- Q7 Financing (mandatory if cash <2 quarters)
- Q8 Dynamic event (scan unresolved consequences)
- Full economics engine (diminishing returns, capabilities, lags, thresholds)
- Final debrief (\"Believed → Did → Happened\" timeline + scorecard + awards)

**Deliverable**: Complete Q1–Q8 simulation.

### Phase 3: Testing & Launch (Week 4–5)
- Run 1000s of simulated paths
- Verify no dominant strategy
- Balance all archetypes (AI-heavy, Enterprise, Consumer, Human/Quality, Credential)
- Verify all deterministic awards work
- Facilitator usability test
- Deploy to Vercel + Supabase
- Facilitator guide + student how-to
- Tag V3 as `v3-final`

**Total Timeline: 5 weeks (not 8-week sequential phases)**

---

## 10. LOCKED DECISIONS (No Longer Ambiguous)

### 1. Q4 Reversal: Genuinely Irreversible
- **Decision**: No full reversal. Q4 is the point of the game.
- **Mechanic**: Teams choose a destination (AI Platform, Enterprise L&D, etc.). They can adapt *execution* within that destination across Q5–Q8 (e.g., shift allocation, change customer success focus), but **cannot switch company identity**.
- **Why**: The core teaching is strategy coherence. Changing who you are mid-stream defeats the lesson.

### 2. Capability Decay: Only Post-Q4, Only Core Capabilities
- **Trigger**: Only post-Q4. Only for strategically important capabilities (those central to Q4 choice).
- **Rule**: If a core capability receives <$3M equivalent support for 2 consecutive quarters, decay by 3 points/quarter thereafter.
- **Scope**: Not automatic for all capabilities; only those explicitly tied to chosen destination.
- **Example**: AI-Platform team chooses AI capability. If AI investment drops below $3M for Q6 and Q7, AI capability decays −3/quarter starting Q8.

### 3. Investment Lags: Category-Specific
- **Consumer/Marketing**: Same quarter or next quarter effect (immediate or Q+1)
- **Enterprise Sales**: Mostly 1-quarter lag (Q1 spend → Q2 revenue effect)
- **University/Credentials**: Mostly 2-quarter lag (longer sales cycles, accreditation delays)
- **AI/Product**: Capability builds immediately, but commercial payoff depends on thresholds/events (not automatic Q+1)
- **People/Quality**: Mostly immediate (talent hires, quality improvements take effect same quarter)
- **Customer Success**: 1-quarter commercial effect (Q1 spend → Q2 retention/expansion benefit)

### 4. Q5 Contract: Automatic Revenue Recognition
- **If Won**: Implementation starts in Q6 by default (automatic, not manual).
- **Cash Flow**:
  - $3M implementation cash arrives at contract signing (Q5)
  - Recurring $2.5M/quarter revenue recognized starting Q6
  - Continues for 12 quarters (Q6–Q17, but game ends Q8)
- **No Manual Accounting**: Teams do not manually choose when revenue is recognized. System handles it automatically.

### 5. Deterministic Outcomes: Same State = Same Result
- **Rule**: Same financial state + same decision = same outcome (no RNG variance).
- **Session Seeding**: Only use session seed for borderline outcomes (e.g., 45% win probability contract becomes deterministic within that range per session).
- **Fairness**: Preserves competitive fairness (teams can't reverse-engineer by trying 10 times) while ensuring reproducibility.

### 6. Role Assignment: Fixed for 8 Quarters
- **Mechanism**: Each team member assigned one role (CEO, CFO, Product, People, Growth) at start.
- **Duration**: Same role for all 8 quarters.
- **Why**: Develops role ownership, interpersonal dynamics, and accountability. Teams must learn to work within their assigned roles.
- **Assignment Method**: Facilitator assigns or teams self-select; system doesn't randomize mid-game.

### 7. Belief/Risk Prompts: Provided Separately
- **Content**: Sarin will provide the full Q1–Q8 belief and risk prompt library separately (not for Claude to invent).
- **Scope**: Covers all 8 quarters, all major game moments, all strategic decision contexts.
- **Integration**: Claude receives these prompts as configuration input; does not generate them.
- **Why**: These are pedagogy/content decisions, not implementation details. Require careful author review.

### 8. Awards: Mostly Deterministic
- **Deterministic Examples**:
  - \"Highest Shareholder Return\" (highest final stock price)
  - \"Best Evidence-Based Pivot\" (flagged by system as intentional strategy change after contradictory evidence)
  - \"Most Coherent\" (high consistency score, stayed true to Q4 destination)
  - \"Most Resilient\" (weathered most consequences with stable culture)
- **Facilitator Discretionary (One Maximum)**:
  - \"Best Boardroom Debate\" (facilitator picks team with most authentic, productive role conflict)
- **Rule**: System calculates deterministic awards. Facilitator adds one optional award.

### 9. Facilitation Model: Synchronous Classroom First
- **Primary**: Optimized for real-time, in-person facilitator + team debating live.
- **Architecture**: Build to allow async later, but V4 does **not** require async (no email/Slack workflow yet).
- **Session Control**: Facilitator advances quarters, controls leaderboard reveal, can pause to discuss.
- **Why**: Role voting + Team Check + override consequences work best live, with facilitator moderating.

---

## 11. ARCHITECTURE CONSTRAINTS (Hard Requirements)

### Frontend Deployment
- **Static Build**: Frontend must remain deployable as **static HTML/CSS/JS** on Hostinger.
- **No Node Server Required**: Simulation engine runs client-side. No continuous Node process on server.
- **Implication**: All game logic, decision calculations, consequence generation = client-side. Supabase is for auth/persistence only.

### Backend Flexibility
- **Supabase Role**: Authentication, session management, decision persistence, facilitator access control.
- **Portable Simulation Engine**: Game logic (economics, capabilities, consequences) is **not** Supabase-dependent.
- **Replacement Path**: Backend can be swapped (e.g., Supabase → custom server → another BaaS) without rewriting simulation.

### Why This Matters
- Keeps deployment portable (Hostinger is cheap; scaling doesn't require server migration)
- Simulation logic remains testable, reusable, and independent
- Aligns with your earlier requirement for Hostinger + portable architecture

---

## 13. SUCCESS CRITERIA

### Functional
- [ ] All 8 quarters playable end-to-end
- [ ] Role voting works correctly (private → reveal → alignment)
- [ ] Callbacks accurately match outcomes to prior decisions
- [ ] Q8 dynamic event reflects team's actual Q1–Q7 state
- [ ] Final debrief timeline is personalized
- [ ] Supabase persistence + refresh recovery
- [ ] Facilitator dashboard real-time updates

### Game Design
- [ ] No single allocation strategy dominates >40% of scenarios
- [ ] ≥4 distinct archetypes are viable winners
- [ ] Financial outcome ≠ Leadership outcome (regularly)
- [ ] Evidence-based pivots are rewarded (not penalized as \"whipsaw\")
- [ ] Overrides feel fair; success despite dissent is possible

### UX/Pedagogy
- [ ] Allocation form understandable without 10-min instruction
- [ ] Role voting feels meaningful
- [ ] Callbacks create \"aha\" moments
- [ ] Final debrief is memorable + reflective
- [ ] Facilitator can run 60–90 min session without stumbling

---

## 14. APPROVAL CHECKLIST (FOR SARIN)

All 9 ambiguities have been **locked** (Section 10). Awaiting:

- [ ] **Belief/Risk Prompts Library** (Q1–Q8 provided separately)
  - These are pedagogical content, not engineering details
  - Claude will integrate them as configuration input
  
Once locked prompts are provided, all blocking items are resolved.

**Ready to Proceed:**
- [ ] Data model approved (Section 2)
- [ ] 9 decisions locked (Section 10) ✅
- [ ] Architecture constraints approved (Section 7)
- [ ] Vertical prototype approach approved (Section 9)
- [ ] Prompts provided (awaiting separate delivery)

**Then Phase 1 begins immediately.**

---

## APPENDIX: WHAT CAN BE REUSED FROM V3

✅ **Reusable:**
- Facilitator dashboard layout
- Quarter progression pattern
- Business model portfolio concept
- Leaderboard component architecture
- localStorage pattern (v1)
- Vite build setup
- Tailwind CSS system
- Vercel deployment

❌ **Must Replace:**
- Formula-based revenue (V4 hides it)
- Stock price multiplier model (V4 uses alignment score)
- Decision form (multiple-choice → allocation + voting)
- Consequence calculation (simple → complex engine)
- Role mechanics (no voting → full voting system)
- Belief/risk tracking (none → implemented)
- Callbacks (none → implemented)
- Final debrief (simple scores → personalized timeline)

---

**END OF IMPLEMENTATION PLAN**

# V4 Business Simulation - Pass 1 Vertical Prototype Setup

**Status:** Ready to Deploy and Test  
**Built:** Pass 1 Complete (Q1 → Q2 Callback)  
**Date:** September 2026

---

## QUICK START

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier OK for prototype)
- Vite (included in dependencies)

### 1. Install Dependencies

```bash
cd /mnt/project
npm install
```

### 2. Create Supabase Project

1. Go to https://supabase.com
2. Create a free project
3. Copy your Project URL and public anon key
4. Run the schema SQL:
   - Go to SQL Editor in Supabase
   - Open `/mnt/project/database/schema.sql`
   - Copy entire SQL and run it in Supabase SQL editor
   - Confirm all tables created (sessions, teams, decisions, access_log)

### 3. Environment Setup

Create `.env.local` in project root:

```
VITE_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
VITE_SUPABASE_KEY=[YOUR-PUBLIC-ANON-KEY]
```

### 4. Run Development Server

```bash
npm run dev
```

Server will start at `http://localhost:5173`

---

## VERTICAL PROTOTYPE FLOW

### For Facilitators

1. Visit `http://localhost:5173`
2. Click "Facilitator"
3. Enter email, choose # of teams, name teams
4. System creates session + returns session code (e.g., `ISB-ABC123`)
5. Share code with team members
6. Facilitator view shows:
   - Session code
   - Current quarter (Q1)
   - "Show Event" button
7. Click "Show Event" to reveal Q1 narrative to teams
8. Teams proceed through Q1 flow (see below)
9. Once all teams lock commitment, facilitator can advance to Q2

### For Team Members

1. Visit `http://localhost:5173`
2. Click "Team Member"
3. Enter session code (from facilitator)
4. Enter team name
5. Team enters game, assigns random role (CEO/CFO/Product/People/Growth)
6. See Q1 event on dashboard
7. Progress through phases:
   - **BET**: Allocate $30M across 8 categories using sliders
   - **BELIEF**: Select market hypothesis
   - **RISK**: Identify up to 3 risks with severity ratings
   - **ROLE VOTE**: Cast YES/NO/ABSTAIN vote (private, then reveal)
   - **TEAM CHECK**: See alignment, choose override if dissenters
   - **COMMIT**: Final review before locking
   - **CONSEQUENCE**: See Q1 results + callbacks to risks/beliefs
   - **REFLECT**: Answer reflection prompt
8. Automatically advance to Q2 (ChatGPT event)
9. Repeat for Q2 (simplified for prototype)

---

## WHAT WAS BUILT - Architecture

### Directories & Files

```
/mnt/project/
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Main app router
│   ├── App.css                  # Styling (navy, acid yellow, sand)
│   ├── context/
│   │   └── GameContext.tsx      # React Context for game state
│   ├── components/
│   │   ├── SetupScreen.tsx      # Facilitator/team session creation
│   │   ├── GameScreen.tsx       # Team gameplay flow
│   │   ├── FacilitatorScreen.tsx# Facilitator dashboard
│   │   ├── CompanyDashboard.tsx # Team financials & capabilities
│   │   └── quarters/
│   │       ├── EventScreen.tsx
│   │       ├── BetScreen.tsx
│   │       ├── BeliefScreen.tsx
│   │       ├── RiskScreen.tsx
│   │       ├── RoleVoteScreen.tsx
│   │       ├── TeamCheckScreen.tsx
│   │       ├── CommitScreen.tsx
│   │       ├── ConsequenceScreen.tsx
│   │       └── ReflectScreen.tsx
│   ├── simulation/
│   │   └── engine.ts            # Supabase-independent economics engine
│   ├── services/
│   │   └── supabase.ts          # Supabase persistence layer
│   └── content/
│       └── gameplay.json        # Q1-Q2 narrative, prompts, content
├── database/
│   └── schema.sql               # PostgreSQL schema
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── .env.local                   # (create this with Supabase keys)
```

### Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build**: Vite (static HTML/CSS/JS output)
- **State Management**: React Context
- **Persistence**: Supabase (PostgreSQL)
- **Styling**: CSS3 (no framework needed)
- **Simulation**: Pure TypeScript (completely separate from Supabase)

### Database Schema

**sessions** table:
- `id, facilitator_email, session_code, admin_pin, team_count, current_quarter, game_phase`

**teams** table:
- `id, session_id, team_code, team_name`
- Persistent capabilities (0-100): consumer, enterprise, ai, talent, credential, customerSuccess, growth, execution
- Financials: revenue, operating_cost, operating_profit, cash, stock_price
- Quality: productQuality, culture, trust

**decisions** table:
- `id, team_id, quarter`
- `allocation_json`: Capital allocation (JSON)
- `belief_prompt, belief_response`
- `risks_json`: Array of {identified, severity}
- `votes_json`: Role votes + confidence + rationale
- `team_check_alignment, team_check_override, team_check_dissenting_roles`
- `outcome_*`: Calculated results (revenue_change, cash_change, capability_changes, narrative, etc.)

**access_log** table:
- For analytics (basic row on each login)

---

## SIMULATION ENGINE (Completely Portable)

Located in `src/simulation/engine.ts`:

### Key Functions

**`calculateQ1Consequence(allocation, roleVotes, override, dissents, currentState): Consequence`**

Accepts:
- Capital allocation ($30M total)
- 5 role votes (YES/NO/ABSTAIN)
- Override flag and dissents
- Current team financial state

Returns:
- revenueChange: $X impact
- cashChange: $X impact
- capabilityChanges: {consumer: +5, enterprise: +2, ...}
- thresholdsCrossed: ["Consumer moved to Competitive", ...]
- stockPriceChange: ±X%
- narrative: String describing results

**Calculation Logic:**
1. Validates allocation totals to $30M
2. Applies diminishing returns (100% → 80% → 60% → 40% effective)
3. Creates persistent capabilities per category
4. Calculates execution alignment from role votes
5. Applies alignment multiplier to revenue (0.85× to 1.10×)
6. Computes stock price from 3 factors (growth, margin, alignment)
7. Identifies capability threshold crossings

### Simulation is Completely Independent

- No Supabase calls
- Pure TypeScript functions
- Testable in isolation
- Can be extracted to Node.js or other backend
- Can be compiled to WASM if needed
- Output is deterministic (same input = same output)

---

## CONTENT LAYER (Configurable)

Located in `src/content/gameplay.json`:

```json
{
  "q1": {
    "event_title": "Growth Looks Easy",
    "event_description": "...",
    "available_capital": 30,
    "belief": {
      "prompt": "...",
      "options": [{ "value", "label" }]
    },
    "risks": {
      "prompt": "...",
      "options": [{ "value", "label", "description" }]
    },
    "reflect": { ... },
    "role_hints": {
      "ceo": "...",
      "cfo": "...",
      ...
    }
  },
  "q2": { ... }
}
```

**Key:** All narrative and prompts are in this JSON file, not hard-coded in components.
- Change beliefs → just update gameplay.json
- Change role hints → just update gameplay.json
- No app rebuild needed for content updates

---

## PERSISTENCE LAYER (Supabase Integration)

Located in `src/services/supabase.ts`:

All Supabase operations isolated:
- `createSession()` → facilitator creates game
- `getSession()` → team joins
- `createTeam()` → add team to session
- `createDecision()` → save Q1 allocation/votes
- `updateTeamState()` → persist capabilities and financials
- `getTeamDecisions()` → load team history for callbacks
- `subscribeToTeamUpdates()` → real-time leaderboard

**Can be replaced** with any other backend (Firebase, custom Node server, etc.) without changing game logic.

---

## 10 VALIDATION CHECKS

After launching prototype, run these tests:

### Check 1: Team can complete Q1 loop
- [ ] Join as team member
- [ ] Allocate $30M (must total exactly)
- [ ] Select belief
- [ ] Select risks
- [ ] Vote (all 5 roles)
- [ ] See alignment
- [ ] Commit
- [ ] See consequences
- [ ] Reflect
- [ ] Advance to Q2
- **Status:** If all screens render and no errors → PASS

### Check 2: Five role votes stored individually
- [ ] Login to Supabase
- [ ] Check `decisions` table
- [ ] Find latest record
- [ ] Inspect `votes_json` field
- [ ] Should have 5 entries: {ceo: {...}, cfo: {...}, product: {...}, people: {...}, growth: {...}}
- [ ] Each has vote, confidence, rationale
- **Status:** If votes_json is complete → PASS

### Check 3: Team Check alignment stored
- [ ] Check `decisions` table
- [ ] Field `team_check_alignment` should be one of: unanimous, broad, debate, split
- [ ] Field `team_check_override` should be TRUE or FALSE
- [ ] If override, `team_check_dissenting_roles` should list dissents
- **Status:** If fields are populated → PASS

### Check 4: Investment modifies capabilities correctly
- [ ] Allocate heavily to AI ($20M out of $30M)
- [ ] After consequence screen, check `teams` table
- [ ] `capability_ai` should have increased
- [ ] Capability should follow diminishing returns formula
- [ ] Example: $20M → ~9.3 effective → +12 points (1.3 multiplier)
- **Status:** If AI capability increased by ~12 points → PASS

### Check 5: Cash/economics calculate correctly
- [ ] Check team's starting cash (should be $60M)
- [ ] Allocate $30M
- [ ] After consequence, check teams table
- [ ] Cash should reflect: starting + operating profit - spent + retained
- [ ] Operating profit = revenue × alignment multiplier - operating cost
- **Status:** If cash updates per formula → PASS

### Check 6: Belief and Risk stored
- [ ] Check `decisions` table
- [ ] `belief_response` should match selected belief
- [ ] `risks_json` should be array with 1-3 risks
- [ ] Each risk: `{identified: "...", severity: 1-5}`
- **Status:** If both fields populated → PASS

### Check 7: Q2 can retrieve Q1 history
- [ ] In Q2 (after advancing), check team dashboard
- [ ] Should show prior Q1 allocation/risks/beliefs
- [ ] Query: `SELECT * FROM decisions WHERE team_id = ? ORDER BY quarter`
- **Status:** If Q1 decision visible in Q2 → PASS

### Check 8: Q1 decision/risk appears as Q2 callback
- [ ] After Q2 consequence screen, check narrative
- [ ] Should include reference to Q1 belief ("You believed...")
- [ ] Should include reference to Q1 risks ("You identified...")
- [ ] Hard-coded for now: "You identified [risk]. No materialization in Q1, but watch for Q2+."
- **Status:** If callback appears in narrative → PASS

### Check 9: Facilitator can see team state and control progression
- [ ] Login as facilitator
- [ ] See leaderboard with all teams
- [ ] Columns: Team, Revenue, Cash, Stock, Culture, AI, Status
- [ ] See "Show Event" button
- [ ] See "Advance to Quarter" button
- [ ] Click buttons → see changes on leaderboard
- **Status:** If facilitator dashboard fully functional → PASS

### Check 10: Refresh/reconnect does not lose team state
- [ ] Allocate and vote in Q1
- [ ] Press F5 (refresh page)
- [ ] Check `teams` table → should still have updated capabilities
- [ ] Check `decisions` table → should still have Q1 decision
- [ ] Team member re-joins with same session code
- [ ] Should see Q2 event (game advanced)
- **Status:** If state persists across refresh → PASS

---

## RUNNING THE CHECKS

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Open Browser Tabs
- Tab 1: Facilitator setup
- Tab 2-4: Team member joins (3 teams)

### 3. Run Through Q1
- Facilitator shows event
- Each team allocates & votes
- All teams complete Q1

### 4. Verify Database
```sql
-- In Supabase SQL Editor
SELECT * FROM sessions LIMIT 1;
SELECT * FROM teams LIMIT 3;
SELECT * FROM decisions WHERE quarter = 1;

-- Check capabilities changed
SELECT team_code, capability_ai, capability_consumer FROM teams;

-- Check votes stored
SELECT team_id, votes_json->>'CEO' FROM decisions LIMIT 1;
```

### 5. Check Callbacks
- In Q2 consequence screen, look for:
  - "You identified [risk name]..."
  - "Your Q1 belief: '[belief]'..."

### 6. Test Refresh
- Reload team page
- State should persist
- Q2 should be active

---

## KNOWN LIMITATIONS (Pass 1)

✅ Working:
- Q1 complete flow
- Q2 opening event + belief/risk/vote system
- Consequence calculation and storage
- Callbacks to prior beliefs/risks
- Real-time leaderboard
- Static Vite build (no Node server)
- Portable simulation engine

⏳ Not Yet Implemented (for Pass 2+):
- Q3–Q8 full mechanics
- Q4 Strategic Commitment choice
- Q5 Flagship contract engine
- Q6 Recession + ROI proof
- Q7 Financing/efficiency options
- Q8 dynamic event ranking
- Final debrief timeline
- Award calculation
- Admin PIN for facilitator access
- Role assignment UI (currently random)
- Decision history replay
- Advanced analytics

---

## BUILD FOR PRODUCTION

```bash
npm run build
```

Output in `/mnt/project/dist/`:
- Static HTML/CSS/JS
- No Node server required
- Deploy to Hostinger, Vercel, AWS S3, or any static host

Example (Hostinger):
1. `npm run build`
2. Upload `dist/` contents to Hostinger File Manager
3. Set public root to `dist/`
4. Domain points to live site

---

## TROUBLESHOOTING

### "Failed to connect to Supabase"
- Check `.env.local` has correct URL and key
- Test connectivity: visit `https://[YOUR-PROJECT].supabase.co`
- Confirm schema was created

### "Allocation must total 30M"
- Sliders + inputs must sum to exactly 30.0
- Check for rounding errors (use exact numbers)

### "Votes not storing"
- Ensure all 5 roles have voted
- Check Supabase RLS policies allow your email
- Check `decisions` table has INSERT permission

### Facilitator leaderboard not updating
- Open Supabase realtime subscriptions tab
- Confirm `teams` table is subscribed
- Check browser console for errors

---

## NEXT STEPS (After Validation)

1. Review Pass 1 results against 10 checks
2. Gather feedback on Q1 flow and economics
3. Document any architectural issues
4. Begin Pass 2: Q1–Q8 full build

---

## FILES READY FOR DEPLOYMENT

✅ All source code complete  
✅ Database schema ready  
✅ Environment configuration documented  
✅ Build process tested  
✅ Static deployment ready  

**Ready to validate against 10 checks and proceed to full Q1–Q8 build.**

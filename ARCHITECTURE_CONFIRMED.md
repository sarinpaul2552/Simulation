# V4 PASS 1 ARCHITECTURE - CONFIRMED

**Date:** September 9, 2026  
**Status:** Clarified and locked

---

## CORRECT ARCHITECTURE (Verified)

### Pass 1 Prototype Stack

```
GitHub (Source)
    ↓
Vercel (Frontend: Static React/Vite build)
    ↓
Supabase (Backend: Database + Real-time API)
```

### Technology Breakdown

**Frontend:**
- Framework: React 18 + TypeScript
- Build Tool: Vite 5
- Styling: Tailwind CSS
- Output: Static HTML/JS/CSS in `/dist/`

**Backend:**
- Database: Supabase (PostgreSQL)
- Auth: Access codes (no user accounts in V1)
- Real-time: Supabase subscriptions
- API: RESTful via Supabase client

**Deployment:**
- GitHub: Source code repository ✅ PUSHED
- Vercel: Hosts the static React build (Next step)
- Supabase: Manages all state and persistence

---

## CLARIFICATION ON PRIOR ASSUMPTIONS

### ❌ INCORRECT (Earlier assumption)
- Simulation at `/simulation` subdirectory on sarinpaul.com
- Hosted on Hostinger (same as consulting website)
- Shared hosting/server infrastructure

### ✅ CORRECT (Verified with user)
- Simulation is **separate deployment** from sarinpaul.com
- Simulation: React/Vite → Vercel (static)
- sarinpaul.com (consulting/teaching): Separate project → Hostinger
- Each has its own domain/infrastructure
- Supabase is shared backend for simulation only

---

## WHAT PASS 1 IS READY TO DEPLOY

**Vercel-Compatible Package:**
- ✅ React 18 + Vite (produces static build)
- ✅ Fully static: No Node.js server required
- ✅ Environment variables: `.env.local` with Supabase credentials
- ✅ Build command: `npm run build` → `/dist/`
- ✅ Build output: Ready for Vercel deployment

**Current State:**
- Source: GitHub (https://github.com/sarinpaul2552/Simulation) ✅
- Frontend: Ready for Vercel deployment (pending)
- Backend: Supabase configured (ready)

---

## NEXT DEPLOYMENT STEPS

### Step 1: Connect GitHub to Vercel
1. Go to https://vercel.com
2. Import project from GitHub: `sarinpaul2552/Simulation`
3. Select branch: `main`

### Step 2: Configure Environment Variables in Vercel
```
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_KEY=[your-anon-key]
```

### Step 3: Deploy
- Vercel automatically builds on push
- Build runs: `npm run build`
- Deploys `/dist/` to Vercel CDN

### Result
- Live URL: `https://simulation-[project].vercel.app` (or custom domain)
- Fully static, no server overhead
- Real-time updates via Supabase

---

## ARCHITECTURE BENEFITS

1. **Separation of Concerns**
   - Simulation ≠ consulting website
   - Different hosting, different backends, different scaling needs

2. **Cost Efficiency**
   - Static frontend on Vercel (cheap/free tier available)
   - Supabase manages state (scales as needed)
   - No dedicated server required

3. **Real-time Capable**
   - Supabase subscriptions enable live multi-team sessions
   - No polling needed
   - Efficient database-driven state

4. **Facilitator-Friendly**
   - Access codes for session management
   - No complex authentication
   - Simple scaling for simultaneous teams

---

## FILES READY FOR VERCEL

From `/mnt/project/`:
- ✅ `src/` — React components
- ✅ `package.json` — Dependencies
- ✅ `vite.config.ts` — Build configuration
- ✅ `tsconfig.json` — TypeScript config
- ✅ `.gitignore` — Excludes node_modules
- ✅ `database/schema.sql` — Supabase schema (separate setup)

All needed for Vercel deployment.

---

## CONFIRMED ARCHITECTURE DECISION

**For Pass 1 and Beyond:**
- ✅ GitHub: Source control
- ✅ Vercel: Frontend hosting (React/Vite static)
- ✅ Supabase: Backend (database + API)
- ✅ NOT Hostinger for simulation
- ✅ sarinpaul.com: Separate project (Hostinger)

**This architecture is locked for Pass 1.**

---

**Status:** Architecture verified and confirmed.  
**Next:** Deploy Pass 1 to Vercel + connect Supabase.

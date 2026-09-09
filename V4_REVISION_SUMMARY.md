# V4 IMPLEMENTATION PLAN — REVISION SUMMARY

**Date:** September 9, 2026  
**Status:** REVISED & READY FOR APPROVAL

---

## CHANGES FROM ORIGINAL PLAN

### 1. Timeline: 8 weeks → 5 weeks
**Original**: Sequential phases (Foundation → Economics → Decision Flow → Callbacks → Facilitator → Q8 → Debrief → Testing → Deploy) = 8–9 weeks  
**Revised**: Vertical prototype first → full build → testing = 5 weeks total

**Rationale**: Don't over-engineer. Build thin Q1 slice first to expose architecture issues early.

---

### 2. V3 Preservation: Folder convention → Proper Git release
**Original**: "Create `/v3` git branch"  
**Revised**: 
- Git tag: `v3-final` (permanent snapshot)
- Git branch: `release/v3` (if hotfixes needed)
- V4 proceeds on `main`

**Rationale**: Professional release management, not convention.

---

### 3. 9 Ambiguities: All locked (no longer ambiguous)
**Original**: "Requiring Sarin clarification"  
**Revised**: Sarin provided explicit decisions for all 9:

| Item | Decision |
|------|----------|
| Q4 Reversal | Genuinely irreversible. Teams adapt execution, not destination. |
| Capability Decay | Post-Q4 only. Core capabilities only. <$3M for 2 qtrs → −3 pts/qtr. |
| Investment Lags | Consumer/Marketing same/next; Enterprise 1-qtr; University 2-qtr; AI immediate capability; People immediate; CS 1-qtr. |
| Q5 Contract | Implementation Q6 automatic. $3M at signing, $2.5M/qtr revenue Q6+. |
| Deterministic | Same state + decision = same result. Session seed for borderline only. |
| Roles | Fixed 8 quarters (importance for role ownership). |
| Belief/Risk Prompts | Provided separately by Sarin (not invented by Claude). |
| Awards | Mostly deterministic (Highest Shareholder Return, Best Pivot, Most Coherent). 1 facilitator discretionary. |
| Facilitation | Synchronous classroom first. Architecture allows async later. |

---

### 4. Architecture Constraint: Static frontend emphasis
**Original**: "Frontend: React, Deployment: Vercel"  
**Revised**: Explicit requirements:
- Frontend = Vite → static HTML/CSS/JS (no Node server)
- Deployable on Hostinger
- Simulation engine = client-side, portable (not Supabase-dependent)
- Backend = Supabase auth/persistence only
- Backend replaceable anytime

**Rationale**: Keeps hosting portable, aligns with your Hostinger preference.

---

### 5. Implementation Sequence: Sequential phases → Vertical prototype
**Original**: 9 phases (Foundation, Economics, Decision Flow, Callbacks, Facilitator, Q8, Debrief, Testing, Launch)  
**Revised**: 3 phases:
1. **Q1 Prototype (Weeks 1–2)**: Allocation → role voting → Team Check → commit → callback. Proves architecture.
2. **Full Build Q1–Q8 (Weeks 2–4)**: Extend to all quarters once prototype validated.
3. **Testing & Launch (Week 4–5)**: Balance, deploy, docs.

**Rationale**: Cheaper to fail early. Exposes architectural issues before full build.

---

## WHAT'S LOCKED & READY

✅ **Data Model** (Section 2)  
✅ **Core Mechanics** (Section 3)  
✅ **Quarterly Mechanics** (Section 4)  
✅ **Callbacks & Consequences** (Section 5)  
✅ **Final Debrief** (Section 6)  
✅ **Tech Stack** (Section 7 — React + Supabase + static frontend)  
✅ **Architecture Decisions** (Section 8)  
✅ **9 Ambiguities Resolved** (Section 10)  
✅ **Vertical Prototype Approach** (Section 9)  

---

## WHAT'S STILL NEEDED (From Sarin)

⏳ **Belief/Risk Prompts Library (Q1–Q8)**
- Full prompt specifications for each quarter
- Multiple-choice options per prompt
- Risk categories tailored to each quarter
- Delivered as separate document (not built by Claude)

Once provided → Phase 1 can start immediately.

---

## ESTIMATED EFFORT

**Phase 1 (Prototype)**: 2 weeks  
**Phase 2 (Full Build)**: 2 weeks  
**Phase 3 (Testing & Launch)**: 1 week  
**Total**: 5 weeks (lean, vertical-slice approach)

---

## NEXT STEP

1. Review this revised plan
2. Provide Q1–Q8 Belief/Risk Prompts Library
3. Approve → Phase 1 begins

---

**Revised plan ready for your approval.**

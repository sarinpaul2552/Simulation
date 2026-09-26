# Economics V2 — Batch 4 Destination Architecture Repair

Start: `4a105c6`. Guardrails respected: starting mix 140/40/16/4 unchanged; no Consumer AI nerf; no winner bonus; scoring
unchanged; no direct or destination revenue; every canonical identity holds (393 tests).

## Mechanisms

**Premium Value Proposition (PV, 0–100, calculated each quarter).**
PV = 100 × Π max(0.05, sᵢ)^wᵢ with Talent 55→100 (.30), Product Quality 70→95 (.25), Trust 65→90 (.20),
Execution 45→80 (.15), AI readiness 20→70 (.10). Weighted geometric mean: one weak dependency materially limits PV.
ΔPV = (PV − PV_start)/100 (PV_start = 9.1), positive part × Premium focus (1 + 0.5·strength) for a Premium destination.
Effects (commercial indicators only): Pricing Power target +40·ΔPV; consumer retention target +6·ΔPV; CAC −15·ΔPV;
Enterprise win rate +5·ΔPV; commoditization pressure on retention and pricing × (1 − 0.5·ΔPV⁺).
Willingness to pay reaches revenue through segment economics: consumer price-mix (existing) and new Enterprise
bookings × (1 + 0.004·(Pricing Power − 50)), symmetric for every company, exactly 1 at the start.

**Credential Network Value (CNV, 0–100, slow level indicator, speed 0.3).**
Target = 100 × Π max(0.05, sᵢ)^wᵢ with Credential 40→100 (.45), Trust 55→90 (.35), institutional adoption (.20) where
adoption = ½ ramp(university pipeline ÷ 24, 0.9, 2.0) + ½ ramp(university renewal, 88, 96). ΔCNV from the OPENING level
(lagged network), relative to CNV_start = 13.5, positive part × University focus.
Spillovers: consumer retention +8·ΔCNV; CAC −30·ΔCNV; Enterprise pipeline inflow × (1 + 0.6·ΔCNV) (credential demand);
Enterprise win rate +3·ΔCNV; Pricing Power +20·ΔCNV and commoditization × (1 − 0.4·ΔCNV⁺); University pipeline inflow
× (1 + 0.5·ΔCNV) (network effect — the segment still converts slowly). Accreditation crisis: CNV −(5 + 20s)·m.

**Calibration (Draft-1 values never exercised enough to matter):** People → Product Quality 0/0.5/1/1.8/2.2 →
0/1/1.8/3.2/4; AI/Product now also builds Product Quality 0/0.5/1/1.6/2. Test Lab aligned spending no longer pours
$30M/qtr into a capability at its ceiling (a saturated aligned bucket gets $5M; the rest funds supporting buckets).

## A. Strategies — complete Q1–Q8 games (Batch 4)

| Strategy | Destination | Revenue | C / E / U / AI | OP (margin) | Cash | Debt | PV / CN / Pricing | Culture / Trust / Exec | Q7 severity | F / S / O | Overall (Batch 3 → 4) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Consumer100 | Consumer AI | 203.9 | 144 / 39 / 15.9 / 5 | 34.7 (17%) | 56.4 | 0.0 | 9 / 12 / 44 | 71 / 67 / 60 | 0.77 | 56 / 72 / 57 | 61.8 → **61.8** |
| Enterprise100 | Enterprise AI | 193.3 | 121 / 52 / 15.9 / 5 | 22.3 (12%) | 25.0 | 26.7 | 7 / 12 / 47 | 62 / 64 / 57 | 0.70 | 46 / 63 / 46 | 51.8 → **51.7** |
| AI100 | Consumer AI | 220.9 | 127 / 40 / 15.9 / 39 | 39.0 (18%) | 60.3 | 0.0 | 20 / 12 / 54 | 71 / 67 / 60 | 0.54 | 68 / 79 / 57 | 64.2 → **69.3** |
| People100 | Premium | 193.5 | 134 / 39 / 15.9 / 5 | 17.9 (9%) | 25.0 | 20.2 | 45 / 13 / 57 | 58 / 70 / 57 | 0.47 | 42 / 56 / 70 | 41.7 → **53.8** |
| University100 | University | 190.8 | 130 / 41 / 15.2 / 5 | 25.2 (13%) | 37.4 | 0.0 | 12 / 62 / 53 | 71 / 83 / 60 | 0.44 | 47 / 74 / 64 | 56.1 → **60.9** |
| Cash100 | Balanced | 180.3 | 120 / 39 / 15.9 / 5 | 17.4 (10%) | 241.8 | 0.0 | 9 / 13 / 46 | 70 / 70 / 57 | 0.50 | 51 / 49 / 57 | 51.8 → **51.8** |
| Balanced | Balanced | 217.7 | 141 / 42 / 16.2 / 19 | 39.0 (18%) | 90.3 | 0.0 | 44 / 36 / 59 | 71 / 73 / 57 | 0.66 | 70 / 88 / 72 | 72.6 → **76.8** |
| Consumer + AI | Consumer AI | 241.5 | 155 / 40 / 15.9 / 31 | 57.9 (24%) | 110.8 | 0.0 | 19 / 12 / 54 | 71 / 68 / 60 | 0.51 | 86 / 94 / 57 | 79.5 → **81.6** |
| Enterprise + AI | Enterprise AI | 229.4 | 128 / 55 / 15.9 / 31 | 43.6 (19%) | 44.3 | 0.0 | 17 / 12 / 56 | 71 / 67 / 60 | 0.61 | 74 / 88 / 57 | 72.8 → **75.0** |
| Evidence-responsive | Enterprise AI | 233.3 | 142 / 52 / 16.0 / 24 | 47.1 (20%) | 80.9 | 0.0 | 42 / 26 / 59 | 72 / 69 / 60 | 0.66 | 80 / 87 / 72 | 77.1 → **80.3** |
| Deliberately wrong-way | Enterprise AI | 219.4 | 142 / 39 / 15.9 / 23 | 38.6 (18%) | 57.8 | 0.0 | 17 / 12 / 54 | 71 / 67 / 60 | 0.60 | 68 / 74 / 57 | 66.1 → **67.6** |
| Balanced, low Execution (30) | Balanced | 206.3 | 138 / 39 / 16.2 / 12 | 30.5 (15%) | 70.9 | 0.0 | 32 / 36 / 56 | 71 / 73 / 26 | 0.73 | 61 / 71 / 64 | 62.8 → **65.2** |
| Balanced, low Trust (40) | Balanced | 194.3 | 123 / 38 / 14.3 / 19 | 22.1 (11%) | 34.1 | 0.0 | 30 / 12 / 48 | 71 / 43 / 57 | 0.66 | 51 / 76 / 59 | 60.2 → **61.7** |
| Enterprise + AI, low CS (10) | Enterprise AI | 220.1 | 127 / 47 / 15.9 / 30 | 42.4 (19%) | 80.8 | 0.0 | 14 / 12 / 56 | 62 / 66 / 57 | 0.72 | 71 / 78 / 47 | 61.7 → **67.4** |
| AI100, low Talent (30) | Consumer AI | 215.7 | 126 / 40 / 15.9 / 34 | 35.0 (16%) | 44.5 | 0.0 | 20 / 12 / 53 | 71 / 67 / 60 | 0.58 | 64 / 78 / 51 | 50.0 → **50.0** (organizational-collapse) |
| Premium builder (People + AI + Trust) | Premium | 231.9 | 142 / 39 / 16.2 / 35 | 45.6 (20%) | 82.6 | 0.0 | 67 / 41 / 70 | 68 / 74 / 60 | 0.28 | 77 / 87 / 78 | new → **80.6** |
| Premium builder, weak Trust (45) | Premium | 210.1 | 125 / 36 / 14.6 / 35 | 31.0 (15%) | 74.1 | 0.0 | 45 / 13 / 57 | 68 / 49 / 60 | 0.28 | 61 / 80 / 67 | new → **69.1** |
| Premium builder, weak Execution (35) | Premium | 217.4 | 138 / 37 / 16.2 / 27 | 35.1 (16%) | 92.8 | 0.0 | 48 / 41 / 65 | 68 / 74 / 35 | 0.28 | 67 / 77 / 68 | new → **70.8** |
| Credential builder (University → monetize the network) | University | 196.7 | 134 / 43 / 15.0 / 5 | 23.7 (12%) | 29.6 | 0.0 | 40 / 55 / 57 | 72 / 79 / 60 | 0.42 | 48 / 68 / 80 | new → **63.1** |
| Credential builder, weak Trust (45) | University | 173.1 | 117 / 38 / 12.9 / 5 | 12.4 (7%) | 25.0 | 7.1 | 17 / 13 / 44 | 63 / 53 / 57 | 0.56 | 36 / 64 / 54 | new → **48.5** |
| Aggressive spender | Consumer AI | 240.2 | 143 / 56 / 15.9 / 25 | 51.5 (21%) | 116.5 | 0.0 | 17 / 12 / 52 | 72 / 67 / 60 | 0.60 | 84 / 88 / 58 | 76.8 → **78.9** |
| Conservative spender | Balanced | 180.7 | 117 / 40 / 16.1 / 8 | 30.5 (17%) | 202.6 | 0.0 | 9 / 26 / 48 | 60 / 72 / 51 | 0.72 | 57 / 58 / 45 | 54.1 → **54.3** |

## B. Histories × destinations — aligned post-Q4 spending (overall, Q8 revenue)

| History | Consumer AI | Enterprise AI | Premium | University | Balanced | Best (margin) |
|---|---|---|---|---|---|---|
| consumer100 | **69.9 (212)** | 63.7 (203) | 65.7 (204) | 62.4 (197) | 63.0 (200) | Consumer AI (+4.2) |
| enterprise100 | 53.0 (186) | **56.6 (197)** | 50.4 (188) | 51.0 (186) | 53.4 (201) | Enterprise AI (+3.2) |
| ai100 | **77.8 (228)** | 72.6 (223) | 74.8 (225) | 74.0 (221) | 74.0 (225) | Consumer AI (+3.1) |
| people100 | **64.2 (198)** | 61.3 (199) | 62.0 (203) | 58.1 (191) | 59.0 (199) | Consumer AI (+2.2) |
| university100 | 60.6 (196) | 58.8 (195) | 61.3 (197) | **61.7 (191)** | 60.8 (193) | University (+0.4) |
| cash100 | **62.4 (186)** | 57.9 (186) | 59.3 (186) | 59.4 (181) | 55.9 (184) | Consumer AI (+3.0) |
| balanced | **78.5 (224)** | 74.7 (218) | 76.6 (221) | 70.6 (210) | 76.8 (218) | Consumer AI (+1.7) |
| consumer-ai | **82.1 (242)** | 76.6 (232) | 79.4 (235) | 77.0 (228) | 79.4 (232) | Consumer AI (+2.7) |
| enterprise-ai | **75.5 (224)** | 75.0 (229) | 74.2 (222) | 72.2 (216) | 75.5 (232) | Consumer AI (+0.0) |
| evidence-responsive | **80.0 (229)** | 78.0 (232) | 78.1 (226) | 74.1 (216) | 78.8 (224) | Consumer AI (+1.3) |
| wrong-way | **76.9 (227)** | 71.4 (219) | 73.8 (221) | 71.4 (215) | 74.4 (220) | Consumer AI (+2.5) |
| premium-builder | **81.8 (230)** | 80.2 (238) | 80.2 (232) | 81.3 (228) | 80.9 (232) | Consumer AI (+0.5) |
| credential-builder | 65.6 (204) | 64.3 (202) | **66.8 (205)** | 63.9 (195) | 66.0 (199) | Premium (+0.8) |

## C. Thesis histories with their OWN allocation, all five destinations (overall · revenue · PV/CN/pricing · crisis severity)

| History | Consumer AI | Enterprise AI | Premium | University | Balanced |
|---|---|---|---|---|---|
| premium-builder | 75.8 · 225 · 61/38/61 · 0.44 | 76.9 · 239 · 59/38/66 · 0.61 | **80.6 · 232 · 67/41/70 · 0.28** | 80.2 · 232 · 67/33/67 · 0.54 | 76.1 · 223 · 65/41/67 · 0.45 |
| premium-weak-trust | 68.4 · 211 · 48/13/54 · 0.57 | 66.0 · 213 · 47/13/56 · 0.53 | 69.1 · 210 · 45/13/57 · 0.28 | **70.0 · 212 · 47/11/56 · 0.62** | 63.3 · 205 · 44/13/56 · 0.45 |
| premium-weak-execution | 68.9 · 217 · 49/39/61 · 0.48 | 66.9 · 218 · 47/39/63 · 0.58 | 70.8 · 217 · 48/41/65 · 0.28 | **71.3 · 218 · 48/33/63 · 0.55** | 69.1 · 218 · 50/40/63 · 0.51 |
| credential-builder | 54.9 · 192 · 42/65/53 · 0.73 | 60.7 · 196 · 39/65/56 · 0.64 | 58.4 · 194 · 34/67/55 · 0.59 | **63.1 · 197 · 40/55/57 · 0.42** | 59.8 · 196 · 39/67/56 · 0.50 |
| credential-weak-trust | 39.7 · 166 · 19/19/37 · 0.87 | 45.9 · 173 · 17/19/45 · 0.68 | 39.9 · 170 · 11/19/40 · 0.71 | **48.5 · 173 · 17/13/44 · 0.56** | 46.2 · 168 · 16/19/45 · 0.58 |
| university100 | 49.6 · 186 · 15/70/49 · 0.76 | 50.8 · 190 · 12/70/52 · 0.70 | 49.9 · 186 · 12/72/48 · 0.81 | **60.9 · 191 · 12/62/53 · 0.44** | 52.5 · 190 · 12/72/52 · 0.51 |
| people100 | 47.9 · 184 · 35/12/50 · 0.67 | 50.4 · 193 · 39/12/56 · 0.62 | **53.8 · 194 · 45/13/57 · 0.47** | 52.8 · 193 · 41/9/56 · 0.67 | 48.1 · 186 · 43/13/57 · 0.44 |
| consumer-ai | **81.6 · 242 · 19/12/54 · 0.51** | 72.9 · 232 · 17/12/56 · 0.58 | 72.2 · 228 · 17/13/55 · 0.71 | 71.7 · 231 · 17/9/55 · 0.73 | 76.1 · 231 · 18/13/56 · 0.55 |
| enterprise-ai | 68.5 · 217 · 18/12/53 · 0.61 | **75.0 · 229 · 17/12/56 · 0.61** | 66.8 · 215 · 17/13/55 · 0.71 | 66.3 · 218 · 17/9/56 · 0.74 | 71.4 · 230 · 17/13/56 · 0.60 |
| enterprise100 | 42.4 · 179 · 7/12/40 · 0.84 | **51.7 · 193 · 7/12/47 · 0.70** | 43.4 · 183 · 9/13/43 · 0.91 | 46.5 · 187 · 8/9/47 · 0.79 | 48.6 · 193 · 8/13/47 · 0.65 |
| balanced | **77.4 · 219 · 47/35/56 · 0.64** | 75.9 · 218 · 44/35/59 · 0.60 | 73.9 · 217 · 42/36/59 · 0.56 | 75.7 · 218 · 44/28/59 · 0.65 | 76.8 · 218 · 44/36/59 · 0.66 |

## Findings

- **Premium:** premium-builder → Premium: revenue $232M, margin 20%, pricing power 70, PV 67, overall 80.6 (best of its
  five destinations). Weak Trust → 69.1, weak Execution → 70.8 (PV −19…−22, revenue −$15…22M): the premium collapses
  without its dependencies, and Premium stops being the best destination for those companies.
- **University/Credential:** credential-builder → University 63.1 (strong band), University100 → University 60.9 (was 56.1);
  University is the best destination for both with their own spending; mildest crisis (0.42–0.44), Q6–Q8 drawdown −1.3%,
  Trust 79–83, CNV 55–62. Weak Trust → 48.5 (CNV 13). The University segment stays slow ($15–17M at Q8).
- **Consumer AI** 81.6 (was 79.5) — unchanged thesis, strongest where supported; still modal best under aligned spending
  (9 of 13 histories, 0.0–4.2 points) because Consumer is ~70% of revenue.
- **Enterprise AI** best for Enterprise100 (+3.2) and for Enterprise+AI with own spending (75.0); evidence-responsive 80.3.
- **Balanced** 76.8, never distressed, best for no history by default.
- **Long horizon (Q8/Q12/Q16/Q40):** growth decelerates everywhere (late growth ≤ 0.4%/qtr); broad/balanced 40-quarter runs
  reach 2.2× baseline (Batch 3: ≤ 2.1×) as Premium Value and the network compound into saturation (pricing power and
  retention reach their bounds). Premium- and credential-builders: $373–405M at Q40. No runaway.

## Anomalies

1. People100 rose 41.7 → 53.8 and AI100 64.2 → 69.3 (Product Quality now built by People and AI/Product). People100 no
   longer runs out of cash on its own; insolvency tests use a thin-cash People100.
2. Premium's lead over University on the premium-builder history is narrow (80.6 vs 80.2): both rely on Trust/Quality.
3. Aligned-spending matrix still favours Consumer AI for most histories (structural mix, not a mechanism gap).
4. 40-quarter maximum-breadth runs clip pricing power at 100 and retention at 95 (bounds working as designed).

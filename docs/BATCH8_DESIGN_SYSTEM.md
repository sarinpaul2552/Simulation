# NexLearn design system — "Board Paper" (Batch 8 · Stage 2)

**The aim** is to look like executive board papers, a financial intelligence platform and a management decision system. It should not look like an AI-startup landing page, an admin dashboard or a game.

**Where it lives**
- `src/production/v2/ui/ds/ds.css` holds the tokens and styles.
- `ds/components.tsx` holds the primitives.
- `ds/intel.tsx` holds the executive-intelligence components.
- `ds/glossary.tsx` holds the glossary.

## 1. Research and principles

The sources below were reviewed for conventions, not copied. No branding, proprietary layout or asset was reused.

Official pages were located by search:
- [Carbon data-visualization colour palettes](https://carbondesignsystem.com/data-visualization/color-palettes/)
- [IBM Design Language — data visualization basics](https://www.ibm.com/design/language/data-visualization/design/basics/)
- [Atlassian data-visualization colour](https://atlassian.design/foundations/color-new/data-visualization-color)
- [Atlassian tokens](https://atlassian.design/foundations/tokens/use-tokens-in-design)
- [Linear — how we redesigned the Linear UI](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- FT Visual Vocabulary, via its widely circulated summaries (e.g. [data.europa.eu chart guide](https://data.europa.eu/apps/data-visualisation-guide/choosing-charts-the-message))

In-session page fetches needed an approval that was not available while working unattended. The principles below therefore rest on these sources' published guidance as known, not on fresh page reads.

| Source | Adopted | Rejected |
|---|---|---|
| Financial Times (Visual Vocabulary, report typography) | Choose the chart by the message (change over time → line; part-to-whole → stacked bar; deviation → bridge). Serif headlines over a sans body. Warm paper background. Rules instead of boxes. Direct labels. | Salmon pink brand colour and FT layouts. |
| Bloomberg (terminal and Businessweek data pages) | Dense, scannable numeric tables. Tabular numerals. Signed deltas with arrows. Every number has a comparison (vs previous, vs start). | Black terminal look, amber-on-black, very small type. |
| Reuters graphics | Restrained annotation. One idea per chart. A reference line for the baseline. | Breaking-news hierarchy. |
| Stripe (dashboard and docs) | Calm hierarchy. Generous but purposeful spacing. Precise alignment of numbers. | Gradients, glow, marketing illustration. |
| Linear | Reduced chrome. Few colours used for meaning. Keyboard-friendly controls. | Dark default theme. Motion-heavy transitions. |
| IBM Carbon (data viz) | Categorical palettes validated for colour-vision deficiency. Fixed series order. Legends always present. Accessible tooltips. Table alternatives. | Carbon's blue-heavy palette and IBM Plex. |
| Atlassian (tokens, data viz) | Semantic tokens (status, emphasis) separate from categorical data colours. Status never shown by colour alone. | The Atlassian component look. |

Principles adopted for NexLearn:

1. **Structure through rules, not cards.**
   - Sections are separated by hairlines (Stone) and 2px Ink rules at the top of major sections.
   - Bordered surfaces are reserved for things you act on (allocation, financing, commitment) and for confidential material (role briefings).
2. **Every number is compared.** Each figure shows its previous-quarter and/or Q4 2022 value, with a signed delta and an arrow.
3. **Colour carries meaning only:**
   - teal = improvement or selection;
   - copper = decision significance or caution (the commit button, the quarter's question);
   - red = material deterioration;
   - amber = uncertainty (industry estimates, "what to watch");
   - ink = neutral;
   - slate = supporting or historical.

   There are no decorative gradients, and no per-quarter chapter colours (removed).
4. **No motion.** Entrance animations, hover transitions, button press movement and the outlined decorative numerals were all removed.
5. **Editorial typography.** Source Serif 4 for page titles, section headings and report titles. Inter for UI, tables and body text. Uppercase is reserved for the "Confidential" classification line.
6. **Charts are informative, not decorative:**
   - recorded values only; a dashed starting-level reference line; a selected-quarter marker;
   - a hover or tap tooltip; a screen-reader caption listing every value;
   - no future quarters and no invented benchmarks.

## 2. Tokens

| Token | Value | Use | Contrast on Ivory / Paper |
|---|---|---|---|
| Ink `--nx-ink` | #17232D | Text, primary rules | 14.29 / 15.83 |
| Deep Forest `--nx-forest` | #193F3B | Top bar, primary buttons, briefing rule | 10.35 / 11.46 |
| Mineral Teal `--nx-teal` | #287C73 | Improvement marks, selection, focus | 4.45 / 4.93 (marks, large text) |
| Warm Ivory `--nx-ivory` | #F5F2EB | Page background | — |
| Paper `--nx-paper` | #FFFEFA | Surfaces | — |
| Stone `--nx-stone` | #DDD8CD | Dividers | (non-text) |
| Copper `--nx-copper` | #B45E3C | Decision emphasis, caution marks; commit button background | 4.08 / 4.52 |
| Amber `--nx-amber` | #A77A24 | Uncertainty marks | 3.44 / 3.82 (marks only) |
| Slate `--nx-slate` | #65727A | Supporting rules and reference lines | 4.43 / 4.91 |
| Negative `--nx-negative` | #A33F3F | Material deterioration | 5.62 / 6.23 |

Four of the specified hues fall just below 4.5:1 on Ivory: Teal, Copper, Amber and Slate. Each therefore has an AA text variant used for small text. A unit test enforces at least 4.5:1 on both backgrounds:

| Text variant | Value | Contrast on Ivory / Paper |
|---|---|---|
| `--nx-teal-text` | #1F6B63 | 5.62 / 6.23 |
| `--nx-copper-text` | #94541F | 5.30 / 5.87 |
| `--nx-amber-text` | #8A6418 | 4.80 / 5.31 |
| `--nx-slate-text` | #5B666D | 5.27 / 5.84 |
| `--nx-negative-text` | #8F3434 | 6.93 / 7.68 |

Paper text on Deep Forest is 11.46:1. Paper text on Copper (the commit button) is 4.52:1.

**Segment and investment colours** were validated with the dataviz palette validator on Paper, in adjacent order: lightness band, chroma floor, CVD separation (worst ΔE 18.3), normal-vision floor (≥ 21.6) and contrast ≥ 3:1 all pass.

| Segment / bucket | Colour |
|---|---|
| Consumer | #3C6FB0 |
| Enterprise | #9C8A2E |
| AI | #7A4E9E |
| University | #4F7A2A |
| People | #C0567A |

- Some pairs that never sit next to each other fall below the all-pairs CVD threshold. Charts therefore always carry a legend, labels and 2px gaps.
- Cash held in reserve uses a hatched neutral.

## 3. Type scale

| Role | Token | Font |
|---|---|---|
| Page title | `--fs-page` clamp(1.7rem → 2.35rem) | Source Serif 4, 600 |
| Section heading | `--fs-section` clamp(1.2rem → 1.45rem) | Source Serif 4, 600 |
| Data headline | `--fs-data` clamp(1.45rem → 1.9rem) | Inter 650, tabular |
| Table header | `--fs-th` 0.75rem | Inter 650, sentence case |
| Body | `--fs-body` 15px | Inter 400 |
| Annotation | `--fs-note` 0.8125rem | Inter |
| Methodological note | `--fs-method` 0.75rem | Inter, slate |

Tabular numerals are on globally (`font-variant-numeric: tabular-nums`).

## 4. Component specification

| Component | Where | Rules |
|---|---|---|
| Executive KPI (`.ds-kpi`, `KpiTile`) | Overview strip, deep analysis | Label (glossary term where one exists), value, signed delta with arrow and word, previous value. Ruled strip, not cards. |
| KPI delta (`Delta`, `Move`) | Everywhere | Arrow ▲▼■ + signed number + screen-reader word (favourable/unfavourable). Colour follows business meaning (more debt is not "good"). |
| Financial statement (`.ds-table`) | Cash history, KPI dashboard | Compact rows; numbers right-aligned; Ink header rule; total row with Ink rule. |
| Business segment table | Commercial, reflection | Start, now, quarter movement, allocation, capability; legend colours only on marks. |
| Quarter selector (`QuarterSelector`) | Dashboard sections, share price | Q4 2022 … last completed; later quarters shown disabled (no future data). |
| Executive scorecard (`ScorecardView`) | Results › Executive scorecards, board report | Executive / functional / company figures; Metric · Q4 2022 · previous · current · change · interpretation · score bar (50 = start marker); challenges and strengths; method note. |
| Business-health indicator (`HealthTable`) | Executive overview | Current · Δ previous · Δ start · level in words · contributing KPIs; labelled an interpretation, not scoring. |
| Risk indicator (`.ds-notice`) | Financing, report | Copper or red left rule + icon + words; always visible (never inside a fold). |
| Decision record (`DecisionHistory`, `.ds-resolution`) | Commit, board report | Quarter · decision · outcome figures · share price; expandable detail. |
| Market evidence (`EvidenceList`) | Understand | Source tag (Market News / Industry Estimate in amber text / Company Data in teal text) + statement. |
| Confidential briefing (`.ds-brief`) | Understand | Forest top rule, "Confidential · quarter" classification, memo sections. |
| Cash bridge (`BridgeView`) | Results | Waterfall from the recorded ledger; reconciles (`data-reconciles`). |
| Valuation bridge (`ValuationBridgeView`) | Results, share price | Previous price → calculated contributions → price; rounded lines sum exactly to the rounded change. |
| Board-report section (`.ds-report-section`) | Final | Numbered serif heading, ruled; avoids page breaks when printed. |
| Team comparison (`Leadership`) | Facilitator | Same-quarter table; awards with rules and basis. |
| Contextual glossary (`Term`, `GlossaryPanel`) | Everywhere | Dotted underline; popover (bottom sheet on phones). |

## 5. Visual audit (Part 7)

| Question | Finding before | Fix |
|---|---|---|
| Same card template everywhere? | Rounded white cards with shadows for most blocks | Cards replaced by ruled sections. Panels kept only for allocation, financing, the briefing and the resolution. |
| Decorative competition? | Dark gradient banners, outlined giant numerals, chapter colours | Removed. Editorial masthead with a 2px Ink rule. |
| Symmetry for its own sake? | Three identical columns ("why it matters", consequences, stories) | Ruled lists and label/value rows. |
| Excessive whitespace? | Hero banners up to 52vh | Removed; the chapter header is content-height. |
| Scannable figures? | Large display numerals | Tabular figures with comparisons in every strip. |
| Informative charts? | Trend lines without context | Starting-level reference, selected quarter, explorer table, captions. |
| Clear decisions? | Commit used the chapter colour | The commit button is Copper (decision significance); notices are always visible. |
| MBA credibility? | Pills and badges, uppercase micro-labels | Words with marks; sentence-case labels; methodological notes. |
| Mobile hierarchy? | Overflow from absolutely positioned cells; wide tables | Table wraps contain overflow; secondary columns hidden on phones; sequence table stacks. The no-horizontal-scroll test passes at 375px. |
| Coherent identity? | Mixed Boardroom navy and brass | A single palette and type pairing; tokens only (no one-off colours in new components). |

axe-core (WCAG 2.1 A/AA) reports no serious or critical violations on the facilitator view, introduction, briefing, role brief, decision, results, scorecards and share-price screens (`e2e/a11y.e2e.ts`).

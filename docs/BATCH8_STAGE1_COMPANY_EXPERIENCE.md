# Batch 8 · Stage 1 — The company experience

Branch: `feature/batch8-executive-leadership`, built on Batch 7.5 (`ac1bd0e`, verified locally, not yet pushed).
The frozen V2 engine is unchanged.

## NexLearn

- `content/company.ts`: fictional backstory covering history, products, revenue model, customers, competition, previous direction, challenges and board expectations. Each item has an Undergraduate and an MBA version. It contains no historical metrics.
- The introduction (`stages/CompanyIntro.tsx`) shows the backstory with a **Fictional** label. The **starting position** is read live from the engine's starting state: $200M revenue, $170M costs, $30M operating profit (15%), $60M cash, and segments of $140M / $40M / $16M / $4M. The two can never disagree.
- The introduction is shown once per team at the start of Q1 2023, stored in the team draft (`introSeen`) so it survives refresh. It can be reopened any time from **About NexLearn** in the top bar.

## Calendar quarters

`content/calendar.ts` defines one mapping: starting position Q4 2022; simulation Q1–Q8 run from Q1 2023 to Q4 2024. It is used in:

- the top bar, chapter openers and the decision and commit screens;
- results headings, the "vs previous quarter" lines and chart axes and tooltips (`Q1 ’23`);
- final-report text, the debrief and the facilitator pacing controls.

## Glossary

`content/glossary.ts` covers 17 terms, each with a plain-English definition and an example; MBA mode adds technical detail.

- `<Term>` shows a tappable definition in place. It is positioned on screen so it is never clipped, becomes a bottom sheet on phones, and closes with Escape, the × or a click elsewhere.
- A searchable **Glossary** panel in the top bar lists every term.
- Terms are wired into the role-brief KPIs, result figures, diagnostics, the Explore tables, the capacity gauge and the introduction.

## Role briefings (rewritten, no recommendations)

Six parts: responsibility · current business position · what the evidence suggests · what remains uncertain · objectives · raise with your colleagues.

- **Current business position:** the role's KPIs at Q4 2022, last quarter and now, with the change.
- **Evidence:** the role's private signals, followed by two competing readings. Written content is in `content/briefings.ts`.
- **Objectives** are functional and deliberately in tension: the CFO protects cash and margin, Growth wants revenue, Product wants quality and capability, People protects capacity and culture, and the CEO has to make it coherent. "Raise with your colleagues" names who to challenge.
- The stance and recommendation buttons and the "Leaders recommend" strip are removed.
- A unit test fails if any briefing contains directive language ("you should", "recommend", "the best option"…) or uses another role's private signals.
- Quarter card text that implied AI investment is automatically superior was rewritten (for example Q2: "Early investment builds capability ahead of proven demand; waiting preserves cash and the option to follow").

## Workflow

The stages are **Understand → Discuss & Decide → Commit → Results & Learn**, over the unchanged server phases. Team Commitment remains the default; mandatory private voting is not reintroduced.

## Tests

- Unit tests: 588 passed. Type check and build pass. Database integration tests: 14 passed.
- Browser tests: all pass. They cover the earlier regression suite, the new Stage 1 suite (introduction, calendar labels, glossary, six-part briefings, Q3 decision, phone layout) and refresh persistence of the introduction.

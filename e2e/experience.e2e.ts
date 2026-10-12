/**
 * Batch 7 — student experience: Undergraduate vs MBA presentation modes (same economics), mode persistence,
 * facilitator debrief/compare/projector, responsive layout (no horizontal scroll) and reference screenshots.
 */
import { test, expect, Page } from '@playwright/test';
import { newPage, createSession, joinTeam, playQuarter, expectPhase, readBriefings, fillDecision, fillDiscussion } from './helpers';
import { replayInputs, getFinalOutcome, V2_BASE_ENVELOPE } from '../src/production/v2/adapter';
import type { V2PlayerQuarterInput } from '../src/production/v2/types';

declare const process: { env: Record<string, string | undefined> };
const SHOTS = process.env.V2_SHOTS_DIR;
const shot = async (page: Page, name: string) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };

type Alloc = V2PlayerQuarterInput['allocation'];
const alloc = (p: Partial<Alloc>, envelope: number = V2_BASE_ENVELOPE): Alloc => {
  const a = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, ...p };
  return { ...a, cashReserve: envelope - (a.consumer + a.enterprise + a.aiProduct + a.people + a.universityCredentials) };
};
function plan(q: number): V2PlayerQuarterInput {
  const base = { consumer: 6, enterprise: 8, aiProduct: 10, people: 6 };
  switch (q) {
    case 4: return { quarter: 4, allocation: alloc(base), destination: 'enterprise-ai' };
    case 5: return { quarter: 5, allocation: alloc(base), opportunity: { offerId: 'q5-global-enterprise', accept: false } };
    case 6: return { quarter: 6, allocation: alloc(base), management: { pricing: 'raise' } };
    case 7: return { quarter: 7, allocation: alloc(base), crisisResponse: 'contain' };
    case 8: return { quarter: 8, allocation: alloc(base), finalOption: 'continue' };
    default: return { quarter: q, allocation: alloc(base) };
  }
}

async function noHorizontalScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (over > 1) console.log('OVERFLOW', page.viewportSize(), await page.evaluate(() => { const w = document.documentElement.clientWidth; return [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > w + 1).slice(0, 8).map(e => `${e.tagName}.${(e as HTMLElement).className}[${(e as HTMLElement).dataset.testid ?? ''}] ${Math.round(e.getBoundingClientRect().right)}`); }));
  expect(over).toBeLessThanOrEqual(1);
}

test('Undergraduate and MBA teams playing identical decisions get identical economics and scores; mode persists', async ({ browser }) => {
  const { page: facUg } = await newPage(browser);
  const ug = await createSession(facUg, ['UG Team'], { pacing: 'self', presentation: 'undergraduate' });
  await expect(facUg.getByTestId('v2-fac-mode-undergraduate')).toHaveAttribute('aria-checked', 'true');
  const { page: facMba } = await newPage(browser);
  const mba = await createSession(facMba, ['MBA Team'], { pacing: 'self', presentation: 'mba' });
  await expect(facMba.getByTestId('v2-fac-mode-mba')).toHaveAttribute('aria-checked', 'true');

  const { page: u } = await newPage(browser);
  const { page: m } = await newPage(browser);
  await joinTeam(u, ug.sessionCode, ug.teamCodes[0]);
  await joinTeam(m, mba.sessionCode, mba.teamCodes[0]);
  await expect(u.getByTestId('v2-team-game')).toHaveAttribute('data-mode', 'undergraduate');
  await expect(m.getByTestId('v2-team-game')).toHaveAttribute('data-mode', 'mba');
  await u.reload();
  await expect(u.getByTestId('v2-team-game')).toHaveAttribute('data-mode', 'undergraduate'); // restored after refresh

  const inputs: V2PlayerQuarterInput[] = [];
  for (let q = 1; q <= 8; q++) {
    const inp = plan(q);
    await playQuarter(u, inp, {
      onResults: async page => {
        // Undergraduate dashboard: fewer KPI tiles, no formulas / benchmarks
        // Undergraduate: levels 1–2 lead; deep analysis is collapsed and has no benchmarks/formulas
        await expect(page.getByTestId('v2-benchmarks')).toHaveCount(0);
        await expect(page.getByTestId('v2-formulas')).toHaveCount(0);
        await expect(page.getByTestId('v2-deep')).not.toHaveAttribute('open', '');
        await expect(page.getByTestId('v2-explore')).toBeVisible();
        if (q === 2) await shot(page, 'ug-q2-results');
      },
    });
    await playQuarter(m, inp, {
      onDecide: async page => {
        if (q === 4) await shot(page, 'q4-strategic-commitment');
        if (q === 7) await shot(page, 'q7-crisis');
        if (q === 8) await shot(page, 'q8-final-decision');
      },
      onResults: async page => {
        // MBA (Batch 8.1): deep analysis is on demand; opening it shows benchmarks and formulas
        await expect(page.getByTestId('v2-deep')).not.toHaveAttribute('open', '');
        await page.getByTestId('v2-deep').locator('summary').click();
        await expect(page.getByTestId('v2-deep')).toHaveAttribute('open', '');
        await expect(page.getByTestId('v2-benchmarks')).toBeVisible();
        await expect(page.getByTestId('v2-formulas')).toBeVisible();
        await expect(page.getByTestId('v2-chart-op')).toBeVisible();
        if (q === 2) await shot(page, 'mba-q2-results');
      },
    });
    inputs.push(inp);
    const exp = replayInputs(inputs).state;
    for (const p of [u, m]) {
      await expect(p.getByTestId('v2-completed')).toHaveText(String(q));
      await expect(p.getByTestId('v2-cash')).toHaveText(`${exp.cash < 0 ? '−' : ''}$${Math.abs(exp.cash).toFixed(1)}M`);
    }
  }
  const out = getFinalOutcome(replayInputs(inputs));
  for (const p of [u, m]) {
    await expectPhase(p, 'final');
    await expect(p.getByTestId('v2-final-overall')).toHaveText(out.score.overall.toFixed(1));
    await expect(p.getByTestId('v2-final-financial')).toHaveText(out.score.financial.toFixed(1));
    await expect(p.getByTestId('v2-journey-q8')).toBeVisible();
    await expect(p.getByTestId('v2-pivotal')).toBeVisible();
    await expect(p.getByTestId('v2-tradeoffs')).toBeVisible();
  }
  await shot(u, 'ug-final');
  await shot(m, 'q8-final-learning-report');
  for (const p of [u, m]) {
    await expect(p.getByTestId('v2-conclusion')).toContainText('You built a');
    await expect(p.getByTestId('v2-vulnerabilities')).toBeVisible();
    await expect(p.getByTestId('v2-not-pursued')).toBeVisible();
    await expect(p.getByTestId('v2-questions')).toBeVisible();
  }
  // Stored state is identical in both sessions (server-side snapshots verified by the facilitator audit)
  for (const [fac, name] of [[facUg, 'UG Team'], [facMba, 'MBA Team']] as const) {
    await fac.reload();
    await fac.getByTestId('v2-fac-verify').click();
    await expect(fac.locator(`[data-testid="v2-fac-team"][data-team="${name}"]`).getByTestId('v2-fac-integrity')).toHaveText('verified');
    await expect(fac.locator(`[data-testid="v2-fac-team"][data-team="${name}"]`).getByTestId('v2-fac-final')).toContainText(out.score.overall.toFixed(1));
  }

  // Facilitator debrief: decisions, disagreements and questions — never the private briefings
  await facMba.getByTestId('v2-fac-tab-debrief').click();
  const d = facMba.getByTestId('v2-debrief-team').first();
  await expect(d).toBeVisible();
  await expect(d).toContainText('AI-powered Enterprise Learning Company');
  const debriefText = await facMba.getByTestId('v2-fac-debrief').innerText();
  for (const leak of ['What you know', 'Your responsibility', 'Leaders recommend']) expect(debriefText).not.toContain(leak);
  await shot(facMba, 'facilitator-debrief');
  await facMba.getByTestId('v2-fac-tab-compare').click();
  await expect(facMba.getByTestId('v2-fac-compare')).toBeVisible();
  // Peer comparison is facilitator-only
  expect(await m.locator('body').innerText()).not.toMatch(/UG Team|Compare teams/);

  // Facilitator switches the class mode; students see it after refresh; economics unaffected
  await facMba.getByTestId('v2-fac-tab-live').click();
  await facMba.getByTestId('v2-fac-mode-undergraduate').click();
  await expect(facMba.getByTestId('v2-fac-mode-undergraduate')).toHaveAttribute('aria-checked', 'true');
  await m.reload();
  await expect(m.getByTestId('v2-team-game')).toHaveAttribute('data-mode', 'undergraduate');
  await expect(m.getByTestId('v2-final-overall')).toHaveText(out.score.overall.toFixed(1));
});

test('responsive: Q2 reference screens at laptop, tablet, mobile and projector widths; essential controls never scroll sideways', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Responsive'], { pacing: 'self' });
  const { page } = await newPage(browser);
  await joinTeam(page, s.sessionCode, s.teamCodes[0]);
  await playQuarter(page, plan(1));
  await expectPhase(page, 'briefing', 2);
  const sizes = [
    { name: 'laptop', width: 1366, height: 820 },
    { name: 'tablet', width: 820, height: 1100 },
    { name: 'mobile', width: 375, height: 760 },
    { name: 'projector', width: 1920, height: 1080 },
  ];
  for (const sz of sizes) {
    await page.setViewportSize(sz);
    await expect(page.getByTestId('v2-headline')).toBeVisible();
    await noHorizontalScroll(page);
    await shot(page, `q2-challenge-${sz.name}`);
  }
  await page.setViewportSize({ width: 1366, height: 820 });
  await page.getByTestId('v2-open-brief').click();
  await shot(page, 'q2-role-brief-laptop');
  await page.setViewportSize({ width: 375, height: 760 });
  await noHorizontalScroll(page);
  await shot(page, 'q2-role-brief-mobile');
  await page.getByTestId('v2-hide-brief').click();
  await page.setViewportSize({ width: 1366, height: 820 });
  // finish briefings (one already opened)
  for (let i = 0; i < 4; i++) { await page.getByTestId('v2-open-brief').click(); await page.getByTestId('v2-hide-brief').click(); }
  await page.getByTestId('v2-to-decide').click();
  await fillDecision(page, plan(2));
  await fillDiscussion(page, 2);
  for (const sz of sizes) {
    await page.setViewportSize(sz);
    await noHorizontalScroll(page);
    await expect(page.getByTestId('v2-to-vote')).toBeVisible();
    await shot(page, `q2-decision-${sz.name}`);
  }
  // the capacity estimate reacts to the plan
  await expect(page.getByTestId('v2-capacity')).toHaveAttribute('data-level', /comfortable|busy|stretched|overloaded/);
  await page.setViewportSize({ width: 1366, height: 820 });
  await page.getByTestId('v2-to-vote').click();
  await expectPhase(page, 'risk', 2);
  await page.getByTestId('v2-agreement-discussed').click();
  for (const sz of sizes) {
    await page.setViewportSize(sz);
    await noHorizontalScroll(page);
    await expect(page.getByTestId('v2-commit-team')).toBeVisible();
    await shot(page, `q2-team-commitment-${sz.name}`);
  }
  await page.setViewportSize({ width: 375, height: 760 });
  await page.getByTestId('v2-commit-team').click();
  await expect(page.getByTestId('v2-confirm')).toBeVisible();
  await noHorizontalScroll(page);
  await shot(page, 'q2-commit-confirm-mobile');
  await page.getByTestId('v2-confirm-confirm').click();
  await expectPhase(page, 'results', 2);
  await expect(page.getByTestId('v2-cash-bridge')).toHaveAttribute('data-reconciles', 'true');
  for (const sz of sizes) {
    await page.setViewportSize(sz);
    await noHorizontalScroll(page);
    await shot(page, `q2-results-${sz.name}`);
  }
  await page.setViewportSize({ width: 1366, height: 820 });
  await page.evaluate(() => window.scrollTo(0, 0));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/q2-executive-summary.png` });
  await page.getByTestId('v2-deep').locator('summary').click();
  if (SHOTS) await page.getByTestId('v2-cash-bridge').screenshot({ path: `${SHOTS}/q2-cash-bridge.png` });
  for (const t of ['financial', 'commercial', 'product', 'organization', 'price', 'scorecards', 'overview'] as const) {
    await page.getByTestId(`v2-tab-${t}`).click();
    await expect(page.getByTestId(`v2-tab-${t}`)).toHaveAttribute('aria-selected', 'true');
  }
  // Facilitator projector view
  await fac.setViewportSize({ width: 1920, height: 1080 });
  await fac.reload();
  await expect(fac.getByTestId('v2-fac-pin')).toBeVisible();
  await fac.getByTestId('v2-fac-projector').click();
  await expect(fac.getByTestId('v2-fac-pin')).toHaveCount(0); // never project the admin PIN
  await noHorizontalScroll(fac);
  await shot(fac, 'facilitator-projector');
  await fac.setViewportSize({ width: 375, height: 760 });
  await noHorizontalScroll(fac);
  void readBriefings;
});

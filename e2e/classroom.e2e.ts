/**
 * Batch 8.1 — classroom operations: a facilitator-led session from setup to awards, team sizes of three to six on
 * individual devices, network interruption, stale clients, projector and print.
 */
import { test, expect, Page } from '@playwright/test';
import { newPage, createSession, joinTeam, playQuarter, expectPhase, fillDecision, fillDiscussion, openQuarter, ROLES } from './helpers';
import { V2_BASE_ENVELOPE } from '../src/production/v2/adapter';
import type { V2PlayerQuarterInput } from '../src/production/v2/types';
import { createClient } from '@supabase/supabase-js';
import { createV2Api } from '../src/production/v2/api';

declare const process: { env: Record<string, string | undefined> };
const SHOTS = process.env.V2_SHOTS_DIR;
const shot = async (page: Page, name: string, el?: string) => {
  if (!SHOTS) return;
  await page.waitForTimeout(400);
  if (el) await page.getByTestId(el).screenshot({ path: `${SHOTS}/${name}.png` });
  else await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
};
const api = createV2Api(createClient(process.env.V2_DB_URL ?? 'http://localhost:54321', process.env.V2_DB_KEY!, { auth: { persistSession: false } }));
const alloc = (p: Partial<V2PlayerQuarterInput['allocation']>): V2PlayerQuarterInput['allocation'] => {
  const a = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, ...p };
  return { ...a, cashReserve: V2_BASE_ENVELOPE - (a.consumer + a.enterprise + a.aiProduct + a.people + a.universityCredentials) };
};
function plan(q: number, base: Partial<V2PlayerQuarterInput['allocation']>, dest: V2PlayerQuarterInput['destination']): V2PlayerQuarterInput {
  switch (q) {
    case 4: return { quarter: 4, allocation: alloc(base), destination: dest };
    case 5: return { quarter: 5, allocation: alloc(base), opportunity: { offerId: 'q5-global-enterprise', accept: false } };
    case 6: return { quarter: 6, allocation: alloc(base), management: { pricing: 'raise' } };
    case 7: return { quarter: 7, allocation: alloc(base), crisisResponse: 'contain' };
    case 8: return { quarter: 8, allocation: alloc(base), finalOption: 'continue' };
    default: return { quarter: q, allocation: alloc(base) };
  }
}

test('facilitator-led classroom: three teams Q1→Q8, equivalent-quarter comparison, awards, debrief, projector and print', async ({ browser }) => {
  test.setTimeout(900_000);
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Atlas', 'Beacon', 'Cedar'], { presentation: 'undergraduate' });
  await expect(fac.getByTestId('v2-fac-mode-undergraduate')).toHaveAttribute('aria-checked', 'true');
  const teams = [
    { base: { consumer: 12, aiProduct: 12, enterprise: 6 }, dest: 'consumer-ai' as const },
    { base: { consumer: 8, enterprise: 8, people: 7, universityCredentials: 7 }, dest: 'balanced-marketplace' as const },
    { base: { enterprise: 18, people: 8, consumer: 4 }, dest: 'enterprise-ai' as const },
  ];
  const pages: Page[] = [];
  for (const code of s.teamCodes) { const { page } = await newPage(browser); await joinTeam(page, s.sessionCode, code); pages.push(page); }
  // a stale second tab for Atlas, never refreshed manually until checked
  const { page: stale } = await newPage(browser);
  await joinTeam(stale, s.sessionCode, s.teamCodes[0]);

  for (let q = 1; q <= 8; q++) {
    await Promise.all(pages.map((p, i) => playQuarter(p, plan(q, teams[i].base, teams[i].dest))));
    if (q === 2) {
      // stale client: reloading shows the authoritative state; it cannot resubmit Q2
      await stale.reload();
      await expect(stale.getByTestId('v2-completed')).toHaveText('2');
    }
    if (q === 4) {
      await fac.getByTestId('v2-fac-tab-leadership').click();
      await expect(fac.getByTestId('v2-fac-leadership-table')).toContainText('Atlas');
      await expect(fac.getByTestId('v2-fac-awards')).toContainText('Best CFO');
      await fac.getByTestId('v2-fac-tab-live').click();
    }
    if (q < 8) await openQuarter(fac, q + 1);
  }
  for (const p of pages) await expectPhase(p, 'final');
  // equivalent-quarter comparison and awards at Q8
  await fac.getByTestId('v2-fac-tab-leadership').click();
  await expect(fac.getByTestId('v2-fac-leadership')).toContainText('Q4 2024');
  await expect(fac.getByTestId('v2-fac-awards')).toContainText('Best Overall Leadership Team');
  await expect(fac.getByTestId('v2-fac-awards')).toContainText('role');
  await shot(fac, 's81-08-facilitator-awards');
  // projector view never shows the admin PIN
  await fac.getByTestId('v2-fac-projector').click();
  await expect(fac.getByTestId('v2-fac-pin')).toHaveCount(0);
  await expect(fac.getByTestId('v2-fac-awards')).toBeVisible();
  await fac.getByTestId('v2-fac-projector').click();
  // debrief
  await fac.getByTestId('v2-fac-tab-debrief').click();
  await expect(fac.getByTestId('v2-debrief-team')).toHaveCount(3);
  // board report: verdict and print layout
  const report = pages[1];
  await expect(report.getByTestId('v2-board-verdict')).toBeVisible();
  await shot(report, 's81-06-q8-board-verdict', 'v2-board-verdict');
  await shot(report, 's81-07-q8-board-report');
  await report.emulateMedia({ media: 'print' });
  await expect(report.getByTestId('v2-print-report')).toBeHidden();
  await expect(report.getByTestId('v2-board-verdict')).toBeVisible();
  await report.emulateMedia({ media: 'screen' });
  // server-side record: exactly eight resolutions per team, no duplicates
  for (const code of s.teamCodes) {
    const g = await api.getGame(code);
    expect(g.resolutions).toHaveLength(8);
    expect(new Set(g.resolutions.map(r => r.quarter)).size).toBe(8);
  }
});

for (const size of [3, 4, 6] as const) {
  test(`one device per player: a ${size}-person team (roles shared or doubled) briefs, decides and commits`, async ({ browser }) => {
    const { page: fac } = await newPage(browser);
    const s = await createSession(fac, [`Size${size}`], { pacing: 'self', mode: 'individual_device' });
    const roles = size === 3 ? ['CEO', 'CFO', 'Product'] : size === 4 ? ['CEO', 'CFO', 'Product', 'Growth'] : [...ROLES, 'Growth'];
    const devices: Page[] = [];
    for (const role of roles) { const d = await newPage(browser); await joinTeam(d.page, s.sessionCode, s.teamCodes[0], role as (typeof ROLES)[number]); devices.push(d.page); }
    for (const [i, d] of devices.entries()) await expect(d.getByTestId('v2-role-brief')).toHaveAttribute('data-role', roles[i]);
    const ceo = devices[0];
    await ceo.getByTestId('v2-to-decide').click();
    await fillDecision(ceo, { quarter: 1, allocation: alloc({ consumer: 8, enterprise: 8, aiProduct: 8, people: 6 }) });
    await fillDiscussion(ceo, 1);
    await ceo.getByTestId('v2-to-vote').click();
    await expectPhase(ceo, 'risk', 1);
    for (const d of devices.slice(1)) { await expectPhase(d, 'risk', 1); await expect(d.getByTestId('v2-commit-team')).toBeDisabled(); }
    await ceo.getByTestId('v2-agreement-agreed').click();
    await ceo.getByTestId('v2-commit-team').click();
    if (size === 4) {
      // network interruption at the moment of commitment: nothing is resolved, the retry succeeds exactly once
      await ceo.context().setOffline(true);
      await ceo.getByTestId('v2-confirm-confirm').click();
      await expect(ceo.getByTestId('v2-error')).toBeVisible({ timeout: 15_000 });
      expect((await api.getGame(s.teamCodes[0])).resolutions).toHaveLength(0);
      await ceo.context().setOffline(false);
      await ceo.reload();
      await expectPhase(ceo, 'risk', 1);
      await ceo.getByTestId('v2-agreement-agreed').click();
      await ceo.getByTestId('v2-commit-team').click();
    }
    await ceo.getByTestId('v2-confirm-confirm').click();
    for (const d of devices) await expectPhase(d, 'results', 1);
    const g = await api.getGame(s.teamCodes[0]);
    expect(g.resolutions).toHaveLength(1);
    expect(g.game!.state_version).toBe(1);
  });
}

test('mobile quarterly results: Level 1 briefing first, detail on demand, no sideways scrolling', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Pocket'], { pacing: 'self' });
  const { page } = await newPage(browser);
  await page.setViewportSize({ width: 390, height: 844 });
  await joinTeam(page, s.sessionCode, s.teamCodes[0]);
  await playQuarter(page, plan(1, { consumer: 10, enterprise: 10, people: 10 }, 'balanced-marketplace'), {
    onResults: async p => {
      await expect(p.getByTestId('v2-figures')).toBeInViewport({ ratio: 0.1 });
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(over).toBeLessThanOrEqual(1);
      await shot(p, 's81-09-mobile-results');
    },
  });
});

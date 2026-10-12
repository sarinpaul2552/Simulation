/**
 * Batch 8 · Stage 2 — automated accessibility checks (axe-core, WCAG 2.1 A/AA rules) on the main screens.
 * Serious and critical violations fail the test; colour contrast is included.
 */
import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { newPage, createSession, joinTeam, playQuarter, expectPhase } from './helpers';
import { V2_BASE_ENVELOPE } from '../src/production/v2/adapter';
import type { V2PlayerQuarterInput } from '../src/production/v2/types';

const alloc = (p: Partial<V2PlayerQuarterInput['allocation']>): V2PlayerQuarterInput['allocation'] => {
  const a = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, ...p };
  return { ...a, cashReserve: V2_BASE_ENVELOPE - (a.consumer + a.enterprise + a.aiProduct + a.people + a.universityCredentials) };
};

async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const bad = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  if (bad.length) console.log(label, JSON.stringify(bad.map(v => ({ id: v.id, n: v.nodes.length, ex: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })), null, 1));
  expect(bad.map(v => v.id), label).toEqual([]);
}

test('main screens have no serious or critical WCAG violations', async ({ browser }) => {
  test.setTimeout(240_000);
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Access', 'Brief'], { pacing: 'self' });
  await audit(fac, 'facilitator');
  const { page } = await newPage(browser);
  await joinTeam(page, s.sessionCode, s.teamCodes[0], undefined, { keepIntro: true });
  await audit(page, 'introduction');
  await page.getByTestId('v2-intro-begin').click();
  await expectPhase(page, 'briefing', 1);
  await audit(page, 'briefing');
  const { page: other } = await newPage(browser);
  await joinTeam(other, s.sessionCode, s.teamCodes[1]);
  await other.getByTestId('v2-open-brief').click();
  await audit(other, 'role briefing');
  await playQuarter(page, { quarter: 1, allocation: alloc({ consumer: 8, enterprise: 8, aiProduct: 8, people: 6 }) }, {
    onDecide: p => audit(p, 'decision'),
    onResults: async p => {
      await audit(p, 'results');
      await p.getByTestId('v2-tab-scorecards').click();
      await audit(p, 'scorecards');
      await p.getByTestId('v2-tab-price').click();
      await audit(p, 'share price');
    },
  });
});

import { expect, Page, BrowserContext, Browser } from '@playwright/test';
import type { V2PlayerQuarterInput, V2Role, V2VoteValue } from '../src/production/v2/types';

export const ROLES: V2Role[] = ['CEO', 'CFO', 'Product', 'People', 'Growth'];

export async function newPage(browser: Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => { throw e; });
  return { ctx, page };
}

export async function createSession(page: Page, teams: string[], opts: { mode?: string; pacing?: string } = {}) {
  await page.goto('/');
  await page.getByTestId('v2-home-facilitator').click();
  await page.getByTestId('v2-setup-email').fill('facilitator@school.edu');
  await page.getByTestId('v2-setup-count').fill(String(teams.length));
  for (const [i, t] of teams.entries()) await page.getByTestId(`v2-setup-team-${i}`).fill(t);
  if (opts.mode) await page.getByTestId('v2-setup-mode').selectOption(opts.mode);
  if (opts.pacing) await page.getByTestId('v2-setup-pacing').selectOption(opts.pacing);
  await page.getByTestId('v2-setup-create').click();
  await expect(page.getByTestId('v2-fac-created')).toBeVisible();
  const sessionCode = (await page.getByTestId('v2-created-session-code').textContent())!.trim();
  const adminPin = (await page.getByTestId('v2-created-pin').textContent())!.trim();
  const teamCodes = (await page.getByTestId('v2-created-team-code').allTextContents()).map(s => s.trim());
  await page.getByTestId('v2-created-continue').click();
  await expect(page.getByTestId('v2-facilitator')).toBeVisible();
  return { sessionCode, adminPin, teamCodes };
}

export async function joinTeam(page: Page, sessionCode: string, teamCode: string, role?: V2Role) {
  await page.goto('/');
  await page.getByTestId('v2-home-team').click();
  await page.getByTestId('v2-join-session').fill(sessionCode);
  await page.getByTestId('v2-join-team').fill(teamCode);
  await page.getByTestId('v2-join-go').click();
  if (role) {
    await page.getByTestId('v2-join-role').selectOption(role);
    await page.getByTestId('v2-join-go').click();
  }
  await expect(page.getByTestId('v2-team-game')).toBeVisible();
}

export async function expectPhase(page: Page, phase: string, quarter?: number) {
  const game = page.getByTestId('v2-team-game');
  await expect(game).toHaveAttribute('data-phase', phase);
  if (quarter !== undefined) await expect(game).toHaveAttribute('data-quarter', String(quarter));
}

/** Reload the page and prove the exact same step is restored. */
export async function refreshAndExpect(page: Page, phase: string, quarter: number) {
  await page.reload();
  await expectPhase(page, phase, quarter);
}

export interface PlayOptions {
  refreshEveryPhase?: boolean;
  votes?: Partial<Record<V2Role, V2VoteValue>>;
  /** Called on the decide screen after the decision is entered (extra assertions). */
  onDecide?: (page: Page) => Promise<void>;
  reflection?: string;
}

export async function fillDecision(page: Page, input: V2PlayerQuarterInput) {
  if (input.finalOption) await page.getByTestId(`v2-final-${input.finalOption}`).check();
  for (const b of ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'] as const) {
    await page.getByTestId(`v2-alloc-${b}`).fill(String(input.allocation[b]));
  }
  if (input.destination) await page.getByTestId(`v2-dest-${input.destination}`).check();
  if (input.opportunity) await page.getByTestId(input.opportunity.accept ? 'v2-opp-accept' : 'v2-opp-decline').check();
  const m = input.management;
  if (m?.workforceReduction) {
    await page.getByTestId('v2-mgmt-workforce').selectOption(m.workforceReduction.depth);
    if (m.workforceReduction.protectRnD) await page.getByTestId('v2-mgmt-protect').check();
  }
  if (m?.hiringFreeze) await page.getByTestId('v2-mgmt-freeze').check();
  if (m?.pricing) await page.getByTestId('v2-mgmt-pricing').selectOption(m.pricing);
  if (m?.closeWeakOfferings) await page.getByTestId('v2-mgmt-close').check();
  if (input.crisisResponse) await page.getByTestId(`v2-crisis-${input.crisisResponse}`).check();
  for (const f of input.financing ?? []) {
    if (f.kind === 'debt') await page.getByTestId('v2-fin-debt').fill(String(f.amount));
    if (f.kind === 'equity') await page.getByTestId('v2-fin-equity').fill(String(f.amount));
    if (f.kind === 'repay') await page.getByTestId('v2-fin-repay').fill(String(f.amount));
    if (f.kind === 'partner') await page.getByTestId('v2-fin-partner').check();
    if (f.kind === 'restructure') await page.getByTestId('v2-fin-restructure').selectOption(f.depth);
  }
}

/** Play one quarter through the full classroom loop on a shared team device. Ends on the next quarter's briefing, the waiting screen, or 'final'. */
export async function playQuarter(page: Page, input: V2PlayerQuarterInput, opts: PlayOptions = {}) {
  const q = input.quarter;
  const r = async (phase: string, quarter = q) => { if (opts.refreshEveryPhase) await refreshAndExpect(page, phase, quarter); };
  await expectPhase(page, 'briefing', q);
  await r('briefing');
  for (const role of ROLES) {
    await expect(page.getByTestId('v2-next-role')).toHaveText(role);
    await expect(page.getByTestId('v2-role-brief')).toHaveCount(0);
    await page.getByTestId('v2-open-brief').click();
    await expect(page.getByTestId('v2-role-brief')).toHaveAttribute('data-role', role);
    await page.getByTestId('v2-hide-brief').click();
    await expect(page.getByTestId('v2-role-brief')).toHaveCount(0);
    if (opts.refreshEveryPhase && role === 'Product') await refreshAndExpect(page, 'briefing', q); // mid-briefing refresh keeps progress
  }
  await page.getByTestId('v2-to-decide').click();
  await expectPhase(page, 'decide', q);
  await r('decide');
  await fillDecision(page, input);
  if (opts.onDecide) await opts.onDecide(page);
  if (opts.refreshEveryPhase) {
    await page.waitForTimeout(700); // debounced draft save
    await refreshAndExpect(page, 'decide', q);
    await expect(page.getByTestId('v2-alloc-consumer')).toHaveValue(String(input.allocation.consumer));
  }
  await expect(page.getByTestId('v2-to-belief')).toBeEnabled();
  await page.getByTestId('v2-to-belief').click();
  await expectPhase(page, 'belief', q);
  await page.getByTestId('v2-belief').fill(`Q${q}: our thesis`);
  if (opts.refreshEveryPhase) {
    await page.waitForTimeout(700);
    await refreshAndExpect(page, 'belief', q);
    await expect(page.getByTestId('v2-belief')).toHaveValue(`Q${q}: our thesis`);
  }
  await page.getByTestId('v2-to-risk').click();
  await expectPhase(page, 'risk', q);
  await r('risk');
  await page.getByTestId('v2-risk-chip').first().click();
  await page.getByTestId('v2-to-vote').click();
  await expectPhase(page, 'vote', q);
  await r('vote');
  for (const [i, role] of ROLES.entries()) {
    await expect(page.getByTestId('v2-next-voter')).toHaveText(role);
    await expect(page.getByTestId('v2-votes-revealed')).toHaveCount(0);
    await page.getByTestId('v2-start-vote').click();
    await page.getByTestId(`v2-vote-${opts.votes?.[role] ?? 'support'}`).click();
    if (opts.refreshEveryPhase && i === 2) await refreshAndExpect(page, 'vote', q); // mid-vote refresh: 3 votes kept, still hidden
  }
  await expect(page.getByTestId('v2-votes-revealed')).toBeVisible();
  await page.getByTestId('v2-to-commit').click();
  await expectPhase(page, 'commit', q);
  await r('commit');
  await page.getByTestId('v2-commit').click();
  await expectPhase(page, 'results', q);
  await r('results');
  await expect(page.getByTestId('v2-explanation')).toBeVisible();
  await page.getByTestId('v2-to-reflect').click();
  await expectPhase(page, 'reflect', q);
  await r('reflect');
  await page.getByTestId('v2-reflection').fill(opts.reflection ?? `Q${q}: what we learned`);
  await page.getByTestId('v2-next-quarter').click();
}

export async function openQuarter(fac: Page, quarter: number) {
  await expect(fac.getByTestId('v2-fac-open-quarter')).toHaveText(`Q${quarter - 1}`);
  await fac.getByTestId('v2-fac-open-next').click();
  await expect(fac.getByTestId('v2-fac-open-quarter')).toHaveText(`Q${quarter}`);
}

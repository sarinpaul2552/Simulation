import { expect, Page, BrowserContext, Browser } from '@playwright/test';
import type { V2PlayerQuarterInput, V2Role, V2VoteValue } from '../src/production/v2/types';

export const ROLES: V2Role[] = ['CEO', 'CFO', 'Product', 'People', 'Growth'];

export async function newPage(browser: Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => { throw e; });
  return { ctx, page };
}

export async function createSession(page: Page, teams: string[], opts: { mode?: string; pacing?: string; presentation?: 'undergraduate' | 'mba' } = {}) {
  await page.goto('/');
  await page.getByTestId('v2-home-facilitator').click();
  await page.getByTestId('v2-setup-email').fill('facilitator@school.edu');
  await page.getByTestId('v2-setup-count').fill(String(teams.length));
  for (const [i, t] of teams.entries()) await page.getByTestId(`v2-setup-team-${i}`).fill(t);
  if (opts.mode) await page.getByTestId('v2-setup-mode').selectOption(opts.mode);
  if (opts.pacing) await page.getByTestId('v2-setup-pacing').selectOption(opts.pacing);
  if (opts.presentation) await page.getByTestId(`v2-setup-presentation-${opts.presentation}`).click();
  await page.getByTestId('v2-setup-create').click();
  await expect(page.getByTestId('v2-fac-created')).toBeVisible();
  if (opts.presentation === 'undergraduate' && process.env.V2_COMPAT === '1') await expect(page.getByTestId('v2-created-warning')).toBeVisible();
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
  /** Called on the decision screen after the decision is entered (extra assertions). */
  onDecide?: (page: Page) => Promise<void>;
  /** Called on the results screen before reflecting. */
  onResults?: (page: Page) => Promise<void>;
  reflection?: string;
}

/** A ChoiceList card (label wrapping a radio/checkbox). */
export const choice = (page: Page, id: string) => page.getByTestId(id).locator('input');

export async function fillDecision(page: Page, input: V2PlayerQuarterInput) {
  if (input.finalOption) await page.getByTestId(`v2-final-choice-${input.finalOption}`).click();
  for (const b of ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'] as const) {
    await page.getByTestId(`v2-alloc-${b}`).fill(String(input.allocation[b]));
  }
  if (input.destination) await page.getByTestId(`v2-dest-choice-${input.destination}`).click();
  if (input.opportunity) await page.getByTestId(input.opportunity.accept ? 'v2-opp-choice-accept' : 'v2-opp-choice-decline').click();
  const m = input.management;
  if (m?.workforceReduction) {
    await page.getByTestId('v2-mgmt-workforce').selectOption(m.workforceReduction.depth);
    if (m.workforceReduction.protectRnD) await page.getByTestId('v2-mgmt-protect').check();
  }
  if (m?.hiringFreeze) await page.getByTestId('v2-mgmt-freeze').check();
  if (m?.pricing) await page.getByTestId('v2-mgmt-pricing').selectOption(m.pricing);
  if (m?.closeWeakOfferings) await page.getByTestId('v2-mgmt-close').check();
  if (input.crisisResponse) await page.getByTestId(`v2-crisis-choice-${input.crisisResponse}`).click();
  const toggle = page.getByTestId('v2-fin-toggle');
  if (input.financing?.length && await toggle.count() && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
  for (const f of input.financing ?? []) {
    if (f.kind === 'debt') await page.getByTestId('v2-fin-debt').fill(String(f.amount));
    if (f.kind === 'equity') await page.getByTestId('v2-fin-equity').fill(String(f.amount));
    if (f.kind === 'repay') await page.getByTestId('v2-fin-repay').fill(String(f.amount));
    if (f.kind === 'partner') await page.getByTestId('v2-fin-partner').check();
    if (f.kind === 'restructure') await page.getByTestId('v2-fin-restructure').selectOption(f.depth);
  }
}

/** The structured leadership discussion: one belief, a confidence level, two risks. Returns the chosen ids. */
export async function fillDiscussion(page: Page, q: number) {
  const beliefId = `q${q}`;
  await page.locator(`[data-testid^="v2-belief-${beliefId}"]`).first().click();
  await page.getByTestId('v2-confidence-3').click();
  const risks = page.locator('[data-testid^="v2-risk-"]');
  await risks.nth(0).click();
  await risks.nth(1).click();
  // max two risks: the third is blocked
  await expect(risks.nth(2).locator('input')).toBeDisabled();
}

/** Walk through the five private briefings on the shared device. */
export async function readBriefings(page: Page, opts: { refreshAt?: V2Role; quarter?: number; stance?: boolean } = {}) {
  for (const role of ROLES) {
    await expect(page.getByTestId('v2-next-role')).toHaveText(role);
    await expect(page.getByTestId('v2-role-brief')).toHaveCount(0);
    await page.getByTestId('v2-open-brief').click();
    await expect(page.getByTestId('v2-role-brief')).toHaveAttribute('data-role', role);
    if (opts.stance) await page.locator('[data-testid^="v2-stance-"]:not([data-testid="v2-stance-options"])').first().click();
    await page.getByTestId('v2-hide-brief').click();
    await expect(page.getByTestId('v2-role-brief')).toHaveCount(0);
    if (opts.refreshAt === role) await refreshAndExpect(page, 'briefing', opts.quarter!);
  }
}

/** Play one quarter through the four stages on a shared team device. Ends on the next quarter's challenge, the waiting screen, or 'final'. */
export async function playQuarter(page: Page, input: V2PlayerQuarterInput, opts: PlayOptions = {}) {
  const q = input.quarter;
  const r = async (phase: string, quarter = q) => { if (opts.refreshEveryPhase) await refreshAndExpect(page, phase, quarter); };
  await expectPhase(page, 'briefing', q);
  await expect(page.getByTestId('ds-stepper')).toHaveAttribute('data-stage', '0');
  await r('briefing');
  await readBriefings(page, { refreshAt: opts.refreshEveryPhase ? 'Product' : undefined, quarter: q, stance: true });
  await page.getByTestId('v2-to-decide').click();
  await expectPhase(page, 'decide', q);
  await expect(page.getByTestId('ds-stepper')).toHaveAttribute('data-stage', '1');
  await r('decide');
  await fillDecision(page, input);
  await expect(page.getByTestId('v2-to-vote')).toBeDisabled(); // discussion still required
  await fillDiscussion(page, q);
  if (opts.onDecide) await opts.onDecide(page);
  if (opts.refreshEveryPhase) {
    await page.waitForTimeout(800); // debounced draft save
    await refreshAndExpect(page, 'decide', q);
    await expect(page.getByTestId('v2-alloc-consumer')).toHaveValue(String(input.allocation.consumer));
    await expect(page.locator('[data-testid^="v2-belief-"] input:checked')).toHaveCount(1);
    await expect(page.locator('[data-testid^="v2-risk-"] input:checked')).toHaveCount(2);
    await expect(page.getByTestId('v2-confidence-3')).toHaveAttribute('aria-checked', 'true');
  }
  try { await expect(page.getByTestId('v2-to-vote')).toBeEnabled({ timeout: 8000 }); }
  catch (e) { const v = page.getByTestId('v2-validation'); throw new Error(`Q${q} not ready: ${await v.count() ? await v.innerText() : '(no validation shown)'} / mode=${await page.getByTestId('v2-team-game').getAttribute('data-mode')}`); }
  await page.getByTestId('v2-to-vote').click();
  await expectPhase(page, 'vote', q);
  await expect(page.getByTestId('ds-stepper')).toHaveAttribute('data-stage', '2');
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
  await expect(page.getByTestId('ds-stepper')).toHaveAttribute('data-stage', '3');
  await r('results');
  await expect(page.getByTestId('v2-explanation')).toBeVisible();
  await expect(page.getByTestId('v2-kpis')).toBeVisible();
  await expect(page.getByTestId('v2-expected')).not.toHaveText('No belief was recorded.');
  if (opts.onResults) await opts.onResults(page);
  await expect(page.getByTestId('v2-next-quarter')).toBeDisabled(); // a learning choice is required
  await page.locator('[data-testid^="v2-learn-"]').first().click();
  const note = page.getByTestId('v2-reflection');
  if (await note.count()) await note.fill(opts.reflection ?? `Q${q}: what we learned`);
  await page.getByTestId('v2-next-quarter').click();
}

export async function openQuarter(fac: Page, quarter: number) {
  await expect(fac.getByTestId('v2-fac-open-quarter')).toHaveText(`Q${quarter - 1}`);
  await fac.getByTestId('v2-fac-open-next').click();
  await expect(fac.getByTestId('v2-fac-open-quarter')).toHaveText(`Q${quarter}`);
}

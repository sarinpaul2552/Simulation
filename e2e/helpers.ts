import { expect, Page, BrowserContext, Browser } from '@playwright/test';
import type { V2PlayerQuarterInput, V2Role, V2VoteValue } from '../src/production/v2/types';
import { calendarLabel } from '../src/production/v2/content/calendar';

export const ROLES: V2Role[] = ['CEO', 'CFO', 'Product', 'People', 'Growth'];

/** Contexts opened by newPage; closed after every test (see closeAllContexts). */
const OPEN: BrowserContext[] = [];
/**
 * Close every browser context the test opened. The worker's browser is shared by all tests, and contexts left open
 * accumulated across the suite (dozens of renderer processes by the last files) — the likely cause of the
 * late-suite "page never loads" stalls. Each spec registers this with test.afterEach.
 */
export async function closeAllContexts() {
  while (OPEN.length) await OPEN.pop()!.close().catch(() => undefined);
}

export async function newPage(browser: Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext();
  OPEN.push(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', e => { throw e; });
  return { ctx, page };
}

/**
 * Create a session through the facilitator UI. `market`: a NexLearn V3 path ('A' | 'B' | 'C') or 'v2' (default — the
 * pre-V3 suites test the original V2 economics, which stays available as "Original NexLearn").
 */
export async function createSession(page: Page, teams: string[], opts: { mode?: string; pacing?: string; presentation?: 'undergraduate' | 'mba'; commitment?: 'team_commitment' | 'private_vote'; market?: 'A' | 'B' | 'C' | 'v2'; econ?: '1.0' | '1.1' } = {}) {
  // V3.1 Stage 2: an explicit V3 engine version is selected only through the hidden `?econ=` flag.
  await page.goto(opts.econ ? `/?econ=${opts.econ}` : '/');
  await page.getByTestId('v2-home-facilitator').click();
  await page.getByTestId('v2-setup-email').fill('facilitator@school.edu');
  await page.getByTestId('v2-setup-count').fill(String(teams.length));
  for (const [i, t] of teams.entries()) await page.getByTestId(`v2-setup-team-${i}`).fill(t);
  if (opts.mode) await page.getByTestId('v2-setup-mode').selectOption(opts.mode);
  if (opts.pacing) await page.getByTestId('v2-setup-pacing').selectOption(opts.pacing);
  if (opts.presentation) await page.getByTestId(`v2-setup-presentation-${opts.presentation}`).click();
  if (opts.commitment) await page.getByTestId(`v2-setup-commitment-${opts.commitment}`).click();
  await page.getByTestId(`v2-setup-market-${opts.market ?? 'v2'}`).click();
  await page.getByTestId('v2-setup-create').click();
  await expect(page.getByTestId('v2-fac-created')).toBeVisible();
  // On an older schema, requesting a mode it lacks (Undergraduate, or Team Commitment — the default) shows a warning
  if (process.env.V2_COMPAT === '1' && (opts.presentation === 'undergraduate' || opts.commitment !== 'private_vote')) await expect(page.getByTestId('v2-created-warning')).toBeVisible();
  const sessionCode = (await page.getByTestId('v2-created-session-code').textContent())!.trim();
  const adminPin = (await page.getByTestId('v2-created-pin').textContent())!.trim();
  const teamCodes = (await page.getByTestId('v2-created-team-code').allTextContents()).map(s => s.trim());
  await page.getByTestId('v2-created-continue').click();
  await expect(page.getByTestId('v2-facilitator')).toBeVisible();
  return { sessionCode, adminPin, teamCodes };
}

export async function joinTeam(page: Page, sessionCode: string, teamCode: string, role?: V2Role, opts: { keepIntro?: boolean } = {}) {
  await page.goto('/');
  // Fail fast if the app shell never renders (the recurring environment stall), instead of waiting for the test timeout.
  await page.getByTestId('v2-home-team').click({ timeout: 60_000 });
  await page.getByTestId('v2-join-session').fill(sessionCode);
  await page.getByTestId('v2-join-team').fill(teamCode);
  await page.getByTestId('v2-join-go').click();
  if (role) {
    await page.getByTestId('v2-join-role').selectOption(role);
    await page.getByTestId('v2-join-go').click();
  }
  await expect(page.getByTestId('v2-team-game')).toBeVisible();
  // Batch 8: the NexLearn introduction greets a team at the start of Q1 2023 (once per team).
  const begin = page.getByTestId('v2-intro-begin');
  if (!opts.keepIntro && await begin.isVisible().catch(() => false)) { await begin.click(); await expect(begin).toHaveCount(0); }
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
  /** Team Commitment agreement (default 'agreed'). Ignored when the session uses private voting. */
  agreement?: 'agreed' | 'discussed' | 'leader';
  /** Called on the commit screen (team commitment) before committing. */
  onCommit?: (page: Page) => Promise<void>;
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
  if (input.recessionStance) await page.getByTestId(`v2-stance-${input.recessionStance}`).click(); // V3: required before cost actions
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
  if (input.expansion) await page.getByTestId('v2-fin-expansion').fill(String(input.expansion)); // V3 financed expansion
}

/**
 * The structured decision rationale (Batch 10A): strategic priority, evidence (Q3: one or two signals, max two),
 * belief, confidence and one biggest risk.
 */
export async function fillDiscussion(page: Page, q: number) {
  await page.locator('[data-testid^="v2-priority-"]').first().click();
  if (q === 3) {
    const ev = page.locator('[data-testid^="v2-evidence-"]');
    await ev.nth(0).click();
    await ev.nth(1).click();
    await expect(ev.nth(2).locator('input')).toBeDisabled(); // at most two signals
  } else {
    await expect(page.getByTestId('v2-evidence')).toHaveCount(0);
  }
  const beliefId = `q${q}`;
  await page.locator(`[data-testid^="v2-belief-${beliefId}"]`).first().click();
  await page.getByTestId('v2-confidence-3').click();
  const risks = page.locator('[data-testid^="v2-risk-"]');
  await risks.nth(0).click();
  await risks.nth(1).click(); // single choice: the second replaces the first
  await expect(page.locator('[data-testid^="v2-risk-"] input:checked')).toHaveCount(1);
}

/** Stage 4B: v3-econ-1.1 games use the redesigned journey (combined brief, compact commit, results summary). */
export async function isStage4(page: Page): Promise<boolean> {
  return (await page.getByTestId('v2-team-game').getAttribute('data-experience')) === 'stage4';
}

/** Walk through the five private briefings on the shared device (Stage 4B: one combined Leadership Team Brief). */
export async function readBriefings(page: Page, opts: { refreshAt?: V2Role; quarter?: number } = {}) {
  if (await isStage4(page)) {
    await expect(page.locator('[data-testid^="v2-exec-"]')).toHaveCount(5);
    await expect(page.getByTestId('v2-pass-device')).toHaveCount(0);
    if (opts.refreshAt) await refreshAndExpect(page, 'briefing', opts.quarter!);
    return;
  }
  for (const role of ROLES) {
    await expect(page.getByTestId('v2-next-role')).toHaveText(role);
    await expect(page.getByTestId('v2-role-brief')).toHaveCount(0);
    await page.getByTestId('v2-open-brief').click();
    await expect(page.getByTestId('v2-role-brief')).toHaveAttribute('data-role', role);
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
  await readBriefings(page, { refreshAt: opts.refreshEveryPhase ? 'Product' : undefined, quarter: q });
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
    await expect(page.locator('[data-testid^="v2-risk-"] input:checked')).toHaveCount(1);
    await expect(page.locator('[data-testid^="v2-priority-"] input:checked')).toHaveCount(1);
    if (q === 3) await expect(page.locator('[data-testid^="v2-evidence-"] input:checked')).toHaveCount(2);
    await expect(page.getByTestId('v2-confidence-3')).toHaveAttribute('aria-checked', 'true');
  }
  try { await expect(page.getByTestId('v2-to-vote')).toBeEnabled({ timeout: 8000 }); }
  catch (e) { const v = page.getByTestId('v2-validation'); throw new Error(`Q${q} not ready: ${await v.count() ? await v.innerText() : '(no validation shown)'} / mode=${await page.getByTestId('v2-team-game').getAttribute('data-mode')}`); }
  const commitment = await page.getByTestId('v2-team-game').getAttribute('data-commitment');
  await page.getByTestId('v2-to-vote').click();
  if (commitment === 'team_commitment') {
    await expectPhase(page, 'risk', q);
    await expect(page.getByTestId('ds-stepper')).toHaveAttribute('data-stage', '2');
    await expect(page.getByTestId('v2-team-commitment')).toBeVisible();
    await r('risk');
    await expect(page.getByTestId('v2-commit-team')).toBeDisabled(); // an agreement statement is required
    await page.getByTestId(`v2-agreement-${opts.agreement ?? 'agreed'}`).click();
    if (opts.onCommit) await opts.onCommit(page);
    await page.getByTestId('v2-commit-team').click();
    await expect(page.getByTestId('v2-confirm')).toBeVisible();
    await page.getByTestId('v2-confirm-confirm').click();
  } else {
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
  }
  await expectPhase(page, 'results', q);
  await expect(page.getByTestId('ds-stepper')).toHaveAttribute('data-stage', '3');
  await r('results');
  const stage4 = await isStage4(page);
  if (stage4) {
    // Stage 4B: four headline KPIs, three outcomes and one chart; the full board paper is behind View Details
    await expect(page.getByTestId('v2-s4-kpis')).toBeVisible();
    await expect(page.getByTestId('v2-s4-outcomes')).toBeVisible();
    await expect(page.getByTestId('v2-results-details')).not.toHaveAttribute('open', '');
    for (const id of ['v2-explanation', 'v2-figures', 'v2-consequence', 'v2-developments', 'v2-board-question']) await expect(page.getByTestId(id)).toBeAttached();
  } else {
    await expect(page.getByTestId('v2-explanation')).toBeVisible();
    await expect(page.getByTestId('v2-figures')).toBeVisible();
    await expect(page.getByTestId('v2-consequence')).toBeVisible();
    // Batch 8.1: Level 1 briefing is visible; the sequence, attribution and reconciling bridges are on demand (Level 3)
    await expect(page.getByTestId('v2-developments')).toBeVisible();
    await expect(page.getByTestId('v2-board-question')).toBeVisible();
  }
  await expect(page.getByTestId('v2-cash-bridge')).toHaveAttribute('data-reconciles', 'true');
  await expect(page.getByTestId('v2-deep')).not.toHaveAttribute('open', '');
  await expect(page.getByTestId('v2-sequence')).toBeAttached();
  await expect(page.getByTestId('v2-attribution')).toBeAttached();
  await expect(page.getByTestId('v2-valuation-bridge').first()).toHaveAttribute('data-reconciles', 'true');
  await expect(page.getByTestId('v2-expected')).not.toHaveText('Not recorded');
  await expect(page.getByTestId('v2-acc-priority')).not.toHaveText('Not recorded');
  // Batch 10A: the Q3 signal reveal appears only once Q4 is completed
  await expect(page.getByTestId('v2-signal-reveal')).toHaveCount(q >= 4 ? 1 : 0);
  if (opts.onResults) await opts.onResults(page);
  await expect(page.getByTestId('v2-next-quarter')).toBeDisabled(); // a learning choice is required
  await page.locator('[data-testid^="v2-learn-"]').first().click();
  const note = page.getByTestId('v2-reflection');
  if (await note.count()) await note.fill(opts.reflection ?? `Q${q}: what we learned`);
  if (opts.refreshEveryPhase) {
    // Batch 10A: the reflection is saved while it is written, so a refresh keeps it.
    await page.waitForTimeout(1500);
    await refreshAndExpect(page, 'results', q);
    await expect(page.locator('[data-testid^="v2-learn-"] input:checked')).toHaveCount(1);
  }
  await page.getByTestId('v2-next-quarter').click();
}

export async function openQuarter(fac: Page, quarter: number) {
  await expect(fac.getByTestId('v2-fac-open-quarter')).toHaveText(calendarLabel(quarter - 1));
  await fac.getByTestId('v2-fac-open-next').click();
  await expect(fac.getByTestId('v2-fac-open-quarter')).toHaveText(calendarLabel(quarter));
}

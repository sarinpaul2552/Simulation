window.__d = (() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const tid = id => document.querySelector(`[data-testid="${id}"]`);
  const all = id => [...document.querySelectorAll(`[data-testid="${id}"]`)];
  const waitFor = async (pred, ms = 20000, what = '') => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { const v = pred(); if (v) return v; await sleep(150); }
    const err = tid('v2-error');
    throw new Error(`timeout waiting for ${what}${err ? ' | error: ' + err.innerText : ''}`);
  };
  const setVal = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(v));
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };
  const click = async id => { const el = await waitFor(() => { const e = tid(id); return e && !e.disabled ? e : null; }, 20000, id); el.click(); await sleep(120); };
  const game = () => tid('v2-team-game');
  const phase = () => game()?.dataset.phase ?? null;
  const quarter = () => Number(game()?.dataset.quarter ?? 0);
  const waitPhase = (p, q) => waitFor(() => phase() === p && (q === undefined || quarter() === q), 30000, `phase ${p} q${q}`);
  const ROLES = ['CEO', 'CFO', 'Product', 'People', 'Growth'];
  const log = [];

  async function fill(input) {
    if (input.finalOption) { const r = await waitFor(() => tid(`v2-final-${input.finalOption}`), 10000, 'final option'); if (r.disabled) throw new Error('final option disabled: ' + input.finalOption); r.click(); await sleep(150); }
    for (const b of ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials']) { setVal(tid(`v2-alloc-${b}`), input.allocation[b]); await sleep(60); }
    if (input.destination) { tid(`v2-dest-${input.destination}`).click(); await sleep(80); }
    if (input.opportunity) { tid(input.opportunity.accept ? 'v2-opp-accept' : 'v2-opp-decline').click(); await sleep(80); }
    const m = input.management || {};
    if (m.pricing) { setVal(tid('v2-mgmt-pricing'), m.pricing); await sleep(80); }
    if (m.workforceReduction) { setVal(tid('v2-mgmt-workforce'), m.workforceReduction.depth); await sleep(80); }
    if (m.closeWeakOfferings) { tid('v2-mgmt-close').click(); await sleep(80); }
    if (input.crisisResponse) { tid(`v2-crisis-${input.crisisResponse}`).click(); await sleep(80); }
    for (const f of input.financing || []) if (f.kind === 'debt') { setVal(tid('v2-fin-debt'), f.amount); await sleep(80); }
  }

  /** Perform the current phase's actions once and advance. Returns the new phase. */
  async function step(input, opts = {}) {
    const p = phase(), q = quarter();
    switch (p) {
      case 'briefing': {
        while (tid('v2-open-brief')) {
          const role = tid('v2-next-role').innerText;
          if (tid('v2-role-brief')) throw new Error('brief visible before open');
          await click('v2-open-brief');
          const brief = await waitFor(() => tid('v2-role-brief'), 5000, 'brief');
          if (brief.dataset.role !== role) throw new Error('wrong brief role');
          log.push(`Q${q} ${role} brief signals=${brief.querySelectorAll('[data-signal-id]').length}`);
          await click('v2-hide-brief');
          await waitFor(() => !tid('v2-role-brief'), 5000, 'brief hidden');
        }
        await click('v2-to-decide'); await waitPhase('decide', q); break;
      }
      case 'decide': {
        await fill(input);
        await sleep(300);
        const v = tid('v2-validation'); if (v) throw new Error('validation: ' + v.innerText);
        if (opts.pauseAfterFill) { await sleep(800); return 'decide(filled)'; }
        await click('v2-to-belief'); await waitPhase('belief', q); break;
      }
      case 'belief': { setVal(tid('v2-belief'), `Q${q}: ${opts.belief || 'our thesis'}`); await sleep(200); await click('v2-to-risk'); await waitPhase('risk', q); break; }
      case 'risk': { if (!document.querySelector('.v2-chip.on')) all('v2-risk-chip')[q % 8].click(); await sleep(200); await click('v2-to-vote'); await waitFor(() => ['vote', 'commit'].includes(phase()), 20000, 'vote'); break; }
      case 'vote': {
        const votes = opts.votes || {};
        let n = 0;
        while (tid('v2-start-vote')) {
          if (tid('v2-votes-revealed')) throw new Error('revealed early');
          const panel = tid('v2-vote-panel').innerText;
          if (/Support|Oppose|Concern/.test(panel)) throw new Error('vote value visible early: ' + panel);
          const role = tid('v2-next-voter').innerText;
          await click('v2-start-vote');
          await click(`v2-vote-${votes[role] || 'support'}`);
          n++;
          if (opts.stopAfterVotes && n >= opts.stopAfterVotes) return 'vote(partial)';
          await waitFor(() => tid('v2-start-vote') || tid('v2-votes-revealed'), 10000, 'next voter');
        }
        await waitFor(() => tid('v2-votes-revealed'), 10000, 'reveal');
        log.push(`Q${q} votes ${ROLES.map(r => r + ':' + tid('v2-vote-' + r).innerText.split(': ')[1]).join(' ')}`);
        await click('v2-to-commit'); await waitPhase('commit', q); break;
      }
      case 'commit': {
        if (opts.doubleCommit) { const b = tid('v2-commit'); b.click(); b.click(); }
        else await click('v2-commit');
        await waitPhase('results', q); break;
      }
      case 'results': {
        const res = {
          q, revenue: tid('v2-res-revenue').innerText, cash: tid('v2-res-cash').innerText, solvency: tid('v2-res-solvency').innerText,
          explanation: tid('v2-explanation').innerText.split('\n').filter(Boolean).length,
        };
        log.push(`Q${q} results ${JSON.stringify(res)}`);
        await click('v2-to-reflect'); await waitPhase('reflect', q); break;
      }
      case 'reflect': {
        setVal(tid('v2-reflection'), `Q${q}: ${opts.reflection || 'what we learned'}`); await sleep(150);
        await click('v2-next-quarter');
        await waitFor(() => tid('v2-waiting') || phase() === 'final' || (phase() === 'briefing' && quarter() === q + 1), 20000, 'after reflect');
        break;
      }
      default: throw new Error('cannot step from ' + p);
    }
    return phase();
  }

  async function run(input, opts = {}) {
    const stop = opts.until;
    for (let i = 0; i < 12; i++) {
      const p = phase();
      if (stop && p === stop) return p;
      if (p === 'final' || tid('v2-waiting')) return tid('v2-waiting') ? 'waiting' : p;
      const r = await step(input, opts);
      if (typeof r === 'string' && r.includes('(')) return r;
    }
    return phase();
  }

  return { tid, all, setVal, click, phase, quarter, waitFor, waitPhase, step, run, log, sleep };
})();
'driver ready';

/**
 * Batch 7.5 migration safety on an EXISTING database: sessions created before the migration keep their voting
 * behaviour, and a quarter in progress (partial private votes) continues unchanged after the migration.
 * Run: V2_SKIP_BATCH75=1 bash scripts/v2-local/up.sh && V2_MIGRATION_CHECK=1 V2_DB_URL=... V2_DB_KEY=... npx vitest run scripts/v2-local/migration75.test.ts
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { createV2Api } from '../../src/production/v2/api';
import { loadTeamGame, saveDecisionDraft, commitQuarter } from '../../src/production/v2/gameService';
import { a } from '../../src/testlab/utils/v2ScenarioArc';

declare const process: { env: Record<string, string | undefined> };
const ON = process.env.V2_MIGRATION_CHECK === '1';

describe.skipIf(!ON)('Batch 7.5 migration on an existing database', () => {
  it('preserves the voting mode of existing sessions and in-flight quarters', async () => {
    const api = createV2Api(createClient(process.env.V2_DB_URL!, process.env.V2_DB_KEY!, { auth: { persistSession: false } }));
    const voting = await api.createSession('f@school.edu', ['Voters'], 'team_device', 'self');
    const novote = await api.createSession('f@school.edu', ['NoVote'], 'voting_disabled', 'self');
    expect(voting.commitment_mode).toBeUndefined(); // pre-migration schema
    const input = { quarter: 1, allocation: a({ consumer: 10, aiProduct: 10, cashReserve: 10 }) };
    const tc = voting.teams[0].team_code;
    await api.setPhase(tc, 1, 'briefing', 'decide').catch(async () => { await loadTeamGame(api, tc); await api.setPhase(tc, 1, 'briefing', 'decide'); });
    await saveDecisionDraft(api, await loadTeamGame(api, tc), { input });
    await api.setPhase(tc, 1, 'decide', 'belief'); await api.setPhase(tc, 1, 'belief', 'risk'); await api.setPhase(tc, 1, 'risk', 'vote');
    await api.submitVote(tc, 1, 'CEO', 'support'); await api.submitVote(tc, 1, 'CFO', 'concern');

    execSync('PGOPTIONS="-c client_min_messages=warning" psql -h /tmp -p 54329 -U postgres -v ON_ERROR_STOP=1 -q -d sim -f database/MIGRATION_V2_BATCH7_5_COMMITMENT.sql', { stdio: 'inherit' });
    execSync('kill -USR1 $(cat /tmp/v2pg/postgrest.pid) || true'); // reload PostgREST schema cache
    await new Promise(r => setTimeout(r, 1500));

    expect((await api.getGame(tc)).session.commitment_mode).toBe('private_vote');
    const nv = novote.teams[0].team_code;
    expect((await api.getGame(nv)).session.commitment_mode).toBe('none');
    // the in-flight vote continues exactly as before: 2 votes kept, hidden, three more required
    const v = await api.getVotes(tc, 1);
    expect(v.submitted_roles).toEqual(['CEO', 'CFO']);
    expect(v.votes).toBeNull();
    for (const r of ['Product', 'People', 'Growth'] as const) await api.submitVote(tc, 1, r, 'support');
    await api.setPhase(tc, 1, 'vote', 'commit');
    expect((await commitQuarter(api, await loadTeamGame(api, tc), input)).status).toBe('resolved');
    // a legacy no-vote session still commits without votes or agreement
    await loadTeamGame(api, nv);
    await api.setPhase(nv, 1, 'briefing', 'decide');
    await saveDecisionDraft(api, await loadTeamGame(api, nv), { input });
    await api.setPhase(nv, 1, 'decide', 'belief'); await api.setPhase(nv, 1, 'belief', 'risk'); await api.setPhase(nv, 1, 'risk', 'commit');
    expect((await commitQuarter(api, await loadTeamGame(api, nv), input)).status).toBe('resolved');
    // and new sessions now default to team commitment
    expect((await api.createSession('f@school.edu', ['New'], 'team_device', 'self')).commitment_mode).toBe('team_commitment');
  });
});

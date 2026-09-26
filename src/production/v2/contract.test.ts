import { describe, it, expect } from 'vitest';
import migration from '../../../database/MIGRATION_V2_PRODUCTION.sql?raw';
import { V2_FINAL_CALIBRATION, maxEnvelope } from '../../simulation/engineV2Final';
import { V2_PHASES } from './types';
import { V2_DESTINATION_IDS } from '../../simulation/engineV2Destination';

const sources = import.meta.glob('../../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('Batch 5 · 5B contract between the SQL layer and the frozen engine', () => {
  it('SQL envelope mirrors the engine (30 / scale 45 / raise 60)', () => {
    expect(V2_FINAL_CALIBRATION.defaultEnvelope).toBe(30);
    expect(maxEnvelope('scale-independently')).toBe(45);
    expect(maxEnvelope('raise-growth-capital')).toBe(60);
    expect(migration).toMatch(/p_final_option = 'scale-independently' THEN 45/);
    expect(migration).toMatch(/p_final_option = 'raise-growth-capital' THEN 60/);
    expect(migration).toMatch(/ELSE 30 END/);
  });

  it('SQL phase and destination lists match the adapter', () => {
    for (const p of [...V2_PHASES, 'final']) expect(migration).toContain(`'${p}'`);
    for (const d of V2_DESTINATION_IDS) expect(migration).toContain(`'${d}'`);
  });

  it('every new table has block-all RLS and every RPC pins search_path', () => {
    for (const t of ['v2_team_games', 'v2_quarter_resolutions', 'v2_votes']) {
      expect(migration).toContain(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      expect(migration).toMatch(new RegExp(`CREATE POLICY ${t}_block_all ON ${t} FOR ALL USING \\(false\\) WITH CHECK \\(false\\)`));
    }
    const fns = migration.split('CREATE OR REPLACE FUNCTION').slice(1);
    for (const f of fns) expect(f).toMatch(/SET search_path = public, pg_temp/);
  });

  it('the browser bundle never references the service role', () => {
    for (const [path, text] of Object.entries(sources)) {
      if (path.includes('.test.')) continue;
      expect(text, path).not.toMatch(/service_role|SERVICE_ROLE/);
    }
  });
});

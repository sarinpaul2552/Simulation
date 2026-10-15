import { ReactNode, useMemo, useState } from 'react';
import { supabase } from '../../../services/supabase';
import { createV2Api, V2ParticipationMode, V2Pacing, V2CreatedSession, econVersionFlag } from '../api';
import { V2_ROLES } from '../engine';
import type { V2Role } from '../types';
import type { V2PresentationMode } from '../content/modes';
import { teamSession, facilitatorSession } from './storage';
import { V2TeamGame } from './V2TeamGame';
import { V2Facilitator } from './V2Facilitator';
import { ChoiceList, ErrorBanner, Icon, Segmented } from './ds/components';
import { PATH_INFO } from '../content/paths';
import type { MarketPathId } from '../snapshot';
import './ds/ds.css';

type Screen =
  | { kind: 'home' }
  | { kind: 'fac-setup' }
  | { kind: 'fac-created'; created: V2CreatedSession; warning?: string }
  | { kind: 'fac-resume' }
  | { kind: 'fac-dashboard'; sessionCode: string; adminPin: string }
  | { kind: 'team-join' }
  | { kind: 'team-game'; teamCode: string; role?: V2Role };

function initialScreen(): Screen {
  const t = teamSession.load();
  if (t) return { kind: 'team-game', teamCode: t.teamCode, role: t.role };
  const f = facilitatorSession.load();
  if (f) return { kind: 'fac-dashboard', sessionCode: f.sessionCode, adminPin: f.adminPin };
  return { kind: 'home' };
}

function Page({ title, children, testId, narrow = true }: { title?: string; children: ReactNode; testId?: string; narrow?: boolean }) {
  return (
    <div className="ds-root">
      <header className="ds-topbar"><div className="ds-topbar-inner"><span className="ds-company">Business Simulation</span><span className="ds-meta">Strategy under disruption</span></div></header>
      <main className="ds-shell" style={narrow ? { maxWidth: 680 } : undefined} data-testid={testId}>
        {title && <h1 style={{ margin: '8px 0 16px' }}>{title}</h1>}
        {children}
      </main>
    </div>
  );
}

/** Production classroom app (V2 engine, Batch 7 experience). */
export default function V2App({ onOpenLegacy }: { onOpenLegacy?: () => void }) {
  const api = useMemo(() => createV2Api(supabase), []);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const home = () => setScreen({ kind: 'home' });

  switch (screen.kind) {
    case 'home':
      return (
        <div className="ds-root" data-testid="v2-home">
          <main className="ds-shell ds-stack-lg">
            <section className="ds-chapter" data-chapter-title="home">
              <span className="ds-chapter-kicker">Executive leadership simulation · eight quarters · five executive roles</span>
              <h1 className="ds-chapter-title" style={{ maxWidth: '22ch' }}>Lead NexLearn through eight quarters of change.</h1>
              <p className="ds-chapter-sub">Read the evidence, argue the trade-offs, commit as a leadership team — and answer to the board for the value you create.</p>
            </section>
            <div className="ds-grid ds-grid-3">
              <button className="ds-card ds-choice" data-testid="v2-home-team" onClick={() => setScreen({ kind: 'team-join' })}><Icon name="users" size={22} /><span><span className="ds-choice-title">Join as a team</span><span className="ds-muted" style={{ display: 'block' }}>Enter your session and team codes.</span></span></button>
              <button className="ds-card ds-choice" data-testid="v2-home-facilitator" onClick={() => setScreen({ kind: 'fac-setup' })}><Icon name="flag" size={22} /><span><span className="ds-choice-title">Facilitator: new session</span><span className="ds-muted" style={{ display: 'block' }}>Create teams and choose the class mode.</span></span></button>
              <button className="ds-card ds-choice" data-testid="v2-home-resume" onClick={() => setScreen({ kind: 'fac-resume' })}><Icon name="clock" size={22} /><span><span className="ds-choice-title">Facilitator: resume</span><span className="ds-muted" style={{ display: 'block' }}>Session code and admin PIN.</span></span></button>
            </div>
            {onOpenLegacy && <p style={{ marginTop: 0 }}><button className="ds-btn ds-btn-ghost" data-testid="v2-open-legacy" onClick={onOpenLegacy}>Legacy V1 engine (developer fallback)</button></p>}
          </main>
        </div>
      );
    case 'fac-setup':
      return <FacilitatorSetup api={api} onCancel={home} onCreated={(c, warning) => { facilitatorSession.save({ sessionCode: c.session_code, adminPin: c.admin_pin }); setScreen({ kind: 'fac-created', created: c, warning }); }} />;
    case 'fac-created':
      return <SessionCreated created={screen.created} warning={screen.warning} onContinue={() => setScreen({ kind: 'fac-dashboard', sessionCode: screen.created.session_code, adminPin: screen.created.admin_pin })} />;
    case 'fac-resume':
      return <FacilitatorResume api={api} onCancel={home} onResumed={(sessionCode, adminPin) => { facilitatorSession.save({ sessionCode, adminPin }); setScreen({ kind: 'fac-dashboard', sessionCode, adminPin }); }} />;
    case 'fac-dashboard':
      return <V2Facilitator api={api} sessionCode={screen.sessionCode} adminPin={screen.adminPin} onExit={() => { facilitatorSession.clear(); home(); }} />;
    case 'team-join':
      return <TeamJoin api={api} onCancel={home} onJoined={(sessionCode, teamCode, role) => { teamSession.save({ sessionCode, teamCode, role }); setScreen({ kind: 'team-game', teamCode, role }); }} />;
    case 'team-game':
      return <V2TeamGame api={api} teamCode={screen.teamCode} deviceRole={screen.role} onExit={() => { teamSession.clear(); home(); }} />;
  }
}

function FacilitatorSetup({ api, onCancel, onCreated }: { api: ReturnType<typeof createV2Api>; onCancel: () => void; onCreated: (c: V2CreatedSession, warning?: string) => void }) {
  const [email, setEmail] = useState('');
  const [count, setCount] = useState(3);
  const [names, setNames] = useState<string[]>(['Team A', 'Team B', 'Team C']);
  const [mode, setMode] = useState<V2ParticipationMode>('team_device');
  const [pacing, setPacing] = useState<V2Pacing>('facilitator');
  const [presentation, setPresentation] = useState<V2PresentationMode>('mba');
  const [commitment, setCommitment] = useState<'team_commitment' | 'private_vote'>('team_commitment');
  /** NexLearn V3 market path ('A' | 'B' | 'C'), or 'v2' for the original V2 economics. Fixed once the session is created. */
  const [market, setMarket] = useState<MarketPathId | 'v2'>('A');
  /**
   * V3.1 Stage 2: explicit V3 engine-version selection. Hidden: only a `?econ=1.1` URL flag selects it (for testing and
   * piloting before release); otherwise sessions are created exactly as before, on v3-econ-1.0.
   */
  const econVersion = useMemo(() => econVersionFlag(typeof window === 'undefined' ? '' : window.location.search), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setTeamCount = (n: number) => {
    const c = Math.max(1, Math.min(30, n || 1));
    setCount(c);
    setNames(prev => Array.from({ length: c }, (_, i) => prev[i] ?? `Team ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? i : ''}`));
  };
  const create = async () => {
    setBusy(true); setError(null);
    try {
      let created: V2CreatedSession;
      try {
        created = await api.createSession(email.trim(), names.map(n => n.trim() || 'Team'), mode, pacing, market === 'v2' ? undefined : market, market === 'v2' ? undefined : econVersion);
      } catch (e) {
        if (market !== 'v2' && econVersion && /is not available/i.test((e as Error).message)) {
          throw new Error(`NexLearn V3 engine version ${econVersion} is not available on this server.`);
        }
        if (market !== 'v2' && econVersion && /v3_create_session_v|function/i.test((e as Error).message)) {
          throw new Error(`NexLearn V3 engine version ${econVersion} is not available on this database yet (the V3.1 engine-version migration has not been applied).`);
        }
        if (market !== 'v2' && /v3_create_session|function/i.test((e as Error).message)) {
          throw new Error('NexLearn V3 market paths are not available on this database yet (the V3 migration has not been applied). Choose “Original NexLearn (V2)” or ask your administrator.');
        }
        throw e;
      }
      const warnings: string[] = [];
      try { await api.setPresentationMode(created.session_code, created.admin_pin, presentation); }
      catch { if (presentation !== 'mba') warnings.push('Presentation modes are not available on this database yet, so this session uses MBA mode.'); }
      if (created.commitment_mode === undefined) {
        // Database without the Batch 7.5 migration: sessions keep the original private-vote commit.
        if (commitment === 'team_commitment') warnings.push('Team Commitment is not available on this database yet, so teams will use private voting.');
      } else if (commitment === 'private_vote') {
        await api.setCommitmentMode(created.session_code, created.admin_pin, 'private_vote');
      }
      onCreated(created, warnings.length ? warnings.join(' ') : undefined);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Page title="New session" testId="v2-fac-setup">
      <ErrorBanner error={error} />
      <div className="ds-card ds-stack">
        <label className="ds-stack" style={{ gap: 4 }}><b>Your email</b><input className="ds-input" data-testid="v2-setup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <div className="ds-stack" style={{ gap: 4 }}><b>Class mode</b>
          <Segmented testIdPrefix="v2-setup-presentation" value={presentation} onChange={setPresentation} options={[{ id: 'undergraduate', label: 'Undergraduate' }, { id: 'mba', label: 'MBA' }]} />
          <span className="ds-muted">{presentation === 'undergraduate' ? 'Simpler language, more guidance, fewer metrics.' : 'Full evidence, deeper analysis, more metrics.'} Both use the same simulation and scoring.</span>
        </div>
        <div className="ds-stack" style={{ gap: 4 }}><b>How teams commit each quarter</b>
          <Segmented testIdPrefix="v2-setup-commitment" value={commitment} onChange={setCommitment} options={[{ id: 'team_commitment', label: 'Team commitment' }, { id: 'private_vote', label: 'Private voting' }]} />
          <span className="ds-muted">{commitment === 'team_commitment' ? 'The team reviews its decision, records how it agreed, and one person commits it. Fastest for a 90-minute workshop.' : 'Each of the five leaders votes privately; votes are revealed together before the team commits.'} You can change this during the session.</span>
        </div>
        <div className="ds-stack" style={{ gap: 4 }} data-testid="v2-setup-market"><b>Market path</b>
          <span className="ds-muted">Every team faces the same market. The path is fixed when the session is created and cannot be changed during the session.</span>
          <ChoiceList name="market" testIdPrefix="v2-setup-market" value={[market]} onChange={v => setMarket(v[0] as MarketPathId | 'v2')}
            options={[
              ...(['A', 'B', 'C'] as const).map(p => ({ id: p, label: <span><b>{PATH_INFO[p].name}</b></span>, detail: `${PATH_INFO[p].theme} ${PATH_INFO[p].facilitatorNote}` })),
              { id: 'v2', label: <span><b>Original NexLearn (V2 economics)</b></span>, detail: 'The previous economic model and its single market arc, for comparison with earlier classes.' },
            ]} />
        </div>
        <label className="ds-stack" style={{ gap: 4 }}><b>Number of teams</b><input className="ds-input" style={{ width: 100 }} data-testid="v2-setup-count" type="number" min={1} max={30} value={count} onChange={e => setTeamCount(parseInt(e.target.value, 10))} /></label>
        <div className="ds-grid ds-grid-2">
          {names.map((n, i) => <label key={i} className="ds-stack" style={{ gap: 4 }}><span className="ds-small">Team {i + 1}</span><input className="ds-input" data-testid={`v2-setup-team-${i}`} value={n} onChange={e => setNames(names.map((x, k) => (k === i ? e.target.value : x)))} /></label>)}
        </div>
        <label className="ds-stack" style={{ gap: 4 }}><b>Devices</b>
          <select className="ds-input" style={{ width: '100%' }} data-testid="v2-setup-mode" value={mode} onChange={e => setMode(e.target.value as V2ParticipationMode)}>
            <option value="team_device">One shared device per team</option>
            <option value="individual_device">One device per player (each picks a role)</option>
          </select>
        </label>
        <label className="ds-stack" style={{ gap: 4 }}><b>Pacing</b>
          <select className="ds-input" style={{ width: '100%' }} data-testid="v2-setup-pacing" value={pacing} onChange={e => setPacing(e.target.value as V2Pacing)}>
            <option value="facilitator">Facilitator opens each quarter</option>
            <option value="self">Teams proceed at their own pace</option>
          </select>
        </label>
      </div>
      <div className="ds-actions">
        <button className="ds-btn ds-btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="ds-btn ds-btn-primary" data-testid="v2-setup-create" disabled={busy || !email.includes('@')} onClick={() => void create()}>{busy ? 'Creating…' : 'Create session'}</button>
      </div>
    </Page>
  );
}

function SessionCreated({ created, warning, onContinue }: { created: V2CreatedSession; warning?: string; onContinue: () => void }) {
  return (
    <Page title="Session created" testId="v2-fac-created">
      {warning && <div className="ds-callout" data-testid="v2-created-warning"><Icon name="alert" />{warning}</div>}
      <div className="ds-card ds-stack">
        <div className="ds-grid ds-grid-2">
          <div><div className="ds-muted">Session code</div><div className="ds-kpi-value" data-testid="v2-created-session-code">{created.session_code}</div></div>
          <div><div className="ds-muted">Admin PIN (keep private)</div><div className="ds-kpi-value" data-testid="v2-created-pin">{created.admin_pin}</div></div>
        </div>
        <p style={{ margin: 0 }} data-testid="v2-created-market" data-path={created.market_path ?? 'v2'}><span className="ds-muted">Market path: </span><b>{created.market_path ? PATH_INFO[created.market_path].name : 'Original NexLearn (V2 economics)'}</b> <span className="ds-muted">— the same for every team; fixed for this session.</span></p>
        {created.econ_version && created.econ_version !== '1.0' && <p style={{ margin: 0 }} data-testid="v2-created-econ-version" data-version={created.econ_version}><span className="ds-muted">Engine version: </span><b>v3-econ-{created.econ_version}</b></p>}
        <table className="ds-table">
          <thead><tr><th>Team</th><th>Team code</th></tr></thead>
          <tbody>{created.teams.map(t => <tr key={t.team_id} data-testid="v2-created-team"><td>{t.team_name}</td><td><code data-testid="v2-created-team-code">{t.team_code}</code></td></tr>)}</tbody>
        </table>
        <p className="ds-muted" style={{ margin: 0 }}>Give each team the session code and its own team code. You can reopen the dashboard from any device with the session code and admin PIN.</p>
      </div>
      <div className="ds-actions"><button className="ds-btn ds-btn-primary" data-testid="v2-created-continue" onClick={onContinue}>Go to the facilitator dashboard <Icon name="arrow" /></button></div>
    </Page>
  );
}

function FacilitatorResume({ api, onCancel, onResumed }: { api: ReturnType<typeof createV2Api>; onCancel: () => void; onResumed: (code: string, pin: string) => void }) {
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resume = async () => {
    setBusy(true); setError(null);
    try {
      const o = await api.facilitatorOverview(code.trim().toUpperCase(), pin.trim());
      if (o.engine_version !== 'v2') throw new Error('This session uses the legacy V1 engine.');
      onResumed(o.session_code, pin.trim());
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Page title="Resume a session" testId="v2-fac-resume">
      <ErrorBanner error={error} />
      <div className="ds-card ds-stack">
        <label className="ds-stack" style={{ gap: 4 }}><b>Session code</b><input className="ds-input" data-testid="v2-resume-code" value={code} onChange={e => setCode(e.target.value)} placeholder="ISB-XXXXXX" /></label>
        <label className="ds-stack" style={{ gap: 4 }}><b>Admin PIN</b><input className="ds-input" data-testid="v2-resume-pin" value={pin} onChange={e => setPin(e.target.value)} /></label>
      </div>
      <div className="ds-actions">
        <button className="ds-btn ds-btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="ds-btn ds-btn-primary" data-testid="v2-resume-go" disabled={busy || !code || !pin} onClick={() => void resume()}>Resume</button>
      </div>
    </Page>
  );
}

function TeamJoin({ api, onCancel, onJoined }: { api: ReturnType<typeof createV2Api>; onCancel: () => void; onJoined: (sessionCode: string, teamCode: string, role?: V2Role) => void }) {
  const [sessionCode, setSessionCode] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [role, setRole] = useState<V2Role | ''>('');
  const [needsRole, setNeedsRole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const join = async () => {
    setBusy(true); setError(null);
    try {
      const s = sessionCode.trim().toUpperCase(), t = teamCode.trim().toUpperCase();
      const r = await api.join(s, t);
      if (r.session.engine_version !== 'v2') throw new Error('This session uses the legacy V1 engine. Ask your facilitator for a new session.');
      if (r.session.participation_mode === 'individual_device' && !role) { setNeedsRole(true); return; }
      onJoined(s, t, r.session.participation_mode === 'individual_device' ? (role as V2Role) : undefined);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Page title="Join your team" testId="v2-team-join">
      <ErrorBanner error={error} />
      <div className="ds-card ds-stack">
        <label className="ds-stack" style={{ gap: 4 }}><b>Session code</b><input className="ds-input" data-testid="v2-join-session" value={sessionCode} onChange={e => setSessionCode(e.target.value)} placeholder="ISB-XXXXXX" autoCapitalize="characters" /></label>
        <label className="ds-stack" style={{ gap: 4 }}><b>Team code</b><input className="ds-input" data-testid="v2-join-team" value={teamCode} onChange={e => setTeamCode(e.target.value)} placeholder="TEAM-XXXXXX" autoCapitalize="characters" /></label>
        {needsRole && (
          <label className="ds-stack" style={{ gap: 4 }}><b>Your role on this device</b>
            <select className="ds-input" data-testid="v2-join-role" value={role} onChange={e => setRole(e.target.value as V2Role)}>
              <option value="">Choose…</option>
              {V2_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="ds-actions">
        <button className="ds-btn ds-btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="ds-btn ds-btn-primary" data-testid="v2-join-go" disabled={busy || !sessionCode || !teamCode || (needsRole && !role)} onClick={() => void join()}>Join <Icon name="arrow" /></button>
      </div>
    </Page>
  );
}

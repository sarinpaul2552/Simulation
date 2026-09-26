import { useMemo, useState } from 'react';
import { supabase } from '../../../services/supabase';
import { createV2Api, V2ParticipationMode, V2Pacing, V2CreatedSession } from '../api';
import { V2_ROLES } from '../adapter';
import type { V2Role } from '../types';
import { teamSession, facilitatorSession } from './storage';
import { V2TeamGame } from './V2TeamGame';
import { V2Facilitator } from './V2Facilitator';
import { ErrorBox } from './common';
import './v2.css';

type Screen =
  | { kind: 'home' }
  | { kind: 'fac-setup' }
  | { kind: 'fac-created'; created: V2CreatedSession }
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

/** Production classroom app (V2 engine). */
export default function V2App({ onOpenLegacy }: { onOpenLegacy?: () => void }) {
  const api = useMemo(() => createV2Api(supabase), []);
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const home = () => setScreen({ kind: 'home' });

  switch (screen.kind) {
    case 'home':
      return (
        <div className="mode-select-screen">
          <div className="card" data-testid="v2-home">
            <h1>Business Simulation</h1>
            <p>Strategic decision-making under disruption · eight quarters</p>
            <div className="button-group">
              <button className="btn-primary" data-testid="v2-home-facilitator" onClick={() => setScreen({ kind: 'fac-setup' })}>Facilitator: new session</button>
              <button className="btn-secondary" data-testid="v2-home-resume" onClick={() => setScreen({ kind: 'fac-resume' })}>Facilitator: resume session</button>
              <button className="btn-secondary" data-testid="v2-home-team" onClick={() => setScreen({ kind: 'team-join' })}>Join as a team</button>
            </div>
            {onOpenLegacy && <button className="v2-link" data-testid="v2-open-legacy" onClick={onOpenLegacy}>Legacy V1 engine (developer fallback)</button>}
          </div>
        </div>
      );
    case 'fac-setup':
      return <FacilitatorSetup api={api} onCancel={home} onCreated={c => {
        facilitatorSession.save({ sessionCode: c.session_code, adminPin: c.admin_pin });
        setScreen({ kind: 'fac-created', created: c });
      }} />;
    case 'fac-created':
      return <SessionCreated created={screen.created} onContinue={() => setScreen({ kind: 'fac-dashboard', sessionCode: screen.created.session_code, adminPin: screen.created.admin_pin })} />;
    case 'fac-resume':
      return <FacilitatorResume api={api} onCancel={home} onResumed={(sessionCode, adminPin) => {
        facilitatorSession.save({ sessionCode, adminPin });
        setScreen({ kind: 'fac-dashboard', sessionCode, adminPin });
      }} />;
    case 'fac-dashboard':
      return <V2Facilitator api={api} sessionCode={screen.sessionCode} adminPin={screen.adminPin} onExit={() => { facilitatorSession.clear(); home(); }} />;
    case 'team-join':
      return <TeamJoin api={api} onCancel={home} onJoined={(sessionCode, teamCode, role) => {
        teamSession.save({ sessionCode, teamCode, role });
        setScreen({ kind: 'team-game', teamCode, role });
      }} />;
    case 'team-game':
      return <V2TeamGame api={api} teamCode={screen.teamCode} deviceRole={screen.role} onExit={() => { teamSession.clear(); home(); }} />;
  }
}

function FacilitatorSetup({ api, onCancel, onCreated }: { api: ReturnType<typeof createV2Api>; onCancel: () => void; onCreated: (c: V2CreatedSession) => void }) {
  const [email, setEmail] = useState('');
  const [count, setCount] = useState(3);
  const [names, setNames] = useState<string[]>(['Team A', 'Team B', 'Team C']);
  const [mode, setMode] = useState<V2ParticipationMode>('team_device');
  const [pacing, setPacing] = useState<V2Pacing>('facilitator');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setTeamCount = (n: number) => {
    const c = Math.max(1, Math.min(30, n || 1));
    setCount(c);
    setNames(prev => Array.from({ length: c }, (_, i) => prev[i] ?? `Team ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? i : ''}`));
  };
  const create = async () => {
    setBusy(true); setError(null);
    try { onCreated(await api.createSession(email.trim(), names.map(n => n.trim() || 'Team'), mode, pacing)); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="v2-screen v2-narrow" data-testid="v2-fac-setup">
      <h1>New session</h1>
      <ErrorBox error={error} />
      <div className="v2-panel">
        <label>Your email <input data-testid="v2-setup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Number of teams <input data-testid="v2-setup-count" type="number" min={1} max={30} value={count} onChange={e => setTeamCount(parseInt(e.target.value, 10))} /></label>
        {names.map((n, i) => (
          <label key={i}>Team {i + 1} name <input data-testid={`v2-setup-team-${i}`} value={n} onChange={e => setNames(names.map((x, k) => (k === i ? e.target.value : x)))} /></label>
        ))}
        <label>Participation
          <select data-testid="v2-setup-mode" value={mode} onChange={e => setMode(e.target.value as V2ParticipationMode)}>
            <option value="team_device">One shared device per team (five roles vote in turn)</option>
            <option value="individual_device">One device per player (each picks a role)</option>
            <option value="voting_disabled">Shared device, no leadership vote</option>
          </select>
        </label>
        <label>Pacing
          <select data-testid="v2-setup-pacing" value={pacing} onChange={e => setPacing(e.target.value as V2Pacing)}>
            <option value="facilitator">Facilitator opens each quarter</option>
            <option value="self">Teams proceed at their own pace</option>
          </select>
        </label>
      </div>
      <div className="v2-actions">
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" data-testid="v2-setup-create" disabled={busy || !email.includes('@')} onClick={() => void create()}>{busy ? 'Creating…' : 'Create session'}</button>
      </div>
    </div>
  );
}

function SessionCreated({ created, onContinue }: { created: V2CreatedSession; onContinue: () => void }) {
  return (
    <div className="v2-screen v2-narrow" data-testid="v2-fac-created">
      <h1>Session created</h1>
      <div className="v2-panel">
        <p>Session code: <b data-testid="v2-created-session-code">{created.session_code}</b></p>
        <p>Admin PIN (keep private): <b data-testid="v2-created-pin">{created.admin_pin}</b></p>
        <table className="v2-table">
          <thead><tr><th>Team</th><th>Team code</th></tr></thead>
          <tbody>{created.teams.map(t => <tr key={t.team_id} data-testid="v2-created-team"><td>{t.team_name}</td><td><code data-testid="v2-created-team-code">{t.team_code}</code></td></tr>)}</tbody>
        </table>
        <p className="v2-muted">Give each team the session code and its own team code. You can reopen this dashboard from any device with the session code and admin PIN.</p>
      </div>
      <button className="btn-primary" data-testid="v2-created-continue" onClick={onContinue}>Go to the facilitator dashboard</button>
    </div>
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
    <div className="v2-screen v2-narrow" data-testid="v2-fac-resume">
      <h1>Resume a session</h1>
      <ErrorBox error={error} />
      <div className="v2-panel">
        <label>Session code <input data-testid="v2-resume-code" value={code} onChange={e => setCode(e.target.value)} placeholder="ISB-XXXXXX" /></label>
        <label>Admin PIN <input data-testid="v2-resume-pin" value={pin} onChange={e => setPin(e.target.value)} /></label>
      </div>
      <div className="v2-actions">
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" data-testid="v2-resume-go" disabled={busy || !code || !pin} onClick={() => void resume()}>Resume</button>
      </div>
    </div>
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
    <div className="v2-screen v2-narrow" data-testid="v2-team-join">
      <h1>Join your team</h1>
      <ErrorBox error={error} />
      <div className="v2-panel">
        <label>Session code <input data-testid="v2-join-session" value={sessionCode} onChange={e => setSessionCode(e.target.value)} placeholder="ISB-XXXXXX" /></label>
        <label>Team code <input data-testid="v2-join-team" value={teamCode} onChange={e => setTeamCode(e.target.value)} placeholder="TEAM-XXXXXX" /></label>
        {needsRole && (
          <label>Your role on this device
            <select data-testid="v2-join-role" value={role} onChange={e => setRole(e.target.value as V2Role)}>
              <option value="">Choose…</option>
              {V2_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="v2-actions">
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" data-testid="v2-join-go" disabled={busy || !sessionCode || !teamCode || (needsRole && !role)} onClick={() => void join()}>Join</button>
      </div>
    </div>
  );
}

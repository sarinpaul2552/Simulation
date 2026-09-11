import { useState, useEffect } from 'react';
import { GameProvider } from './context/GameContext';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import FacilitatorScreen from './components/FacilitatorScreen';
import { useSessionRestore } from './hooks/useSessionRestore';
import './App.css';

type Mode = 'mode-select' | 'facilitator-setup' | 'team-join' | 'team-game' | 'facilitator-game' | 'restore-checking' | 'restore-error';

function AppContent() {
  const [mode, setMode] = useState<Mode>('restore-checking');
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [adminPin, setAdminPin] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  
  const restore = useSessionRestore();

  // On mount, check if we can restore a session
  useEffect(() => {
    if (restore.status === 'restored' && restore.restoredState) {
      // Successfully restored - go directly to game
      setSessionCode(restore.restoredState.sessionCode);
      setMode('team-game');
      return;
    }

    if (restore.status === 'invalid' || restore.status === 'error') {
      // Restoration failed - show error and return to mode select
      setRestoreError(restore.error || 'Failed to restore session');
      setMode('restore-error');
      return;
    }

    // No stored session - show normal mode select
    if (restore.status === 'idle') {
      setMode('mode-select');
    }
  }, [restore.status, restore.error, restore.restoredState]);

  return (
    <div className="app-container">
      {mode === 'restore-checking' && (
        <div className="mode-select-screen">
          <div className="card">
            <h1>Restoring Session...</h1>
            <p>Checking for existing game session.</p>
          </div>
        </div>
      )}

      {mode === 'restore-error' && (
        <div className="mode-select-screen">
          <div className="card">
            <h1>Session Expired</h1>
            <p className="error-message">{restoreError}</p>
            <button 
              onClick={() => {
                setRestoreError(null);
                setMode('mode-select');
              }} 
              className="btn-primary"
            >
              Start New Game
            </button>
          </div>
        </div>
      )}

      {mode === 'mode-select' && (
        <div className="mode-select-screen">
          <div className="card">
            <h1>Business Simulation V4</h1>
            <p>Strategic decision-making under disruption</p>
            <div className="button-group">
              <button onClick={() => setMode('facilitator-setup')} className="btn-primary">
                Facilitator
              </button>
              <button onClick={() => setMode('team-join')} className="btn-secondary">
                Team Member
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === 'facilitator-setup' && (
        <SetupScreen
          onSessionCreated={(code, pin) => {
            setSessionCode(code);
            setAdminPin(pin || null);
            setMode('facilitator-game');
          }}
          onCancel={() => setMode('mode-select')}
        />
      )}

      {mode === 'team-join' && (
        <SetupScreen
          isStudent
          onSessionCreated={(code) => {
            setSessionCode(code);
            setMode('team-game');
          }}
          onCancel={() => setMode('mode-select')}
        />
      )}

      {mode === 'team-game' && sessionCode && (
        <GameScreen
          sessionCode={sessionCode}
          onExit={() => setMode('mode-select')}
        />
      )}

      {mode === 'facilitator-game' && sessionCode && adminPin && (
        <FacilitatorScreen
          sessionCode={sessionCode}
          adminPin={adminPin}
          onExit={() => setMode('mode-select')}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

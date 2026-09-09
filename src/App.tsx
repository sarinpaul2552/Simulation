import { useState } from 'react';
import { GameProvider } from './context/GameContext';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import FacilitatorScreen from './components/FacilitatorScreen';
import './App.css';

type Mode = 'mode-select' | 'facilitator-setup' | 'team-join' | 'team-game' | 'facilitator-game';

export default function App() {
  const [mode, setMode] = useState<Mode>('mode-select');
  const [sessionCode, setSessionCode] = useState<string | null>(null);

  return (
    <GameProvider>
      <div className="app-container">
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
            onSessionCreated={(code) => {
              setSessionCode(code);
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

        {mode === 'facilitator-game' && sessionCode && (
          <FacilitatorScreen
            sessionCode={sessionCode}
            onExit={() => setMode('mode-select')}
          />
        )}
      </div>
    </GameProvider>
  );
}

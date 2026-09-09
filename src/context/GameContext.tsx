import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { TeamData, DecisionData } from '../services/supabase';
import { Allocation, Consequence } from '../simulation/engine';

export type GamePhase = 'setup' | 'q1-q8' | 'final-debrief';
export type QuarterPhase = 'event' | 'bet' | 'belief' | 'risk' | 'role-vote' | 'team-check' | 'commit' | 'consequence' | 'reflect';

export interface GameContextType {
  // Session
  sessionCode: string | null;
  sessionId: string | null;
  facilitatorEmail: string | null;
  teamCode: string | null;
  teamCount: number;
  currentQuarter: number;
  gamePhase: GamePhase;
  quarterPhase: QuarterPhase;
  
  // Team Data
  teams: TeamData[];
  currentTeamId: string | null;
  currentTeam: TeamData | null;
  
  // Current Decision
  currentDecision: DecisionData | null;
  currentAllocation: Allocation | null;
  currentBelief: string | null;
  currentRisks: Array<{ identified: string; severity: number }> | null;
  currentRoleVotes: Record<string, { vote: 'yes' | 'no' | 'abstain'; confidence: number; rationale: string }> | null;
  currentTeamCheckAlignment: string | null;
  currentTeamCheckOverride: boolean;
  currentTeamCheckDissentingRoles: string[];
  
  // Consequences
  lastConsequence: Consequence | null;
  decisionHistory: DecisionData[];
  
  // Actions
  setSessionCode: (code: string) => void;
  setSessionId: (id: string) => void;
  setFacilitatorEmail: (email: string) => void;
  setTeamCode: (code: string) => void;
  setTeamCount: (count: number) => void;
  setCurrentTeamId: (id: string) => void;
  setTeams: (teams: TeamData[]) => void;
  updateTeam: (teamId: string, updates: Partial<TeamData>) => void;
  
  setGamePhase: (phase: GamePhase) => void;
  setCurrentQuarter: (quarter: number) => void;
  setQuarterPhase: (phase: QuarterPhase) => void;
  advanceQuarterPhase: () => void;
  
  setCurrentAllocation: (allocation: Allocation) => void;
  setCurrentBelief: (belief: string) => void;
  setCurrentRisks: (risks: Array<{ identified: string; severity: number }>) => void;
  setCurrentRoleVote: (role: string, vote: 'yes' | 'no' | 'abstain', confidence: number, rationale: string) => void;
  setCurrentTeamCheckAlignment: (alignment: string) => void;
  setCurrentTeamCheckOverride: (override: boolean, dissentingRoles: string[]) => void;
  
  setLastConsequence: (consequence: Consequence) => void;
  setDecisionHistory: (history: DecisionData[]) => void;
  addToDecisionHistory: (decision: DecisionData) => void;
  
  // Reset
  resetQuarter: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [facilitatorEmail, setFacilitatorEmail] = useState<string | null>(null);
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [teamCount, setTeamCount] = useState(0);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [teams, setTeams] = useState<TeamData[]>([]);
  
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [quarterPhase, setQuarterPhase] = useState<QuarterPhase>('event');
  const [currentQuarter, setCurrentQuarter] = useState(0);
  
  const [currentAllocation, setCurrentAllocation] = useState<Allocation | null>(null);
  const [currentBelief, setCurrentBelief] = useState<string | null>(null);
  const [currentRisks, setCurrentRisks] = useState<Array<{ identified: string; severity: number }> | null>(null);
  const [currentRoleVotes, setCurrentRoleVotes] = useState<Record<string, { vote: 'yes' | 'no' | 'abstain'; confidence: number; rationale: string }> | null>(null);
  const [currentTeamCheckAlignment, setCurrentTeamCheckAlignment] = useState<string | null>(null);
  const [currentTeamCheckOverride, setCurrentTeamCheckOverride] = useState(false);
  const [currentTeamCheckDissentingRoles, setCurrentTeamCheckDissentingRoles] = useState<string[]>([]);
  
  const [currentDecision, setCurrentDecision] = useState<DecisionData | null>(null);
  const [lastConsequence, setLastConsequence] = useState<Consequence | null>(null);
  const [decisionHistory, setDecisionHistory] = useState<DecisionData[]>([]);
  
  const currentTeam = currentTeamId ? teams.find(t => t.id === currentTeamId) || null : null;
  
  const updateTeam = useCallback((teamId: string, updates: Partial<TeamData>) => {
    setTeams(prevTeams => 
      prevTeams.map(t => t.id === teamId ? { ...t, ...updates } : t)
    );
  }, []);
  
  const setCurrentRoleVote = useCallback((role: string, vote: 'yes' | 'no' | 'abstain', confidence: number, rationale: string) => {
    setCurrentRoleVotes(prev => ({
      ...prev || {},
      [role]: { vote, confidence, rationale },
    }));
  }, []);
  
  const setCurrentTeamCheckOverride_impl = useCallback((override: boolean, dissentingRoles: string[]) => {
    setCurrentTeamCheckOverride(override);
    setCurrentTeamCheckDissentingRoles(dissentingRoles);
  }, []);
  
  const advanceQuarterPhase = useCallback(() => {
    const phases: QuarterPhase[] = ['event', 'bet', 'belief', 'risk', 'role-vote', 'team-check', 'commit', 'consequence', 'reflect'];
    const currentIndex = phases.indexOf(quarterPhase);
    if (currentIndex < phases.length - 1) {
      setQuarterPhase(phases[currentIndex + 1]);
    }
  }, [quarterPhase]);
  
  const addToDecisionHistory = useCallback((decision: DecisionData) => {
    setDecisionHistory(prev => [...prev, decision]);
  }, []);
  
  const resetQuarter = useCallback(() => {
    setCurrentAllocation(null);
    setCurrentBelief(null);
    setCurrentRisks(null);
    setCurrentRoleVotes(null);
    setCurrentTeamCheckAlignment(null);
    setCurrentTeamCheckOverride(false);
    setCurrentTeamCheckDissentingRoles([]);
    setCurrentDecision(null);
    setQuarterPhase('event');
  }, []);
  
  const value = useMemo<GameContextType>(() => ({
    sessionCode,
    sessionId,
    facilitatorEmail,
    teamCode,
    teamCount,
    currentQuarter,
    gamePhase,
    quarterPhase,
    teams,
    currentTeamId,
    currentTeam,
    currentDecision,
    currentAllocation,
    currentBelief,
    currentRisks,
    currentRoleVotes,
    currentTeamCheckAlignment,
    currentTeamCheckOverride,
    currentTeamCheckDissentingRoles,
    lastConsequence,
    decisionHistory,
    
    setSessionCode,
    setSessionId,
    setFacilitatorEmail,
    setTeamCode,
    setTeamCount,
    setCurrentTeamId,
    setTeams,
    updateTeam,
    setGamePhase,
    setCurrentQuarter,
    setQuarterPhase,
    advanceQuarterPhase,
    setCurrentAllocation,
    setCurrentBelief,
    setCurrentRisks,
    setCurrentRoleVote,
    setCurrentTeamCheckAlignment,
    setCurrentTeamCheckOverride: setCurrentTeamCheckOverride_impl,
    setLastConsequence,
    setDecisionHistory,
    addToDecisionHistory,
    resetQuarter,
  }), [
    sessionCode,
    sessionId,
    facilitatorEmail,
    teamCode,
    teamCount,
    currentQuarter,
    gamePhase,
    quarterPhase,
    teams,
    currentTeamId,
    currentTeam,
    currentDecision,
    currentAllocation,
    currentBelief,
    currentRisks,
    currentRoleVotes,
    currentTeamCheckAlignment,
    currentTeamCheckOverride,
    currentTeamCheckDissentingRoles,
    lastConsequence,
    decisionHistory,
    setSessionCode,
    setSessionId,
    setFacilitatorEmail,
    setTeamCode,
    setTeamCount,
    setCurrentTeamId,
    setTeams,
    updateTeam,
    setGamePhase,
    setCurrentQuarter,
    setQuarterPhase,
    advanceQuarterPhase,
    setCurrentAllocation,
    setCurrentBelief,
    setCurrentRisks,
    setCurrentRoleVote,
    setCurrentTeamCheckAlignment,
    setCurrentTeamCheckOverride_impl,
    setLastConsequence,
    setDecisionHistory,
    addToDecisionHistory,
    resetQuarter,
  ]);
  
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

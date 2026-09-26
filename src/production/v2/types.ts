/**
 * V2 PRODUCTION CONTRACT TYPES (Batch 5 · 5A)
 *
 * The economic input a team commits for one quarter (`V2PlayerQuarterInput`) is the ONLY thing the frozen engine sees.
 * Deliberation (belief, risks, votes, reflection) is stored separately and is structurally unable to reach the engine.
 */
import type { V2Allocation } from '../../simulation/engineV2';
import type { V2ManagementActions } from '../../simulation/engineV2Management';
import type { V2FinancingAction } from '../../simulation/engineV2Financing';
import type { V2CrisisResponseId } from '../../simulation/engineV2Crisis';
import type { V2FinalOptionId } from '../../simulation/engineV2Final';
import type { V2DestinationId } from '../../simulation/engineV2Destination';
import type { V2Role } from '../../simulation/engineV2Scenario';

export type { V2Role };

/** Economic decisions for one quarter (engine input). */
export interface V2PlayerQuarterInput {
  quarter: number;
  /** Six buckets; must total the quarter's strategic envelope ($30M; Q8 depends on the final option). */
  allocation: V2Allocation;
  /** Q4 only (required). */
  destination?: V2DestinationId;
  /** Q5 only (required): accept/decline the scenario opportunity. */
  opportunity?: { offerId: string; accept: boolean };
  /** Q6 only (optional): recession response actions. */
  management?: V2ManagementActions;
  /** Q7 only (required): response to the company's own crisis. */
  crisisResponse?: V2CrisisResponseId;
  /** Q8 only (required): final strategic option (must be earned). */
  finalOption?: V2FinalOptionId;
  /** Any quarter (optional): explicit financing / liquidity actions chosen by the CFO. */
  financing?: V2FinancingAction[];
}

/** Non-economic deliberation for a quarter. Never passed to the engine. */
export interface V2Deliberation {
  /** The team's thesis for the quarter (free text). */
  belief?: string;
  /** Confidence 1–5. */
  confidence?: number;
  /** Named risks (free text / chips). */
  risks?: string[];
}

export type V2VoteValue = 'support' | 'concern' | 'oppose';

/** Production classroom loop phases (V2). */
export const V2_PHASES = ['briefing', 'decide', 'belief', 'risk', 'vote', 'commit', 'results', 'reflect'] as const;
export type V2Phase = typeof V2_PHASES[number];

export type V2SeverityBand = 'minor' | 'moderate' | 'serious';

export interface V2Signal {
  id: string;
  /** 'measured' = the company's own KPI from last quarter (exact). Others are scenario signals (may be noisy). */
  kind: 'measured' | 'headline' | 'estimate' | 'lagging';
  label: string;
  value?: number;
  range?: [number, number];
  unit?: string;
}

export interface V2RoleBrief {
  role: V2Role;
  focus: string;
  /** Role-private scenario signals + measured KPIs the role owns. */
  signals: V2Signal[];
}

export interface V2ExplanationLine {
  area: 'revenue' | 'customers' | 'organization' | 'capabilities' | 'cash' | 'decision' | 'risk';
  tone: 'positive' | 'negative' | 'neutral';
  text: string;
}

export interface V2QuarterResult {
  quarter: number;
  revenue: number;
  revenueChange: number;
  operatingProfit: number;
  operatingMargin: number;
  closingCash: number;
  cashChange: number;
  debt: number;
  ownership: number;
  solvency: 'healthy' | 'watch' | 'warning' | 'insolvent';
  distressed: boolean;
  destination: V2DestinationId | null;
  segments: { consumer: number; enterprise: number; university: number; aiNative: number };
  explanation: V2ExplanationLine[];
}

/** Facilitator-safe headline (no role-private signals, no hidden market truth). */
export interface V2Headline {
  completedQuarter: number;
  revenue: number;
  operatingProfit: number;
  cash: number;
  debt: number;
  culture: number;
  trust: number;
  destination: V2DestinationId | null;
  solvency: 'healthy' | 'watch' | 'warning' | 'insolvent';
  distressed: boolean;
  everInsolvent: boolean;
  financingRounds: number;
  finalOption: string | null;
  /** Terminal score once Q8 is resolved. */
  final?: { overall: number; financial: number; strategic: number; organizational: number } | null;
}

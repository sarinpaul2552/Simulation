/**
 * ENGINE FACADE (NexLearn V3 integration)
 *
 * The one module the classroom UI, insights and persistence call for game economics. It dispatches on the snapshot's
 * engine version:
 *   - V2 games ('v2-econ-batch4-frozen') → the frozen V2 adapter (`./adapter`, unchanged) — existing sessions replay
 *     exactly as before;
 *   - V3 games ('v3-econ-1.0') → the V3 adapter (`../v3/adapter`) with the game's market path.
 * Functions that have no snapshot take a GameConfig (engine + market path), defaulting to V2.
 */
import * as V2 from './adapter';
import * as V3 from '../v3/adapter';
import { V3_ENGINE_VERSION, type MarketPathId, type V2GameSnapshot } from './snapshot';
import type { V2PlayerQuarterInput, V2Role } from './types';
import type { V2FinalOptionId } from '../../simulation/engineV2Final';

export type GameConfig = { engine: 'v2' } | { engine: 'v3'; path: MarketPathId };
export const V2_CONFIG: GameConfig = { engine: 'v2' };
export const v3Config = (path: MarketPathId): GameConfig => ({ engine: 'v3', path });

export const isV3 = (snap: V2GameSnapshot): boolean => snap.engineVersion === V3_ENGINE_VERSION;
export function configOf(snap: V2GameSnapshot): GameConfig {
  return isV3(snap) ? { engine: 'v3', path: snap.marketPath ?? 'A' } : V2_CONFIG;
}
export const engineOf = (snap: V2GameSnapshot): 'v2' | 'v3' => (isV3(snap) ? 'v3' : 'v2');

export type V2Forecast = V3.V2Forecast;
export type V2DecisionSpec = V3.V2DecisionSpec;
export type V2QuarterBriefing = V3.V2QuarterBriefing;
export type V2Resolution = V3.V2Resolution;
export type V2FinalOutcome = V3.V2FinalOutcome;

export const V2_TOTAL_QUARTERS = V2.V2_TOTAL_QUARTERS;
export const V2_BASE_ENVELOPE = V2.V2_BASE_ENVELOPE;
export const V2_ROLES = V2.V2_ROLES;
export const canonical = V2.canonical;
export const severityBand = V2.severityBand;

export function initializeGame(cfg: GameConfig = V2_CONFIG): V2GameSnapshot {
  return cfg.engine === 'v3' ? V3.initializeGame(cfg.path) : V2.initializeGame();
}

export const workingQuarter = (snap: V2GameSnapshot): number | null => (isV3(snap) ? V3.workingQuarter(snap) : V2.workingQuarter(snap));
export const isComplete = (snap: V2GameSnapshot): boolean => (isV3(snap) ? V3.isComplete(snap) : V2.isComplete(snap));

export function getQuarterBriefing(quarter: number, cfg: GameConfig = V2_CONFIG): V2QuarterBriefing {
  return cfg.engine === 'v3' ? V3.getQuarterBriefing(quarter, cfg.path) : V2.getQuarterBriefing(quarter);
}

export const getRoleBrief = (snap: V2GameSnapshot, role: V2Role) => (isV3(snap) ? V3.getRoleBrief(snap, role) : V2.getRoleBrief(snap, role));
export const getDecisionSpec = (snap: V2GameSnapshot): V2DecisionSpec | null => (isV3(snap) ? V3.getDecisionSpec(snap) : V2.getDecisionSpec(snap));

/** The base strategic budget of a quarter: $30M, or the Q8 option's budget. */
export function envelopeFor(quarter: number, finalOption?: V2FinalOptionId, cfg: GameConfig = V2_CONFIG): number {
  return cfg.engine === 'v3' ? V3.envelopeFor(quarter, finalOption, cfg.path) : V2.envelopeFor(quarter, finalOption);
}

/**
 * The budget a particular decision must allocate. V2: the base budget. V3: the base budget plus any financing-funded
 * expansion requested in the decision (10C); a Q5 contract's implementation cost is claimed inside this budget.
 */
export function envelopeForInput(snap: V2GameSnapshot, input: V2PlayerQuarterInput): number {
  return isV3(snap) ? V3.envelopeForInput(snap, input) : V2.envelopeFor(input.quarter, input.finalOption);
}

/** The budget a decision allocates, computed from the decision itself and the game's configuration. */
export function budgetFor(input: V2PlayerQuarterInput, cfg: GameConfig = V2_CONFIG): number {
  return cfg.engine === 'v3' ? V3.budgetForInput(input, cfg.path) : V2.envelopeFor(input.quarter, input.finalOption);
}

export function validateQuarterInput(snap: V2GameSnapshot, input: V2PlayerQuarterInput): string[] {
  if (isV3(snap)) return V3.validateQuarterInput(snap, input);
  // V2 games never accept V3-only decisions (they would be silently dropped by the frozen adapter).
  if (input.recessionStance !== undefined || input.expansion !== undefined) return ['This decision is not available in this game'];
  return V2.validateQuarterInput(snap, input);
}
export const forecastQuarter = (snap: V2GameSnapshot, input: V2PlayerQuarterInput): V2Forecast =>
  (isV3(snap) ? V3.forecastQuarter(snap, input) : V2.forecastQuarter(snap, input));
export const resolveQuarter = (snap: V2GameSnapshot, input: V2PlayerQuarterInput): V2Resolution =>
  (isV3(snap) ? V3.resolveQuarter(snap, input) : V2.resolveQuarter(snap, input));

export function storedInput(input: V2PlayerQuarterInput, cfg: GameConfig = V2_CONFIG): V2PlayerQuarterInput {
  return cfg.engine === 'v3' ? V3.storedInput(input, cfg.path) : V2.storedInput(input);
}

export function replayInputs(inputs: V2PlayerQuarterInput[], cfg: GameConfig = V2_CONFIG): V2GameSnapshot {
  return cfg.engine === 'v3' ? V3.replayInputs(inputs, cfg.path) : V2.replayInputs(inputs);
}

export const verifySnapshot = (snap: V2GameSnapshot) => (isV3(snap) ? V3.verifySnapshot(snap) : V2.verifySnapshot(snap));
export const resultForQuarter = (snap: V2GameSnapshot, quarter: number) => (isV3(snap) ? V3.resultForQuarter(snap, quarter) : V2.resultForQuarter(snap, quarter));
export const headlineOf = (snap: V2GameSnapshot) => (isV3(snap) ? V3.headlineOf(snap) : V2.headlineOf(snap));
export const getFinalOutcome = (snap: V2GameSnapshot): V2FinalOutcome => (isV3(snap) ? V3.getFinalOutcome(snap) : V2.getFinalOutcome(snap));

export type { V2FinancingAction } from './adapter';

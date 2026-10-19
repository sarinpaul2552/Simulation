/**
 * ENGINE FACADE (NexLearn V3 integration)
 *
 * The one module the classroom UI, insights and persistence call for game economics. It dispatches on the snapshot's
 * engine version:
 *   - V2 games ('v2-econ-batch4-frozen') → the frozen V2 adapter (`./adapter`, unchanged) — existing sessions replay
 *     exactly as before;
 *   - V3 games ('v3-econ-1.0', 'v3-econ-1.1', …) → the V3 adapter (`../v3/adapter`) with the game's market path and
 *     engine version. The adapter runs every V3 calculation with that version's registered configuration.
 * Functions that have no snapshot take a GameConfig (engine + market path + V3 engine version), defaulting to V2.
 * V3.1 Stage 2: a V3 GameConfig without a version means 'v3-econ-1.0', so existing callers keep their behaviour.
 */
import * as V2 from './adapter';
import * as V3 from '../v3/adapter';
import { v3ConfigFor, type V3EconomicsConfig } from '../../simulationV3/engineV3Config';
import { V3_ENGINE_VERSION, isV3EngineVersion, type MarketPathId, type V2GameSnapshot, type V3EngineVersion } from './snapshot';
import type { V2PlayerQuarterInput, V2Role } from './types';
import type { V2FinalOptionId } from '../../simulation/engineV2Final';

export type GameConfig = { engine: 'v2' } | { engine: 'v3'; path: MarketPathId; version?: V3EngineVersion };
export const V2_CONFIG: GameConfig = { engine: 'v2' };
export const v3Config = (path: MarketPathId, version: V3EngineVersion = V3_ENGINE_VERSION): GameConfig => ({ engine: 'v3', path, version });
/** The V3 engine version of a V3 GameConfig (absent = the released 'v3-econ-1.0'). */
const verOf = (cfg: { version?: V3EngineVersion }): V3EngineVersion => cfg.version ?? V3_ENGINE_VERSION;

export const isV3 = (snap: V2GameSnapshot): boolean => isV3EngineVersion(snap.engineVersion);
export function configOf(snap: V2GameSnapshot): GameConfig {
  return isV3(snap) ? { engine: 'v3', path: snap.marketPath ?? 'A', version: snap.engineVersion as V3EngineVersion } : V2_CONFIG;
}
/**
 * The registered economic configuration of a game's V3 engine version (V3.1 Stage 2), for UI limits such as the
 * expansion cap or the recession reserve. V2 games have no V3 configuration; callers only read it for V3 games, so they
 * receive the released 1.0 values.
 */
export const economicsOf = (snap: V2GameSnapshot): V3EconomicsConfig => v3ConfigFor(isV3(snap) ? snap.engineVersion : V3_ENGINE_VERSION);
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
  return cfg.engine === 'v3' ? V3.initializeGame(cfg.path, verOf(cfg)) : V2.initializeGame();
}

export const workingQuarter = (snap: V2GameSnapshot): number | null => (isV3(snap) ? V3.workingQuarter(snap) : V2.workingQuarter(snap));
export const isComplete = (snap: V2GameSnapshot): boolean => (isV3(snap) ? V3.isComplete(snap) : V2.isComplete(snap));

export function getQuarterBriefing(quarter: number, cfg: GameConfig = V2_CONFIG): V2QuarterBriefing {
  return cfg.engine === 'v3' ? V3.getQuarterBriefing(quarter, cfg.path, verOf(cfg)) : V2.getQuarterBriefing(quarter);
}

export const getRoleBrief = (snap: V2GameSnapshot, role: V2Role) => (isV3(snap) ? V3.getRoleBrief(snap, role) : V2.getRoleBrief(snap, role));
export const getDecisionSpec = (snap: V2GameSnapshot): V2DecisionSpec | null => (isV3(snap) ? V3.getDecisionSpec(snap) : V2.getDecisionSpec(snap));

/** The base strategic budget of a quarter: $30M, or the Q8 option's budget. */
export function envelopeFor(quarter: number, finalOption?: V2FinalOptionId, cfg: GameConfig = V2_CONFIG): number {
  return cfg.engine === 'v3' ? V3.envelopeFor(quarter, finalOption, cfg.path, verOf(cfg)) : V2.envelopeFor(quarter, finalOption);
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
  return cfg.engine === 'v3' ? V3.budgetForInput(input, cfg.path, verOf(cfg)) : V2.envelopeFor(input.quarter, input.finalOption);
}

export function validateQuarterInput(snap: V2GameSnapshot, input: V2PlayerQuarterInput): string[] {
  if (isV3(snap)) return V3.validateQuarterInput(snap, input);
  // V2 games never accept V3-only decisions (they would be silently dropped by the frozen adapter).
  if (input.recessionStance !== undefined || input.expansion !== undefined) return ['This decision is not available in this game'];
  return V2.validateQuarterInput(snap, input);
}
export const forecastQuarter = (snap: V2GameSnapshot, input: V2PlayerQuarterInput): V2Forecast =>
  (isV3(snap) ? V3.forecastQuarter(snap, input) : V2.forecastQuarter(snap, input));
/**
 * V3.1 Stage 3B: engine versions whose decision screen shows the investment effectiveness indicators and workload
 * gauge. V2 and v3-econ-1.0 games keep their original investment interface.
 */
export const INVESTMENT_INDICATOR_VERSIONS: readonly string[] = ['v3-econ-1.1'];
export const showsInvestmentIndicators = (snap: V2GameSnapshot): boolean =>
  isV3(snap) && INVESTMENT_INDICATOR_VERSIONS.includes(snap.engineVersion);
/**
 * V3.1 Stage 3B: investment effectiveness for the planned quarter, from the engine's own calculation. Only for engine
 * versions in INVESTMENT_INDICATOR_VERSIONS; every other game (V2, v3-econ-1.0) gets null and its original estimates.
 */
export type V3InvestmentPreview = V3.V3InvestmentPreview;
export const investmentPreview = (snap: V2GameSnapshot, input: V2PlayerQuarterInput): V3InvestmentPreview | null =>
  (showsInvestmentIndicators(snap) ? V3.investmentPreview(snap, input) : null);
export const resolveQuarter = (snap: V2GameSnapshot, input: V2PlayerQuarterInput): V2Resolution =>
  (isV3(snap) ? V3.resolveQuarter(snap, input) : V2.resolveQuarter(snap, input));

export function storedInput(input: V2PlayerQuarterInput, cfg: GameConfig = V2_CONFIG): V2PlayerQuarterInput {
  return cfg.engine === 'v3' ? V3.storedInput(input, cfg.path, verOf(cfg)) : V2.storedInput(input);
}

export function replayInputs(inputs: V2PlayerQuarterInput[], cfg: GameConfig = V2_CONFIG): V2GameSnapshot {
  return cfg.engine === 'v3' ? V3.replayInputs(inputs, cfg.path, verOf(cfg)) : V2.replayInputs(inputs);
}

export const verifySnapshot = (snap: V2GameSnapshot) => (isV3(snap) ? V3.verifySnapshot(snap) : V2.verifySnapshot(snap));
export const resultForQuarter = (snap: V2GameSnapshot, quarter: number) => (isV3(snap) ? V3.resultForQuarter(snap, quarter) : V2.resultForQuarter(snap, quarter));
export const headlineOf = (snap: V2GameSnapshot) => (isV3(snap) ? V3.headlineOf(snap) : V2.headlineOf(snap));
export const getFinalOutcome = (snap: V2GameSnapshot): V2FinalOutcome => (isV3(snap) ? V3.getFinalOutcome(snap) : V2.getFinalOutcome(snap));

export type { V2FinancingAction } from './adapter';

/**
 * V3.1 Stage 4B: engine versions whose student journey uses the redesigned experience (Meet Your Company, the combined
 * Leadership Team Brief, decision guides, the compact commit and results summary, career metrics, accuracy fixes).
 * V2 and v3-econ-1.0 games keep the original journey unchanged.
 */
export const STAGE4_EXPERIENCE_VERSIONS: readonly string[] = ['v3-econ-1.1'];
export const usesStage4Experience = (snap: V2GameSnapshot): boolean =>
  isV3(snap) && STAGE4_EXPERIENCE_VERSIONS.includes(snap.engineVersion);
/** Stage 4B: the engine valuation of a company state (V3 games only; see v3/adapter companyValueOf). */
export type V3CompanyValue = V3.V3CompanyValue;
export const companyValueOf = (snap: V2GameSnapshot, state: V2GameSnapshot['state']): V3CompanyValue | null =>
  (isV3(snap) ? V3.companyValueOf(snap, state) : null);

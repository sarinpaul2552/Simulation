import { useState, useCallback } from 'react';
import {
  runSingleQuarter,
  runFullStrategyTest,
  QuarterResult,
  StrategyTestRun,
} from '../utils/quarterRunner';
import { allocationStrategies, behaviorStrategies, presetCombinations } from '../utils/testPresets';
import { getStartingState } from '../utils/stateBuilder';

export interface TestState {
  isRunning: boolean;
  progress: number;
  error: string | null;
}

/**
 * Hook for orchestrating test runs
 */
export function useEngineTest() {
  const [testState, setTestState] = useState<TestState>({
    isRunning: false,
    progress: 0,
    error: null,
  });

  /**
   * Run a single quarter test
   */
  const testSingleQuarter = useCallback(
    async (
      quarter: number,
      allocationStrategyId: string,
      behaviorStrategyId: string
    ): Promise<QuarterResult | null> => {
      setTestState({ isRunning: true, progress: 0, error: null });

      try {
        const allocStrategy = allocationStrategies[allocationStrategyId];
        const behavStrategy = behaviorStrategies[behaviorStrategyId];

        if (!allocStrategy || !behavStrategy) {
          throw new Error('Invalid strategy ID');
        }

        const startingState = getStartingState();
        const roleVotes = behavStrategy.getRoleVotes(quarter);

        // For single quarter test, assume some available capital
        const availableCapital = 30; // Standard from gameplay.json

        const allocation = {
          consumerGrowth: allocStrategy.weights.consumerGrowth * availableCapital,
          enterpriseSales: allocStrategy.weights.enterpriseSales * availableCapital,
          aiProduct: allocStrategy.weights.aiProduct * availableCapital,
          instructorPeople: allocStrategy.weights.instructorPeople * availableCapital,
          universityCredential: allocStrategy.weights.universityCredential * availableCapital,
          customerSuccess: (allocStrategy.weights.customerSuccess || 0) * availableCapital,
          marketing: (allocStrategy.weights.marketing || 0) * availableCapital,
          cash: allocStrategy.weights.cash * availableCapital,
        };

        const result = await runSingleQuarter(
          quarter,
          allocation,
          roleVotes,
          startingState,
          availableCapital
        );

        setTestState({ isRunning: false, progress: 100, error: null });
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setTestState({ isRunning: false, progress: 0, error: errorMsg });
        return null;
      }
    },
    []
  );

  /**
   * Run full Q1→Q8 strategy test
   */
  const testFullStrategy = useCallback(
    async (presetId: string): Promise<StrategyTestRun | null> => {
      setTestState({ isRunning: true, progress: 0, error: null });

      try {
        // Find preset in normal or pathological
        let preset = presetCombinations.normal.find(p => p.id === presetId);
        if (!preset) {
          preset = presetCombinations.pathological.find(p => p.id === presetId);
        }

        if (!preset) {
          throw new Error(`Preset not found: ${presetId}`);
        }

        const allocStrategy = allocationStrategies[preset.allocId];
        const behavStrategy = behaviorStrategies[preset.behavId];

        if (!allocStrategy || !behavStrategy) {
          throw new Error('Invalid strategy configuration');
        }

        const result = await runFullStrategyTest(
          preset.id,
          preset.name,
          allocStrategy,
          behavStrategy
        );

        setTestState({ isRunning: false, progress: 100, error: null });
        return result;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setTestState({ isRunning: false, progress: 0, error: errorMsg });
        return null;
      }
    },
    []
  );

  /**
   * Run multiple strategies in parallel
   */
  const testCompareStrategies = useCallback(
    async (presetIds: string[]): Promise<StrategyTestRun[] | null> => {
      setTestState({ isRunning: true, progress: 0, error: null });

      try {
        const results = await Promise.all(
          presetIds.map((id, idx) => {
            // Update progress as we go
            const progressUpdate = (idx / presetIds.length) * 100;
            setTestState(prev => ({ ...prev, progress: progressUpdate }));
            return testFullStrategy(id);
          })
        );

        const successResults = results.filter((r) => r !== null) as StrategyTestRun[];
        const failures = results.filter((r) => r === null).length;

        if (failures > 0) {
          throw new Error(`${failures} strategy test(s) failed`);
        }

        setTestState({ isRunning: false, progress: 100, error: null });
        return successResults;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setTestState({ isRunning: false, progress: 0, error: errorMsg });
        return null;
      }
    },
    [testFullStrategy]
  );

  return {
    testState,
    testSingleQuarter,
    testFullStrategy,
    testCompareStrategies,
  };
}

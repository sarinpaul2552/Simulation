import { Allocation } from '../../simulation/engine';

/**
 * Test Presets: Deterministic, normalized strategies for automated testing
 * 
 * AllocationStrategy: Defines weight distribution across all categories
 * (weights sum to 1.0, converted to available_capital at test time)
 * 
 * BehaviorStrategy: Defines role vote pattern and adaptation rules
 * (deterministic, no randomness)
 */

export interface AllocationStrategy {
  id: string;
  name: string;
  description: string;
  category: 'normal' | 'pathological';
  weights: {
    consumerGrowth: number;
    enterpriseSales: number;
    aiProduct: number;
    instructorPeople: number;
    universityCredential: number;
    customerSuccess?: number;
    marketing?: number;
    cash: number;
  };
}

export interface BehaviorStrategy {
  id: string;
  name: string;
  description: string;
  getRoleVotes: (quarter: number) => Record<string, 'yes' | 'no' | 'abstain'> | null;
}

/**
 * ALLOCATION STRATEGIES
 * 6 focused presets (60% in one category) + 10 pathological (100% concentrated)
 */
export const allocationStrategies: Record<string, AllocationStrategy> = {
  // ===== NORMAL: 60% focused =====
  'consumer-60': {
    id: 'consumer-60',
    name: 'Consumer 60%',
    description: 'Heavy consumer focus (60%), remaining 40% distributed evenly',
    category: 'normal',
    weights: {
      consumerGrowth: 0.60,
      enterpriseSales: 0.08,
      aiProduct: 0.08,
      instructorPeople: 0.08,
      universityCredential: 0.08,
      cash: 0.08,
    },
  },
  'enterprise-60': {
    id: 'enterprise-60',
    name: 'Enterprise 60%',
    description: 'Heavy enterprise focus (60%), remaining 40% distributed evenly',
    category: 'normal',
    weights: {
      consumerGrowth: 0.08,
      enterpriseSales: 0.60,
      aiProduct: 0.08,
      instructorPeople: 0.08,
      universityCredential: 0.08,
      cash: 0.08,
    },
  },
  'ai-60': {
    id: 'ai-60',
    name: 'AI Product 60%',
    description: 'Heavy AI focus (60%), remaining 40% distributed evenly',
    category: 'normal',
    weights: {
      consumerGrowth: 0.08,
      enterpriseSales: 0.08,
      aiProduct: 0.60,
      instructorPeople: 0.08,
      universityCredential: 0.08,
      cash: 0.08,
    },
  },
  'people-60': {
    id: 'people-60',
    name: 'People-Heavy 60%',
    description: 'Heavy people investment (50% instructor + 10% credential), remaining 40% distributed evenly',
    category: 'normal',
    weights: {
      consumerGrowth: 0.10,
      enterpriseSales: 0.10,
      aiProduct: 0.10,
      instructorPeople: 0.50,
      universityCredential: 0.10,
      cash: 0.10,
    },
  },
  'cash-60': {
    id: 'cash-60',
    name: 'Cash-Heavy 60%',
    description: 'Heavy cash reservation (60%), remaining 40% distributed evenly',
    category: 'normal',
    weights: {
      consumerGrowth: 0.08,
      enterpriseSales: 0.08,
      aiProduct: 0.08,
      instructorPeople: 0.08,
      universityCredential: 0.08,
      cash: 0.60,
    },
  },
  'balanced': {
    id: 'balanced',
    name: 'Balanced (Baseline)',
    description: 'Equal allocation across all 6 strategic categories',
    category: 'normal',
    weights: {
      consumerGrowth: 1 / 6,
      enterpriseSales: 1 / 6,
      aiProduct: 1 / 6,
      instructorPeople: 1 / 6,
      universityCredential: 1 / 6,
      cash: 1 / 6,
    },
  },

  // ===== PATHOLOGICAL: 100% concentrated =====
  'consumer-100': {
    id: 'consumer-100',
    name: 'Consumer 100% (Pathological)',
    description: '100% into consumer growth every quarter, zero elsewhere',
    category: 'pathological',
    weights: {
      consumerGrowth: 1.0,
      enterpriseSales: 0.0,
      aiProduct: 0.0,
      instructorPeople: 0.0,
      universityCredential: 0.0,
      cash: 0.0,
    },
  },
  'enterprise-100': {
    id: 'enterprise-100',
    name: 'Enterprise 100% (Pathological)',
    description: '100% into enterprise sales every quarter, zero elsewhere',
    category: 'pathological',
    weights: {
      consumerGrowth: 0.0,
      enterpriseSales: 1.0,
      aiProduct: 0.0,
      instructorPeople: 0.0,
      universityCredential: 0.0,
      cash: 0.0,
    },
  },
  'ai-100': {
    id: 'ai-100',
    name: 'AI Product 100% (Pathological)',
    description: '100% into AI product every quarter, zero elsewhere',
    category: 'pathological',
    weights: {
      consumerGrowth: 0.0,
      enterpriseSales: 0.0,
      aiProduct: 1.0,
      instructorPeople: 0.0,
      universityCredential: 0.0,
      cash: 0.0,
    },
  },
  'people-100': {
    id: 'people-100',
    name: 'People 100% (Pathological)',
    description: '100% into instructor/people every quarter, zero elsewhere',
    category: 'pathological',
    weights: {
      consumerGrowth: 0.0,
      enterpriseSales: 0.0,
      aiProduct: 0.0,
      instructorPeople: 1.0,
      universityCredential: 0.0,
      cash: 0.0,
    },
  },
  'cash-100': {
    id: 'cash-100',
    name: 'Cash 100% (Pathological)',
    description: '100% retained as cash every quarter, zero investment',
    category: 'pathological',
    weights: {
      consumerGrowth: 0.0,
      enterpriseSales: 0.0,
      aiProduct: 0.0,
      instructorPeople: 0.0,
      universityCredential: 0.0,
      cash: 1.0,
    },
  },
  'zero-cash': {
    id: 'zero-cash',
    name: 'Zero Cash (Pathological)',
    description: 'Deploy 100% of capital every quarter, zero cash reserve',
    category: 'pathological',
    weights: {
      consumerGrowth: 0.2,
      enterpriseSales: 0.2,
      aiProduct: 0.2,
      instructorPeople: 0.2,
      universityCredential: 0.2,
      cash: 0.0,
    },
  },
  'strategy-switching': {
    id: 'strategy-switching',
    name: 'Strategy Switching (Pathological)',
    description: 'Rotate focus every quarter: Q1=Consumer, Q2=Enterprise, Q3=AI, Q4=People, Q5=Consumer, etc.',
    category: 'pathological',
    // This is handled in quarterRunner with dynamic allocation
    weights: {
      consumerGrowth: 0.2,
      enterpriseSales: 0.2,
      aiProduct: 0.2,
      instructorPeople: 0.2,
      universityCredential: 0.2,
      cash: 0.0,
    },
  },
};

/**
 * BEHAVIOR STRATEGIES
 * Deterministic role vote patterns and adaptation rules
 */
export const behaviorStrategies: Record<string, BehaviorStrategy> = {
  'stay-course': {
    id: 'stay-course',
    name: 'Stay the Course',
    description: 'Neutral: no votes, no adaptation. Let each quarter speak for itself.',
    getRoleVotes: () => null, // All roles abstain (null)
  },
  'leadership-aligned': {
    id: 'leadership-aligned',
    name: 'Leadership Aligned',
    description: 'Unanimous support: all 5 roles vote yes every quarter',
    getRoleVotes: () => ({
      CEO: 'yes',
      CFO: 'yes',
      Product: 'yes',
      People: 'yes',
      Operations: 'yes',
    }),
  },
  'leadership-divided': {
    id: 'leadership-divided',
    name: 'Leadership Divided',
    description: 'Conflict: roles vote yes/no/abstain in rotating pattern',
    getRoleVotes: (quarter: number) => {
      const pattern = ['yes', 'no', 'abstain', 'yes', 'no'];
      const roles = ['CEO', 'CFO', 'Product', 'People', 'Operations'];
      const result: Record<string, 'yes' | 'no' | 'abstain'> = {};
      roles.forEach((role, i) => {
        const idx = (quarter + i) % pattern.length;
        result[role] = pattern[idx] as 'yes' | 'no' | 'abstain';
      });
      return result;
    },
  },
  'ignore-evidence': {
    id: 'ignore-evidence',
    name: 'Ignore Evidence',
    description: 'Fixed strategy regardless of results: all roles abstain, no adaptation',
    getRoleVotes: () => null,
  },
};

/**
 * PRESET COMBINATIONS
 * Pre-composed test cases that pair allocation + behavior strategies
 * Includes all pathological tests
 */
export const presetCombinations = {
  // ===== NORMAL COMBINATIONS =====
  normal: [
    { id: 'balanced-aligned', name: 'Balanced + Leadership Aligned', allocId: 'balanced', behavId: 'leadership-aligned' },
    { id: 'consumer-60-aligned', name: 'Consumer 60% + Leadership Aligned', allocId: 'consumer-60', behavId: 'leadership-aligned' },
    { id: 'consumer-60-divided', name: 'Consumer 60% + Leadership Divided', allocId: 'consumer-60', behavId: 'leadership-divided' },
    { id: 'enterprise-60-aligned', name: 'Enterprise 60% + Leadership Aligned', allocId: 'enterprise-60', behavId: 'leadership-aligned' },
    { id: 'enterprise-60-divided', name: 'Enterprise 60% + Leadership Divided', allocId: 'enterprise-60', behavId: 'leadership-divided' },
    { id: 'ai-60-aligned', name: 'AI 60% + Leadership Aligned', allocId: 'ai-60', behavId: 'leadership-aligned' },
    { id: 'people-60-aligned', name: 'People 60% + Leadership Aligned', allocId: 'people-60', behavId: 'leadership-aligned' },
    { id: 'cash-60-aligned', name: 'Cash 60% + Leadership Aligned', allocId: 'cash-60', behavId: 'leadership-aligned' },
  ],

  // ===== PATHOLOGICAL TESTS =====
  pathological: [
    { id: 'consumer-100-every-q', name: 'Consumer 100% Every Q', allocId: 'consumer-100', behavId: 'stay-course' },
    { id: 'enterprise-100-every-q', name: 'Enterprise 100% Every Q', allocId: 'enterprise-100', behavId: 'stay-course' },
    { id: 'ai-100-every-q', name: 'AI 100% Every Q', allocId: 'ai-100', behavId: 'stay-course' },
    { id: 'people-100-every-q', name: 'People 100% Every Q', allocId: 'people-100', behavId: 'stay-course' },
    { id: 'cash-100-every-q', name: 'Cash 100% Every Q (No Investment)', allocId: 'cash-100', behavId: 'stay-course' },
    { id: 'zero-cash-every-q', name: 'Zero Cash Every Q (Max Deploy)', allocId: 'zero-cash', behavId: 'stay-course' },
    { id: 'strategy-switch', name: 'Strategy Switching Every Quarter', allocId: 'strategy-switching', behavId: 'stay-course' },
    { id: 'ignore-evidence', name: 'Ignore Evidence (No Votes)', allocId: 'balanced', behavId: 'ignore-evidence' },
  ],
};

/**
 * Convert normalized allocation weights to actual allocation given available capital
 */
export function weightsToAllocation(
  strategy: AllocationStrategy,
  availableCapital: number,
  quarter: number
): Allocation {
  // Special case: strategy-switching rotates focus every quarter
  if (strategy.id === 'strategy-switching') {
    const focusRotation = [
      'consumerGrowth',
      'enterpriseSales',
      'aiProduct',
      'instructorPeople',
      'universityCredential',
    ];
    const focusIdx = (quarter - 1) % focusRotation.length;
    const focusCategory = focusRotation[focusIdx] as keyof typeof strategy.weights;
    
    const weights = { ...strategy.weights };
    Object.keys(weights).forEach(key => {
      weights[key as keyof typeof weights] = key === focusCategory ? 0.9 : 0.025;
    });
    weights.cash = 0.0;

    return {
      consumerGrowth: weights.consumerGrowth * availableCapital,
      enterpriseSales: weights.enterpriseSales * availableCapital,
      aiProduct: weights.aiProduct * availableCapital,
      instructorPeople: weights.instructorPeople * availableCapital,
      universityCredential: weights.universityCredential * availableCapital,
      customerSuccess: (weights.customerSuccess || 0) * availableCapital,
      marketing: (weights.marketing || 0) * availableCapital,
      cash: weights.cash * availableCapital,
    };
  }

  // Normal: apply weights directly
  return {
    consumerGrowth: strategy.weights.consumerGrowth * availableCapital,
    enterpriseSales: strategy.weights.enterpriseSales * availableCapital,
    aiProduct: strategy.weights.aiProduct * availableCapital,
    instructorPeople: strategy.weights.instructorPeople * availableCapital,
    universityCredential: strategy.weights.universityCredential * availableCapital,
    customerSuccess: (strategy.weights.customerSuccess || 0) * availableCapital,
    marketing: (strategy.weights.marketing || 0) * availableCapital,
    cash: strategy.weights.cash * availableCapital,
  };
}

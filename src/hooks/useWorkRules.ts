import { useState, useEffect, useCallback } from 'react';

export type RuleOperator = '<' | '<=' | '=' | '>=' | '>';

export interface WorkRules {
  maxBreakMinutes: number;
  minWorkHours: number;
  breakLimitEnabled: boolean;
  minWorkEnabled: boolean;
  // New: operator chosen by user/admin to compare against the threshold
  breakOperator: RuleOperator;
  workOperator: RuleOperator;
}

const STORAGE_KEY = 'workRules';

const DEFAULT_RULES: WorkRules = {
  maxBreakMinutes: 60,
  minWorkHours: 9,
  breakLimitEnabled: false,
  minWorkEnabled: false,
  breakOperator: '>=', // alert when break >= max
  workOperator: '<',   // alert when net work < min
};

export function useWorkRules() {
  const [rules, setRules] = useState<WorkRules>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_RULES, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_RULES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  }, [rules]);

  const updateRules = useCallback((updates: Partial<WorkRules>) => {
    setRules(prev => ({ ...prev, ...updates }));
  }, []);

  return { rules, updateRules };
}

/** Compare a measured value against a threshold using the chosen operator. */
export function compareWithOperator(value: number, op: RuleOperator, threshold: number): boolean {
  switch (op) {
    case '<': return value < threshold;
    case '<=': return value <= threshold;
    case '=': return Math.abs(value - threshold) < 0.5; // tolerance for minutes/hours
    case '>=': return value >= threshold;
    case '>': return value > threshold;
  }
}

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  '<': 'less than',
  '<=': 'at most',
  '=': 'equal to',
  '>=': 'at least',
  '>': 'greater than',
};

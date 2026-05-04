import { useState, useEffect, useCallback } from 'react';

export type RuleOperator = '<' | '<=' | '=' | '>=' | '>';

export interface WorkRules {
  // Break range: alert when (breakMins op1 minBreakMinutes) AND (breakMins op2 maxBreakMinutes)
  minBreakMinutes: number;
  maxBreakMinutes: number;
  breakOperator: RuleOperator;   // op1 (lower bound)
  breakOperator2: RuleOperator;  // op2 (upper bound)
  breakLimitEnabled: boolean;

  // Work hours range: alert when (netHours op1 minWorkHours) AND (netHours op2 maxWorkHours)
  minWorkHours: number;
  maxWorkHours: number;
  workOperator: RuleOperator;    // op1
  workOperator2: RuleOperator;   // op2
  minWorkEnabled: boolean;
}

const STORAGE_KEY = 'workRules';

const DEFAULT_RULES: WorkRules = {
  minBreakMinutes: 60,
  maxBreakMinutes: 999,
  breakOperator: '>=',
  breakOperator2: '<=',
  breakLimitEnabled: false,

  minWorkHours: 0,
  maxWorkHours: 9,
  workOperator: '>=',
  workOperator2: '<',
  minWorkEnabled: false,
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
    case '=': return Math.abs(value - threshold) < 0.5;
    case '>=': return value >= threshold;
    case '>': return value > threshold;
  }
}

/** Range check: value must satisfy BOTH bound comparisons. */
export function inRange(
  value: number,
  op1: RuleOperator, lower: number,
  op2: RuleOperator, upper: number,
): boolean {
  return compareWithOperator(value, op1, lower) && compareWithOperator(value, op2, upper);
}

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  '<': 'less than',
  '<=': 'at most',
  '=': 'equal to',
  '>=': 'at least',
  '>': 'greater than',
};

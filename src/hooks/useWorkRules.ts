import { useState, useEffect, useCallback } from 'react';

export interface WorkRules {
  maxBreakMinutes: number;
  minWorkHours: number;
  breakLimitEnabled: boolean;
  minWorkEnabled: boolean;
}

const STORAGE_KEY = 'workRules';

const DEFAULT_RULES: WorkRules = {
  maxBreakMinutes: 60,
  minWorkHours: 9,
  breakLimitEnabled: false,
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
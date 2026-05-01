import { useEffect, useRef } from 'react';
import { compareWithOperator, OPERATOR_LABELS, WorkRules } from '@/hooks/useWorkRules';
import { toast } from '@/hooks/use-toast';
import { TimeEntry, getTotalBreakMinutes } from '@/types/timeEntry';

interface Args {
  rules: WorkRules;
  todayEntry: TimeEntry | undefined;
  getTodayNetWorkMinutes: () => number;
}

/**
 * Continuously monitors today's progress against the configured work rules
 * and emits one toast per crossing per day. Re-arms when state un-crosses.
 */
export function useWorkRulesMonitor({ rules, todayEntry, getTodayNetWorkMinutes }: Args) {
  const breakAlertedRef = useRef(false);
  const workAlertedRef = useRef(false);
  const lastDateRef = useRef<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (lastDateRef.current !== today) {
      breakAlertedRef.current = false;
      workAlertedRef.current = false;
      lastDateRef.current = today;
    }

    const evaluate = () => {
      // Break rule
      if (rules.breakLimitEnabled && todayEntry) {
        const breakMins = getTotalBreakMinutes(todayEntry.sessions);
        const triggered = compareWithOperator(breakMins, rules.breakOperator, rules.maxBreakMinutes);
        if (triggered && !breakAlertedRef.current) {
          breakAlertedRef.current = true;
          toast({
            title: '⚠️ Break Rule Triggered',
            description: `Break time (${Math.round(breakMins)} min) is ${OPERATOR_LABELS[rules.breakOperator]} ${rules.maxBreakMinutes} min.`,
            variant: 'destructive',
          });
        } else if (!triggered) {
          breakAlertedRef.current = false;
        }
      }

      // Work hours rule (compare hours)
      if (rules.minWorkEnabled) {
        const netHours = getTodayNetWorkMinutes() / 60;
        const triggered = compareWithOperator(netHours, rules.workOperator, rules.minWorkHours);
        if (triggered && !workAlertedRef.current) {
          workAlertedRef.current = true;
          toast({
            title: '⚠️ Work Hours Rule Triggered',
            description: `Net work (${netHours.toFixed(1)}h) is ${OPERATOR_LABELS[rules.workOperator]} ${rules.minWorkHours}h.`,
            variant: 'destructive',
          });
        } else if (!triggered) {
          workAlertedRef.current = false;
        }
      }
    };

    // Initial check + interval (every 60s)
    evaluate();
    const id = window.setInterval(evaluate, 60_000);
    return () => window.clearInterval(id);
  }, [rules, todayEntry, getTodayNetWorkMinutes]);
}

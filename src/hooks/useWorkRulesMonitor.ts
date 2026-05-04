import { useEffect, useRef } from 'react';
import { inRange, OPERATOR_LABELS, WorkRules } from '@/hooks/useWorkRules';
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
 *
 * Both rules use a range: alert when value satisfies (op1 lower) AND (op2 upper).
 * Break rule additionally requires that some break time has actually been recorded.
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
      // ---- Break range rule (requires recorded break time)
      if (rules.breakLimitEnabled && todayEntry) {
        const breakMins = getTotalBreakMinutes(todayEntry.sessions);
        if (breakMins > 0) {
          const triggered = inRange(
            breakMins,
            rules.breakOperator, rules.minBreakMinutes,
            rules.breakOperator2, rules.maxBreakMinutes,
          );
          if (triggered && !breakAlertedRef.current) {
            breakAlertedRef.current = true;
            toast({
              title: '⚠️ Break Rule Triggered',
              description: `Break (${Math.round(breakMins)} min) is ${OPERATOR_LABELS[rules.breakOperator]} ${rules.minBreakMinutes} and ${OPERATOR_LABELS[rules.breakOperator2]} ${rules.maxBreakMinutes}.`,
              variant: 'destructive',
            });
          } else if (!triggered) {
            breakAlertedRef.current = false;
          }
        } else {
          // No break recorded — never alert; keep ready to re-arm
          breakAlertedRef.current = false;
        }
      }

      // ---- Work hours range rule (requires user to be clocked in at least once today)
      if (rules.minWorkEnabled && todayEntry && todayEntry.sessions.length > 0) {
        const netHours = getTodayNetWorkMinutes() / 60;
        if (netHours > 0) {
          const triggered = inRange(
            netHours,
            rules.workOperator, rules.minWorkHours,
            rules.workOperator2, rules.maxWorkHours,
          );
          if (triggered && !workAlertedRef.current) {
            workAlertedRef.current = true;
            toast({
              title: '⚠️ Work Hours Rule Triggered',
              description: `Net work (${netHours.toFixed(1)}h) is ${OPERATOR_LABELS[rules.workOperator]} ${rules.minWorkHours}h and ${OPERATOR_LABELS[rules.workOperator2]} ${rules.maxWorkHours}h.`,
              variant: 'destructive',
            });
          } else if (!triggered) {
            workAlertedRef.current = false;
          }
        }
      }
    };

    evaluate();
    const id = window.setInterval(evaluate, 60_000);
    return () => window.clearInterval(id);
  }, [rules, todayEntry, getTodayNetWorkMinutes]);
}

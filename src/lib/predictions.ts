import { TimeEntry, getTotalBreakMinutes } from '@/types/timeEntry';

export interface DayPrediction {
  label: string; // "Yesterday", "Today", "Tomorrow"
  date: string;
  predictedWorkHours: number | null; // null = actual data available
  predictedBreakMinutes: number | null;
  predictedDeparture: string | null; // HH:mm
  actualWorkHours: number | null;
  actualBreakMinutes: number | null;
  actualDeparture: string | null;
  isActual: boolean;
}

function getWorkMinutesForEntry(entry: TimeEntry): number {
  let total = 0;
  for (const s of entry.sessions) {
    if (!s.clockIn || !s.clockOut) continue;
    const [inH, inM] = s.clockIn.split(':').map(Number);
    const [outH, outM] = s.clockOut.split(':').map(Number);
    let mins = (outH * 60 + outM) - (inH * 60 + inM);
    if (mins < 0) mins += 24 * 60;
    total += mins;
  }
  return Math.max(0, total);
}

function getEarliestClockIn(entry: TimeEntry): string | null {
  const clockIns = entry.sessions.map(s => s.clockIn).filter(Boolean);
  if (clockIns.length === 0) return null;
  return clockIns.reduce((min, t) => (t < min ? t : min));
}

function getLatestClockOut(entry: TimeEntry): string | null {
  const clockOuts = entry.sessions.map(s => s.clockOut).filter((t): t is string => t !== null);
  if (clockOuts.length === 0) return null;
  return clockOuts.reduce((max, t) => (t > max ? t : max));
}

/**
 * Exponential Weighted Moving Average prediction.
 * More recent data points get higher weights.
 */
function ewma(values: number[], alpha: number = 0.3): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return result;
}

/**
 * Predict departure time based on typical clock-in + predicted work hours
 */
function predictDepartureTime(avgClockInMinutes: number, predictedTotalMinutes: number): string {
  const departMinutes = avgClockInMinutes + predictedTotalMinutes;
  const h = Math.floor(departMinutes / 60) % 24;
  const m = Math.round(departMinutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Get day-of-week specific data for better predictions.
 * E.g., Mondays tend to be different from Fridays.
 */
function filterByDayOfWeek(entries: TimeEntry[], dayOfWeek: number): TimeEntry[] {
  return entries.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d.getDay() === dayOfWeek;
  });
}

export function getPredictions(entries: TimeEntry[]): DayPrediction[] {
  const workEntries = entries
    .filter(e => e.type === 'work' && e.sessions.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const now = new Date();
  const dates = [-1, 0, 1].map(offset => {
    const d = new Date(now);
    d.setDate(now.getDate() + offset);
    return d;
  });
  const labels = ['Yesterday', 'Today', 'Tomorrow'];

  return dates.map((date, idx) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const label = labels[idx];

    // Check if actual data exists
    const actualEntry = workEntries.find(e => e.date === dateStr);
    
    if (actualEntry) {
      const workMin = getWorkMinutesForEntry(actualEntry);
      const breakMin = getTotalBreakMinutes(actualEntry.sessions);
      const departure = getLatestClockOut(actualEntry);
      
      return {
        label,
        date: dateStr,
        predictedWorkHours: null,
        predictedBreakMinutes: null,
        predictedDeparture: null,
        actualWorkHours: workMin / 60,
        actualBreakMinutes: breakMin,
        actualDeparture: departure,
        isActual: true,
      };
    }

    // Predict using EWMA with day-of-week weighting
    const sameDayEntries = filterByDayOfWeek(workEntries, dayOfWeek);
    const recentEntries = workEntries.slice(-30); // Last 30 entries
    
    // Use same-day data if available (at least 3 data points), otherwise use recent data
    const sourceEntries = sameDayEntries.length >= 3 ? sameDayEntries.slice(-10) : recentEntries.slice(-10);
    
    if (sourceEntries.length === 0) {
      return {
        label,
        date: dateStr,
        predictedWorkHours: 8,
        predictedBreakMinutes: 45,
        predictedDeparture: '17:30',
        actualWorkHours: null,
        actualBreakMinutes: null,
        actualDeparture: null,
        isActual: false,
      };
    }

    const workMinutes = sourceEntries.map(e => getWorkMinutesForEntry(e));
    const breakMinutes = sourceEntries.map(e => getTotalBreakMinutes(e.sessions));
    const clockInMinutes = sourceEntries
      .map(e => getEarliestClockIn(e))
      .filter((t): t is string => t !== null)
      .map(timeToMinutes);

    const predWorkMin = ewma(workMinutes, 0.35);
    const predBreakMin = ewma(breakMinutes, 0.35);
    const predClockIn = clockInMinutes.length > 0 ? ewma(clockInMinutes, 0.35) : 9 * 60;
    const predDeparture = predictDepartureTime(predClockIn, predWorkMin);

    return {
      label,
      date: dateStr,
      predictedWorkHours: Math.round(predWorkMin / 60 * 10) / 10,
      predictedBreakMinutes: Math.round(predBreakMin),
      predictedDeparture: predDeparture,
      actualWorkHours: null,
      actualBreakMinutes: null,
      actualDeparture: null,
      isActual: false,
    };
  });
}

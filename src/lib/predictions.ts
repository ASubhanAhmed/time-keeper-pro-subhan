import { TimeEntry, getTotalBreakMinutes } from '@/types/timeEntry';

export interface DayPrediction {
  label: string;
  date: string;
  predictedWorkHours: number | null;
  predictedBreakMinutes: number | null;
  predictedDeparture: string | null;
  actualWorkHours: number | null;
  actualBreakMinutes: number | null;
  actualDeparture: string | null;
  isActual: boolean;
}

export interface ForecastPoint {
  date: string;
  label: string;
  totalOfficeHours: number | null;
  breakMinutes: number | null;
  departureMinutes: number | null; // minutes from midnight
  isForecast: boolean;
  varianceOffice?: number;
  varianceBreak?: number;
  varianceDeparture?: number;
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

function ewma(values: number[], alpha: number = 0.3): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = alpha * values[i] + (1 - alpha) * result;
  }
  return result;
}

function variance(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
}

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

    // Treat today as a forecast point (incomplete data skews results)
    const actualEntry = label !== 'Today' ? workEntries.find(e => e.date === dateStr) : undefined;

    if (actualEntry) {
      const workMin = getWorkMinutesForEntry(actualEntry);
      const breakMin = getTotalBreakMinutes(actualEntry.sessions);
      const departure = getLatestClockOut(actualEntry);

      return {
        label, date: dateStr,
        predictedWorkHours: null, predictedBreakMinutes: null, predictedDeparture: null,
        actualWorkHours: workMin / 60, actualBreakMinutes: breakMin, actualDeparture: departure,
        isActual: true,
      };
    }

    // Use ALL historical data with day-of-week weighting
    const sameDayEntries = filterByDayOfWeek(workEntries, dayOfWeek);
    const sourceEntries = sameDayEntries.length >= 3 ? sameDayEntries : workEntries;

    if (sourceEntries.length === 0) {
      return {
        label, date: dateStr,
        predictedWorkHours: 8, predictedBreakMinutes: 45, predictedDeparture: '17:30',
        actualWorkHours: null, actualBreakMinutes: null, actualDeparture: null,
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
      label, date: dateStr,
      predictedWorkHours: Math.round(predWorkMin / 60 * 10) / 10,
      predictedBreakMinutes: Math.round(predBreakMin),
      predictedDeparture: predDeparture,
      actualWorkHours: null, actualBreakMinutes: null, actualDeparture: null,
      isActual: false,
    };
  });
}

/**
 * Generate a time series of historical + forecast data points for the line graph.
 * Uses ALL historical entries for EWMA prediction.
 */
export function getForecastTimeSeries(entries: TimeEntry[], futureDays: number = 7): ForecastPoint[] {
  const workEntries = entries
    .filter(e => e.type === 'work' && e.sessions.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const points: ForecastPoint[] = [];

  // Exclude today from historical data — treat today as a forecast point
  const historicalEntries = workEntries.filter(e => e.date < todayStr);

  // Historical points (last 30 days, excluding today)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 30);

  for (let i = 0; i < 30; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    if (dateStr >= todayStr) continue; // skip today
    const entry = historicalEntries.find(e => e.date === dateStr);

    if (entry) {
      const totalMin = getWorkMinutesForEntry(entry);
      const breakMin = getTotalBreakMinutes(entry.sessions);
      const clockOut = getLatestClockOut(entry);

      points.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalOfficeHours: Math.round(totalMin / 60 * 100) / 100,
        breakMinutes: breakMin,
        departureMinutes: clockOut ? timeToMinutes(clockOut) : null,
        isForecast: false,
      });
    } else {
      points.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalOfficeHours: null,
        breakMinutes: null,
        departureMinutes: null,
        isForecast: false,
      });
    }
  }

  // Calculate variance from ALL historical data (excluding today)
  const allOfficeHours = historicalEntries.map(e => getWorkMinutesForEntry(e) / 60);
  const allBreakMins = historicalEntries.map(e => getTotalBreakMinutes(e.sessions));
  const allDepartureMin = historicalEntries
    .map(e => getLatestClockOut(e))
    .filter((t): t is string => t !== null)
    .map(timeToMinutes);

  // Forecast: today (i=0) + future days using ALL historical data (excluding today)
  for (let i = 0; i <= futureDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay();

    const sameDayEntries = filterByDayOfWeek(historicalEntries, dayOfWeek);
    const sourceEntries = sameDayEntries.length >= 3 ? sameDayEntries : historicalEntries;

    if (sourceEntries.length === 0) {
      points.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalOfficeHours: 8,
        breakMinutes: 45,
        departureMinutes: 17 * 60 + 30,
        isForecast: true,
        varianceOffice: 0, varianceBreak: 0, varianceDeparture: 0,
      });
      continue;
    }

    const workMins = sourceEntries.map(e => getWorkMinutesForEntry(e));
    const breakMins = sourceEntries.map(e => getTotalBreakMinutes(e.sessions));
    const clockOuts = sourceEntries.map(e => getLatestClockOut(e)).filter((t): t is string => t !== null).map(timeToMinutes);

    const predOffice = ewma(workMins, 0.35) / 60;
    const predBreak = ewma(breakMins, 0.35);
    const predDep = clockOuts.length > 0 ? ewma(clockOuts, 0.35) : 17 * 60 + 30;

    // Variance grows with distance from today (i=0 is today)
    const scaleFactor = 1 + i * 0.15;
    const varO = Math.sqrt(variance(allOfficeHours, predOffice)) * scaleFactor;
    const varB = Math.sqrt(variance(allBreakMins, predBreak)) * scaleFactor;
    const varD = Math.sqrt(variance(allDepartureMin, predDep)) * scaleFactor;

    points.push({
      date: dateStr,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalOfficeHours: Math.round(predOffice * 10) / 10,
      breakMinutes: Math.round(predBreak),
      departureMinutes: Math.round(predDep),
      isForecast: true,
      varianceOffice: Math.round(varO * 10) / 10,
      varianceBreak: Math.round(varB),
      varianceDeparture: Math.round(varD),
    });
  }

  return points;
}

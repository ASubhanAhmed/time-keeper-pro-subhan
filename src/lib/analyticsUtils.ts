import { TimeEntry, getTotalBreakMinutes } from '@/types/timeEntry';

export interface DaySummary {
  date: string;
  dayLabel: string;
  totalMinutes: number;
  breakMinutes: number;
  netMinutes: number;
  sessions: number;
}

export interface WeekSummary {
  days: DaySummary[];
  totalHours: number;
  avgHoursPerDay: number;
  totalBreakMinutes: number;
  longestDay: DaySummary | null;
  daysWorked: number;
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

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function getShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getWeekDates(weekOffset: number = 0): string[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + weekOffset * 7);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export function getWeekSummary(entries: TimeEntry[], weekOffset: number = 0): WeekSummary {
  const weekDates = getWeekDates(weekOffset);
  const workEntries = entries.filter(e => e.type === 'work');

  const days: DaySummary[] = weekDates.map(date => {
    const entry = workEntries.find(e => e.date === date);
    const totalMinutes = entry ? getWorkMinutesForEntry(entry) : 0;
    const breakMinutes = entry ? getTotalBreakMinutes(entry.sessions) : 0;
    return {
      date,
      dayLabel: getDayLabel(date),
      totalMinutes,
      breakMinutes,
      netMinutes: Math.max(0, totalMinutes - breakMinutes),
      sessions: entry ? entry.sessions.length : 0,
    };
  });

  const workedDays = days.filter(d => d.totalMinutes > 0);
  const totalMinutes = days.reduce((s, d) => s + d.totalMinutes, 0);

  return {
    days,
    totalHours: totalMinutes / 60,
    avgHoursPerDay: workedDays.length > 0 ? totalMinutes / 60 / workedDays.length : 0,
    totalBreakMinutes: days.reduce((s, d) => s + d.breakMinutes, 0),
    longestDay: workedDays.length > 0
      ? workedDays.reduce((max, d) => d.totalMinutes > max.totalMinutes ? d : max)
      : null,
    daysWorked: workedDays.length,
  };
}

export function getMonthSummary(entries: TimeEntry[], monthOffset: number = 0): { weekSummaries: { label: string; totalHours: number }[], monthLabel: string } {
  // Calculate the base week offset from monthOffset (approx 4 weeks per month)
  const baseWeekOffset = monthOffset * 4;
  const summaries = [];
  for (let i = 0; i < 4; i++) {
    const weekOff = baseWeekOffset - i;
    const ws = getWeekSummary(entries, weekOff);
    const dates = getWeekDates(weekOff);
    summaries.unshift({
      label: `${getShortDate(dates[0])} - ${getShortDate(dates[6])}`,
      totalHours: Math.round(ws.totalHours * 10) / 10,
    });
  }
  // Month label from the middle of the 4-week range
  const midDates = getWeekDates(baseWeekOffset - 2);
  const midDate = new Date(midDates[3] + 'T00:00:00');
  const monthLabel = midDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { weekSummaries: summaries, monthLabel };
}

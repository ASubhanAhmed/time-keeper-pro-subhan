import { TimeEntry, getDayBounds, getTotalBreakMinutes } from '@/types/timeEntry';
import { calculateSessionsOfficeDuration } from '@/lib/timeUtils';

export function exportEntriesToCSV(entries: TimeEntry[]) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  
  const rows: string[][] = [
    ['Date', 'Type', 'Start', 'End', 'Break (min)', 'Office Time', 'Sessions', 'Notes'],
  ];

  for (const entry of sorted) {
    const { earliestIn, latestOut } = getDayBounds(entry.sessions);
    const breakMin = getTotalBreakMinutes(entry.sessions);
    const officeTime = entry.type === 'work' ? calculateSessionsOfficeDuration(entry.sessions) : '';

    rows.push([
      entry.date,
      entry.type,
      earliestIn || '',
      latestOut || '',
      String(breakMin),
      officeTime,
      String(entry.sessions.length),
      `"${(entry.notes || '').replace(/"/g, '""')}"`,
    ]);
  }

  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timetrack-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

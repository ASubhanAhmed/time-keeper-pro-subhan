import { TimeEntry } from '@/types/timeEntry';

export function exportEntriesToJSON(entries: TimeEntry[]) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const json = JSON.stringify(sorted, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timetrack-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

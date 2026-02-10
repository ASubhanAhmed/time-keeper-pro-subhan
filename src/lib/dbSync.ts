import { TimeEntry, getDayBounds, getTotalBreakMinutes } from '@/types/timeEntry';
import { calculateSessionsOfficeDuration } from '@/lib/timeUtils';

// Set this to your PHP API URL after uploading timetrack-api.php to your hosting
const API_URL = localStorage.getItem('timetrack-api-url') || '';

export function setApiUrl(url: string) {
  localStorage.setItem('timetrack-api-url', url);
}

export function getApiUrl(): string {
  return localStorage.getItem('timetrack-api-url') || '';
}

function entryToDbRow(entry: TimeEntry) {
  const { earliestIn, latestOut } = getDayBounds(entry.sessions);
  const breakMinutes = getTotalBreakMinutes(entry.sessions);
  const officeTime = calculateSessionsOfficeDuration(entry.sessions);

  return {
    date: entry.date,
    type: entry.type,
    start: earliestIn,
    end: latestOut,
    break_min: breakMinutes > 0 ? String(breakMinutes) : null,
    office_time: officeTime !== '--:--' ? officeTime : null,
    sessions: entry.sessions.length,
    notes: entry.notes || null,
  };
}

export async function fetchEntriesFromDb(): Promise<any[]> {
  const url = getApiUrl();
  if (!url) return [];
  try {
    const res = await fetch(`${url}?action=list`);
    if (!res.ok) {
      console.error('Failed to fetch from DB:', await res.text());
      return [];
    }
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('DB fetch error:', err);
    return [];
  }
}

export async function upsertEntryToDb(entry: TimeEntry): Promise<void> {
  const url = getApiUrl();
  if (!url) return;
  try {
    const row = entryToDbRow(entry);
    const res = await fetch(`${url}?action=upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      console.error('Failed to upsert to DB:', await res.text());
    }
  } catch (err) {
    console.error('DB upsert error:', err);
  }
}

export async function deleteEntryFromDb(date: string): Promise<void> {
  const url = getApiUrl();
  if (!url) return;
  try {
    const res = await fetch(`${url}?action=delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    if (!res.ok) {
      console.error('Failed to delete from DB:', await res.text());
    }
  } catch (err) {
    console.error('DB delete error:', err);
  }
}

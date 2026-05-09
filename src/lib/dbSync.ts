import { supabase } from '@/integrations/supabase/client';
import { TimeEntry } from '@/types/timeEntry';

const PENDING_ENTRY_SAVES_KEY = 'timetrack_pending_entry_saves_v1';

type PendingEntrySave = {
  entry: TimeEntry;
  queuedAt: string;
  attempts: number;
  lastError?: string;
};

function readPendingEntrySaves(): Record<string, PendingEntrySave> {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(PENDING_ENTRY_SAVES_KEY) || '{}');
  } catch {
    return {};
  }
}

function writePendingEntrySaves(queue: Record<string, PendingEntrySave>) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(PENDING_ENTRY_SAVES_KEY, JSON.stringify(queue));
}

function queueEntrySave(entry: TimeEntry, lastError?: string) {
  const queue = readPendingEntrySaves();
  queue[entry.id] = {
    entry,
    queuedAt: queue[entry.id]?.queuedAt || new Date().toISOString(),
    attempts: queue[entry.id]?.attempts || 0,
    lastError,
  };
  writePendingEntrySaves(queue);
}

function removeQueuedEntrySave(entry: TimeEntry) {
  const queue = readPendingEntrySaves();
  if (JSON.stringify(queue[entry.id]?.entry) !== JSON.stringify(entry)) return;
  delete queue[entry.id];
  writePendingEntrySaves(queue);
}

export function getPendingEntrySaves(): TimeEntry[] {
  return Object.values(readPendingEntrySaves()).map(item => item.entry);
}

export function discardPendingEntrySave(id: string) {
  const queue = readPendingEntrySaves();
  delete queue[id];
  writePendingEntrySaves(queue);
}

export async function fetchEntriesFromDb(): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('timetrack_entries')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.error('Failed to fetch entries');
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.date,
    type: row.type,
    sessions: row.sessions || [],
    notes: row.notes || '',
  }));
}

export async function upsertEntryToDb(entry: TimeEntry): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (import.meta.env.DEV) console.error('upsertEntryToDb: No authenticated user found');
    return false;
  }

  const payload = {
    id: entry.id,
    date: entry.date,
    type: entry.type,
    sessions: JSON.parse(JSON.stringify(entry.sessions)),
    notes: entry.notes || '',
    user_id: user.id,
  };

  if (import.meta.env.DEV) console.log('upsertEntryToDb: saving', payload.id, 'sessions:', JSON.stringify(payload.sessions));

  const { error } = await supabase
    .from('timetrack_entries')
    .upsert(payload as any, { onConflict: 'id' });

  if (error) {
    if (import.meta.env.DEV) console.error('Failed to save entry:', error.message, error);
    return false;
  } else {
    if (import.meta.env.DEV) console.log('upsertEntryToDb: saved successfully', payload.id);
    return true;
  }
}

export async function upsertEntryToDbReliably(entry: TimeEntry): Promise<boolean> {
  queueEntrySave(entry);
  const saved = await upsertEntryToDb(entry);
  if (saved) {
    removeQueuedEntrySave(entry);
    return true;
  }
  const queue = readPendingEntrySaves();
  if (queue[entry.id]) {
    queue[entry.id] = {
      ...queue[entry.id],
      attempts: queue[entry.id].attempts + 1,
      lastError: 'Latest save attempt failed',
    };
    writePendingEntrySaves(queue);
  }
  return false;
}

export async function flushPendingEntrySaves(): Promise<void> {
  const queue = readPendingEntrySaves();
  for (const item of Object.values(queue)) {
    const saved = await upsertEntryToDb(item.entry);
    if (saved) {
      removeQueuedEntrySave(item.entry);
    } else {
      const latestQueue = readPendingEntrySaves();
      if (latestQueue[item.entry.id]) {
        latestQueue[item.entry.id] = {
          ...latestQueue[item.entry.id],
          attempts: latestQueue[item.entry.id].attempts + 1,
          lastError: 'Retry failed',
        };
        writePendingEntrySaves(latestQueue);
      }
    }
  }
}

export async function deleteEntryFromDb(id: string): Promise<void> {
  const { error } = await supabase
    .from('timetrack_entries')
    .delete()
    .eq('id', id);

  if (error) {
    if (import.meta.env.DEV) console.error('Failed to delete entry');
  }
}

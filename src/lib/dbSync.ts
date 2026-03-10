import { supabase } from '@/integrations/supabase/client';
import { TimeEntry } from '@/types/timeEntry';

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

export async function upsertEntryToDb(entry: TimeEntry): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (import.meta.env.DEV) console.error('upsertEntryToDb: No authenticated user found');
    return;
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
  } else {
    if (import.meta.env.DEV) console.log('upsertEntryToDb: saved successfully', payload.id);
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

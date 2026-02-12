import { supabase } from '@/integrations/supabase/client';
import { TimeEntry } from '@/types/timeEntry';

export async function fetchEntriesFromDb(): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('timetrack_entries')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Failed to fetch entries');
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
  if (!user) return;

  const { error } = await supabase
    .from('timetrack_entries')
    .upsert({
      id: entry.id,
      date: entry.date,
      type: entry.type,
      sessions: entry.sessions as any,
      notes: entry.notes || '',
      user_id: user.id,
    }, { onConflict: 'id' });

  if (error) {
    console.error('Failed to save entry');
  }
}

export async function deleteEntryFromDb(id: string): Promise<void> {
  const { error } = await supabase
    .from('timetrack_entries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete entry');
  }
}

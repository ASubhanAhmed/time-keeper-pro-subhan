import { supabase } from '@/integrations/supabase/client';
import { TimeEntry } from '@/types/timeEntry';

export async function fetchEntriesFromDb(): Promise<TimeEntry[]> {
  const { data, error } = await supabase
    .from('timetrack_entries')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Failed to fetch entries:', error);
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
  const { error } = await supabase
    .from('timetrack_entries')
    .upsert({
      id: entry.id,
      date: entry.date,
      type: entry.type,
      sessions: entry.sessions as any,
      notes: entry.notes || '',
    }, { onConflict: 'id' });

  if (error) {
    console.error('Failed to upsert entry:', error);
  }
}

export async function deleteEntryFromDb(id: string): Promise<void> {
  const { error } = await supabase
    .from('timetrack_entries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete entry:', error);
  }
}

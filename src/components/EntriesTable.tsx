import { Card, CardContent } from '@/components/ui/card';
import { TimeEntry, WorkSession } from '@/types/timeEntry';
import { EntryCard } from '@/components/EntryCard';
import { History } from 'lucide-react';

interface EntriesTableProps {
  entries: TimeEntry[];
  onUpdate: (id: string, updates: Partial<TimeEntry>) => void;
  onDelete: (id: string) => void;
  onUpdateSession?: (entryId: string, sessionId: string, updates: Partial<WorkSession>) => void;
  onDeleteSession?: (entryId: string, sessionId: string) => void;
}

export function EntriesTable({ 
  entries, 
  onUpdate, 
  onDelete,
  onUpdateSession,
  onDeleteSession,
}: EntriesTableProps) {
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (entries.length === 0) {
    return (
      <Card className="border-none shadow-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <History className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-center">No entries yet. Start tracking your time!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {sortedEntries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onUpdateSession={onUpdateSession}
          onDeleteSession={onDeleteSession}
        />
      ))}
    </div>
  );
}

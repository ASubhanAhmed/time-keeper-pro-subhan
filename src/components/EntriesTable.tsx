import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TimeEntry, WorkSession } from '@/types/timeEntry';
import { EntryCard } from '@/components/EntryCard';
import { History, Trash2, X, CheckSquare, ChevronDown } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const PAGE_SIZE = 15;

interface EntriesTableProps {
  entries: TimeEntry[];
  onUpdate: (id: string, updates: Partial<TimeEntry>) => void;
  onDelete: (id: string) => void;
  onUpdateSession?: (entryId: string, sessionId: string, updates: Partial<WorkSession>) => void;
  onDeleteSession?: (entryId: string, sessionId: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

export function EntriesTable({ entries, onUpdate, onDelete, onUpdateSession, onDeleteSession, onBulkDelete }: EntriesTableProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sortedEntries = useMemo(() =>
    [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [entries]
  );

  const visibleEntries = useMemo(() =>
    sortedEntries.slice(0, visibleCount),
    [sortedEntries, visibleCount]
  );

  const hasMore = visibleCount < sortedEntries.length;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedEntries.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedEntries.map(e => e.id)));
  }, [selectedIds.size, sortedEntries]);

  const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  const handleBulkDelete = () => {
    if (onBulkDelete) onBulkDelete(Array.from(selectedIds));
    else selectedIds.forEach(id => onDelete(id));
    exitSelectionMode();
  };

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  }, []);

  if (entries.length === 0) {
    return (
      <Card className="border-none glass rounded-2xl shadow-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <History className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-center">No entries yet. Start tracking your time!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {selectionMode ? (
          <>
            <Button variant="outline" size="sm" onClick={toggleSelectAll} className="rounded-xl">
              <CheckSquare className="h-4 w-4 mr-1" />
              {selectedIds.size === sortedEntries.length ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <div className="flex-1" />
            {selectedIds.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="rounded-xl">
                    <Trash2 className="h-4 w-4 mr-1" /> Delete ({selectedIds.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedIds.size} entries?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete {selectedIds.size} selected entries. This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBulkDelete} className="rounded-xl">Delete All</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="ghost" size="sm" onClick={exitSelectionMode} className="rounded-xl">
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)} className="rounded-xl">
            <CheckSquare className="h-4 w-4 mr-1" /> Select
          </Button>
        )}
      </div>

      {visibleEntries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-2">
          {selectionMode && (
            <div className="pt-4 shrink-0">
              <Checkbox checked={selectedIds.has(entry.id)} onCheckedChange={() => toggleSelect(entry.id)} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <EntryCard entry={entry} onUpdate={onUpdate} onDelete={onDelete} onUpdateSession={onUpdateSession} onDeleteSession={onDeleteSession} />
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={loadMore} className="rounded-xl">
            <ChevronDown className="h-4 w-4 mr-1" />
            Show More ({sortedEntries.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TimeEntry } from '@/types/timeEntry';
import { formatDate, calculateWorkDuration } from '@/lib/timeUtils';
import { Pencil, Trash2, Check, X } from 'lucide-react';

interface EntriesTableProps {
  entries: TimeEntry[];
  onUpdate: (id: string, updates: Partial<TimeEntry>) => void;
  onDelete: (id: string) => void;
}

export function EntriesTable({ entries, onUpdate, onDelete }: EntriesTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<TimeEntry>>({});

  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const startEdit = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setEditValues({
      clockIn: entry.clockIn || '',
      clockOut: entry.clockOut || '',
      breakStart: entry.breakStart || '',
      breakEnd: entry.breakEnd || '',
      notes: entry.notes,
    });
  };

  const saveEdit = () => {
    if (editingId) {
      onUpdate(editingId, {
        ...editValues,
        clockIn: editValues.clockIn || null,
        clockOut: editValues.clockOut || null,
        breakStart: editValues.breakStart || null,
        breakEnd: editValues.breakEnd || null,
      });
      setEditingId(null);
      setEditValues({});
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'work':
        return <Badge variant="default">Work</Badge>;
      case 'leave':
        return <Badge variant="secondary">Leave</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (entries.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">No entries yet. Start tracking your time!</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead>Break</TableHead>
            <TableHead>Work Time</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEntries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium">{formatDate(entry.date)}</TableCell>
              <TableCell>{getTypeBadge(entry.type)}</TableCell>
              <TableCell>
                {editingId === entry.id ? (
                  <Input
                    type="time"
                    value={editValues.clockIn || ''}
                    onChange={(e) => setEditValues({ ...editValues, clockIn: e.target.value })}
                    className="w-28"
                  />
                ) : (
                  <span className="font-mono">{entry.clockIn || '--:--'}</span>
                )}
              </TableCell>
              <TableCell>
                {editingId === entry.id ? (
                  <Input
                    type="time"
                    value={editValues.clockOut || ''}
                    onChange={(e) => setEditValues({ ...editValues, clockOut: e.target.value })}
                    className="w-28"
                  />
                ) : (
                  <span className="font-mono">{entry.clockOut || '--:--'}</span>
                )}
              </TableCell>
              <TableCell>
                {editingId === entry.id ? (
                  <div className="flex gap-1">
                    <Input
                      type="time"
                      value={editValues.breakStart || ''}
                      onChange={(e) => setEditValues({ ...editValues, breakStart: e.target.value })}
                      className="w-24"
                      placeholder="Start"
                    />
                    <Input
                      type="time"
                      value={editValues.breakEnd || ''}
                      onChange={(e) => setEditValues({ ...editValues, breakEnd: e.target.value })}
                      className="w-24"
                      placeholder="End"
                    />
                  </div>
                ) : (
                  <span className="font-mono text-sm">
                    {entry.breakStart 
                      ? `${entry.breakStart} - ${entry.breakEnd || '--:--'}`
                      : '--'
                    }
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span className="font-mono font-semibold">
                  {entry.type === 'leave' 
                    ? '--' 
                    : calculateWorkDuration(entry.clockIn, entry.clockOut, entry.breakStart, entry.breakEnd)
                  }
                </span>
              </TableCell>
              <TableCell>
                {editingId === entry.id ? (
                  <Input
                    value={editValues.notes || ''}
                    onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                    className="w-32"
                    placeholder="Notes"
                  />
                ) : (
                  <span className="max-w-32 truncate text-sm text-muted-foreground">
                    {entry.notes || '--'}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {editingId === entry.id ? (
                    <>
                      <Button size="icon" variant="ghost" onClick={saveEdit}>
                        <Check className="h-4 w-4 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(entry)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this entry for {formatDate(entry.date)}? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(entry.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

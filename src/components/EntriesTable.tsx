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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TimeEntry, WorkSession, getDayBounds } from '@/types/timeEntry';
import { formatDate, calculateSessionsOfficeDuration } from '@/lib/timeUtils';
import { Pencil, Trash2, Check, X, ChevronDown, ChevronRight } from 'lucide-react';

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
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<WorkSession>>({});

  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
  };

  const startEditSession = (session: WorkSession) => {
    setEditingSessionId(session.id);
    setEditValues({
      clockIn: session.clockIn || '',
      clockOut: session.clockOut || '',
      breakStart: session.breakStart || '',
      breakEnd: session.breakEnd || '',
    });
  };

  const saveSessionEdit = (entryId: string) => {
    if (editingSessionId && onUpdateSession) {
      onUpdateSession(entryId, editingSessionId, {
        clockIn: editValues.clockIn || '',
        clockOut: editValues.clockOut || null,
        breakStart: editValues.breakStart || null,
        breakEnd: editValues.breakEnd || null,
      });
      setEditingSessionId(null);
      setEditValues({});
    }
  };

  const cancelEdit = () => {
    setEditingSessionId(null);
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
        <p className="text-muted-foreground text-center px-4">No entries yet. Start tracking your time!</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead className="min-w-[100px]">Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="hidden sm:table-cell">Start</TableHead>
            <TableHead className="hidden sm:table-cell">End</TableHead>
            <TableHead>Office Time</TableHead>
            <TableHead className="hidden md:table-cell">Notes</TableHead>
            <TableHead className="w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEntries.map((entry) => {
            const { earliestIn, latestOut } = getDayBounds(entry.sessions);
            const isExpanded = expandedEntries.has(entry.id);
            const hasMultipleSessions = entry.sessions.length > 1;
            
            return (
              <Collapsible key={entry.id} open={isExpanded} asChild>
                <>
                  <TableRow className="group">
                    <TableCell className="p-2">
                      {entry.type === 'work' && entry.sessions.length > 0 && (
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => toggleExpand(entry.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      <span className="hidden sm:inline">{formatDate(entry.date)}</span>
                      <span className="sm:hidden">{entry.date.slice(5)}</span>
                    </TableCell>
                    <TableCell>{getTypeBadge(entry.type)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="font-mono">{earliestIn || '--:--'}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="font-mono">{latestOut || '--:--'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-semibold">
                        {entry.type === 'leave' 
                          ? 'Leave' 
                          : calculateSessionsOfficeDuration(entry.sessions)
                        }
                      </span>
                      {hasMultipleSessions && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({entry.sessions.length})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="max-w-32 truncate text-sm text-muted-foreground">
                        {entry.notes || '--'}
                      </span>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                  
                  <CollapsibleContent asChild>
                    <>
                      {entry.sessions.map((session, idx) => (
                        <TableRow key={session.id} className="bg-muted/30">
                          <TableCell></TableCell>
                          <TableCell className="text-xs text-muted-foreground pl-4">
                            Session {idx + 1}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {editingSessionId === session.id ? (
                              <Input
                                type="time"
                                value={editValues.clockIn || ''}
                                onChange={(e) => setEditValues({ ...editValues, clockIn: e.target.value })}
                                className="w-24 h-8 text-sm"
                              />
                            ) : (
                              <span className="font-mono text-sm">{session.clockIn}</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {editingSessionId === session.id ? (
                              <Input
                                type="time"
                                value={editValues.clockOut || ''}
                                onChange={(e) => setEditValues({ ...editValues, clockOut: e.target.value })}
                                className="w-24 h-8 text-sm"
                              />
                            ) : (
                              <span className="font-mono text-sm">{session.clockOut || '--:--'}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingSessionId === session.id ? (
                              <div className="flex flex-col gap-1">
                                <Input
                                  type="time"
                                  value={editValues.breakStart || ''}
                                  onChange={(e) => setEditValues({ ...editValues, breakStart: e.target.value })}
                                  className="w-24 h-8 text-sm"
                                  placeholder="Break start"
                                />
                                <Input
                                  type="time"
                                  value={editValues.breakEnd || ''}
                                  onChange={(e) => setEditValues({ ...editValues, breakEnd: e.target.value })}
                                  className="w-24 h-8 text-sm"
                                  placeholder="Break end"
                                />
                              </div>
                            ) : (
                              <span className="font-mono text-xs text-muted-foreground">
                                {session.breakStart 
                                  ? `Break: ${session.breakStart}-${session.breakEnd || '?'}`
                                  : 'No break'
                                }
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell"></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {editingSessionId === session.id ? (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveSessionEdit(entry.id)}>
                                    <Check className="h-3 w-3 text-primary" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                                    <X className="h-3 w-3 text-destructive" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditSession(session)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  {onDeleteSession && entry.sessions.length > 1 && (
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-7 w-7"
                                      onClick={() => onDeleteSession(entry.id, session.id)}
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  </CollapsibleContent>
                </>
              </Collapsible>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

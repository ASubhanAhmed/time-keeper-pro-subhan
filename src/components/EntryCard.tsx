import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TimeEntry, WorkSession, getDayBounds } from '@/types/timeEntry';
import { formatDate, formatDateShort, calculateSessionsOfficeDuration } from '@/lib/timeUtils';
import { Pencil, Trash2, Check, X, ChevronDown, ChevronRight, Clock, Coffee, FileText } from 'lucide-react';

interface EntryCardProps {
  entry: TimeEntry;
  onUpdate: (id: string, updates: Partial<TimeEntry>) => void;
  onDelete: (id: string) => void;
  onUpdateSession?: (entryId: string, sessionId: string, updates: Partial<WorkSession>) => void;
  onDeleteSession?: (entryId: string, sessionId: string) => void;
}

export function EntryCard({ entry, onUpdate, onDelete, onUpdateSession, onDeleteSession }: EntryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<WorkSession>>({});
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(entry.notes || '');

  const { earliestIn, latestOut } = getDayBounds(entry.sessions);

  const startEditSession = (session: WorkSession) => {
    setEditingSessionId(session.id);
    setEditValues({ clockIn: session.clockIn || '', clockOut: session.clockOut || '', breakStart: session.breakStart || '', breakEnd: session.breakEnd || '' });
  };

  const saveSessionEdit = () => {
    if (editingSessionId && onUpdateSession) {
      onUpdateSession(entry.id, editingSessionId, {
        clockIn: editValues.clockIn || '',
        clockOut: editValues.clockOut || null,
        breakStart: editValues.breakStart || null,
        breakEnd: editValues.breakEnd || null,
      });
      setEditingSessionId(null);
      setEditValues({});
    }
  };

  const cancelEdit = () => { setEditingSessionId(null); setEditValues({}); };

  const saveNotes = () => { onUpdate(entry.id, { notes: notesValue }); setEditingNotes(false); };

  const subtaskVariants = {
    hidden: { opacity: 0, height: 0, overflow: 'hidden' as const },
    visible: { opacity: 1, height: 'auto' as const, overflow: 'visible' as const, transition: { duration: 0.25, ease: [0.2, 0.65, 0.3, 0.9] as [number, number, number, number] } },
    exit: { opacity: 0, height: 0, overflow: 'hidden' as const, transition: { duration: 0.2, ease: [0.2, 0.65, 0.3, 0.9] as [number, number, number, number] } },
  };

  return (
    <motion.div layout className="rounded-2xl border border-border/30 bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="shrink-0 text-muted-foreground">
          {entry.type === 'work' && entry.sessions.length > 0 ? (
            isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : <div className="w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              <span className="hidden sm:inline">{formatDate(entry.date)}</span>
              <span className="sm:hidden">{formatDateShort(entry.date)}</span>
            </span>
            {entry.type === 'work' ? (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 rounded-md">Work</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-md">Leave</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            {entry.type === 'work' ? (
              <>
                <span className="font-mono">{earliestIn || '--:--'} → {latestOut || '--:--'}</span>
                <span className="font-mono font-semibold text-foreground">{calculateSessionsOfficeDuration(entry.sessions)}</span>
                {entry.sessions.length > 1 && <span>({entry.sessions.length} sessions)</span>}
              </>
            ) : <span className="font-semibold text-foreground">Leave</span>}
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100 rounded-xl" onClick={(e) => e.stopPropagation()}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Entry</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete this entry for {formatDate(entry.date)}? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(entry.id)} className="rounded-xl">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div key="content" variants={subtaskVariants} initial="hidden" animate="visible" exit="exit">
            <div className="border-t border-border/20 px-4 py-3 space-y-3">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                {editingNotes ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input value={notesValue} onChange={(e) => setNotesValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveNotes(); if (e.key === 'Escape') { setEditingNotes(false); setNotesValue(entry.notes || ''); } }} className="h-8 text-sm flex-1 rounded-lg" placeholder="Add notes..." autoFocus />
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={saveNotes}><Check className="h-3 w-3 text-primary" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { setEditingNotes(false); setNotesValue(entry.notes || ''); }}><X className="h-3 w-3 text-destructive" /></Button>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex-1" onClick={(e) => { e.stopPropagation(); setNotesValue(entry.notes || ''); setEditingNotes(true); }}>
                    {entry.notes || 'Tap to add notes...'}
                  </span>
                )}
              </div>

              {entry.sessions.map((session, idx) => (
                <div key={session.id} className="rounded-xl bg-background/60 border border-border/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Session {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      {editingSessionId === session.id ? (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveSessionEdit}><Check className="h-3 w-3 text-primary" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}><X className="h-3 w-3 text-destructive" /></Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" onClick={() => startEditSession(session)}><Pencil className="h-3 w-3" /></Button>
                          {onDeleteSession && entry.sessions.length > 1 && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 hover:opacity-100" onClick={() => onDeleteSession(entry.id, session.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Clock In</label>
                      {editingSessionId === session.id ? (
                        <Input type="time" value={editValues.clockIn || ''} onChange={(e) => setEditValues({ ...editValues, clockIn: e.target.value })} className="h-8 text-sm mt-0.5 rounded-lg" />
                      ) : <span className="font-mono text-sm">{session.clockIn}</span>}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Clock Out</label>
                      {editingSessionId === session.id ? (
                        <Input type="time" value={editValues.clockOut || ''} onChange={(e) => setEditValues({ ...editValues, clockOut: e.target.value })} className="h-8 text-sm mt-0.5 rounded-lg" />
                      ) : <span className="font-mono text-sm">{session.clockOut || '--:--'}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Coffee className="h-3 w-3" /> Break Start</label>
                      {editingSessionId === session.id ? (
                        <Input type="time" value={editValues.breakStart || ''} onChange={(e) => setEditValues({ ...editValues, breakStart: e.target.value })} className="h-8 text-sm mt-0.5 rounded-lg" />
                      ) : <span className="font-mono text-sm text-muted-foreground">{session.breakStart || '--:--'}</span>}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Coffee className="h-3 w-3" /> Break End</label>
                      {editingSessionId === session.id ? (
                        <Input type="time" value={editValues.breakEnd || ''} onChange={(e) => setEditValues({ ...editValues, breakEnd: e.target.value })} className="h-8 text-sm mt-0.5 rounded-lg" />
                      ) : <span className="font-mono text-sm text-muted-foreground">{session.breakEnd || '--:--'}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

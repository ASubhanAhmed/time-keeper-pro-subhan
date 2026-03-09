import { useState, useEffect, useCallback } from 'react';
import { TimeEntry, WorkSession, WorkStatus } from '@/types/timeEntry';
import { upsertEntryToDb, deleteEntryFromDb, fetchEntriesFromDb } from '@/lib/dbSync';
import { toast } from '@/hooks/use-toast';

export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<WorkStatus>({
    isClockedIn: false,
    isOnBreak: false,
    currentEntryId: null,
    currentSessionId: null,
  });

  useEffect(() => {
    setLoading(true);
    fetchEntriesFromDb().then((dbEntries) => {
      setEntries(dbEntries);
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = dbEntries.find(e => e.date === today && e.type === 'work');
      if (todayEntry) {
        const activeSession = todayEntry.sessions.find(s => s.clockIn && !s.clockOut);
        if (activeSession) {
          setStatus({
            isClockedIn: true,
            isOnBreak: !!(activeSession.breakStart && !activeSession.breakEnd),
            currentEntryId: todayEntry.id,
            currentSessionId: activeSession.id,
          });
        }
      }
      setLoading(false);
    });
  }, []);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const clockIn = useCallback(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    const newSessionId = generateId();

    setEntries(prevEntries => {
      const existingToday = prevEntries.find(e => e.date === today && e.type === 'work');

      if (existingToday) {
        const newSession: WorkSession = { id: newSessionId, clockIn: time, clockOut: null, breakStart: null, breakEnd: null };
        const updated = prevEntries.map(e => e.id === existingToday.id ? { ...e, sessions: [...e.sessions, newSession] } : e);
        const changedEntry = updated.find(e => e.id === existingToday.id);
        if (changedEntry) upsertEntryToDb(changedEntry);
        setStatus({ isClockedIn: true, isOnBreak: false, currentEntryId: existingToday.id, currentSessionId: newSessionId });
        toast({ title: 'Clocked In', description: `Session started at ${time}` });
        return updated;
      } else {
        const newEntry: TimeEntry = {
          id: generateId(), date: today, type: 'work',
          sessions: [{ id: newSessionId, clockIn: time, clockOut: null, breakStart: null, breakEnd: null }],
          notes: '',
        };
        upsertEntryToDb(newEntry);
        setStatus({ isClockedIn: true, isOnBreak: false, currentEntryId: newEntry.id, currentSessionId: newSessionId });
        toast({ title: 'Clocked In', description: `Session started at ${time}` });
        return [...prevEntries, newEntry];
      }
    });
  }, []);

  const clockOut = useCallback(() => {
    const time = new Date().toTimeString().slice(0, 5);
    setStatus(prevStatus => {
      const entryId = prevStatus.currentEntryId;
      const sessionId = prevStatus.currentSessionId;
      if (entryId && sessionId) {
        setEntries(prevEntries => {
          const updated = prevEntries.map(e => {
            if (e.id === entryId) {
              return {
                ...e, sessions: e.sessions.map(s => s.id === sessionId
                  ? { ...s, clockOut: time, breakEnd: s.breakStart && !s.breakEnd ? time : s.breakEnd }
                  : s)
              };
            }
            return e;
          });
          const changedEntry = updated.find(e => e.id === entryId);
          if (changedEntry) upsertEntryToDb(changedEntry);
          return updated;
        });
        toast({ title: 'Clocked Out', description: `Session ended at ${time}` });
      }
      return { isClockedIn: false, isOnBreak: false, currentEntryId: null, currentSessionId: null };
    });
  }, []);

  const startBreak = useCallback(() => {
    const time = new Date().toTimeString().slice(0, 5);
    setStatus(prevStatus => {
      const entryId = prevStatus.currentEntryId;
      const sessionId = prevStatus.currentSessionId;
      if (entryId && sessionId) {
        setEntries(prevEntries => {
          const updated = prevEntries.map(e => {
            if (e.id === entryId) {
              return { ...e, sessions: e.sessions.map(s => s.id === sessionId ? { ...s, breakStart: time, breakEnd: null } : s) };
            }
            return e;
          });
          const changedEntry = updated.find(e => e.id === entryId);
          if (changedEntry) upsertEntryToDb(changedEntry);
          return updated;
        });
        toast({ title: 'Break Started', description: `Break began at ${time}` });
        return { ...prevStatus, isOnBreak: true };
      }
      return prevStatus;
    });
  }, []);

  const endBreak = useCallback(() => {
    const time = new Date().toTimeString().slice(0, 5);
    setStatus(prevStatus => {
      const entryId = prevStatus.currentEntryId;
      const sessionId = prevStatus.currentSessionId;
      if (entryId && sessionId) {
        setEntries(prevEntries => {
          const updated = prevEntries.map(e => {
            if (e.id === entryId) {
              return { ...e, sessions: e.sessions.map(s => s.id === sessionId ? { ...s, breakEnd: time } : s) };
            }
            return e;
          });
          const changedEntry = updated.find(e => e.id === entryId);
          if (changedEntry) upsertEntryToDb(changedEntry);
          return updated;
        });
        toast({ title: 'Break Ended', description: `Break ended at ${time}` });
        return { ...prevStatus, isOnBreak: false };
      }
      return prevStatus;
    });
  }, []);

  const addEntry = useCallback((entry: Omit<TimeEntry, 'id'>) => {
    const newEntry = { ...entry, id: generateId() };
    setEntries(prev => [...prev, newEntry]);
    upsertEntryToDb(newEntry);
  }, []);

  const updateEntry = useCallback((id: string, updates: Partial<TimeEntry>) => {
    setEntries(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      const changedEntry = updated.find(e => e.id === id);
      if (changedEntry) upsertEntryToDb(changedEntry);
      return updated;
    });
  }, []);

  const updateSession = useCallback((entryId: string, sessionId: string, updates: Partial<WorkSession>) => {
    setEntries(prev => {
      const updated = prev.map(e => e.id === entryId ? { ...e, sessions: e.sessions.map(s => s.id === sessionId ? { ...s, ...updates } : s) } : e);
      const changedEntry = updated.find(e => e.id === entryId);
      if (changedEntry) upsertEntryToDb(changedEntry);
      return updated;
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    deleteEntryFromDb(id);
    setStatus(prev => prev.currentEntryId === id
      ? { isClockedIn: false, isOnBreak: false, currentEntryId: null, currentSessionId: null }
      : prev
    );
  }, []);

  const deleteSession = useCallback((entryId: string, sessionId: string) => {
    setEntries(prev => {
      const updated = prev.map(e => e.id === entryId ? { ...e, sessions: e.sessions.filter(s => s.id !== sessionId) } : e).filter(e => e.type === 'leave' || e.sessions.length > 0);
      const changedEntry = updated.find(e => e.id === entryId);
      if (changedEntry) upsertEntryToDb(changedEntry);
      return updated;
    });
    setStatus(prev => prev.currentSessionId === sessionId
      ? { isClockedIn: false, isOnBreak: false, currentEntryId: null, currentSessionId: null }
      : prev
    );
  }, []);

  const getTodayEntry = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return entries.find(e => e.date === today && e.type === 'work');
  }, [entries]);

  return { entries, loading, status, clockIn, clockOut, startBreak, endBreak, addEntry, updateEntry, updateSession, deleteEntry, deleteSession, getTodayEntry };
}

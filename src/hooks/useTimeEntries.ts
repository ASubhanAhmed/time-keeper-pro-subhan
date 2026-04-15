import { useState, useEffect, useCallback } from 'react';
import { TimeEntry, WorkSession, WorkStatus } from '@/types/timeEntry';
import { upsertEntryToDb, deleteEntryFromDb, fetchEntriesFromDb } from '@/lib/dbSync';
import { getTotalBreakMinutes } from '@/types/timeEntry';
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
      const today = new Date().toISOString().split('T')[0];

      // Sanitize orphaned records: close any open sessions from past days
      let needsSync = false;
      const sanitized = dbEntries.map(entry => {
        if (entry.date === today || entry.type !== 'work') return entry;
        const hasOrphans = entry.sessions.some(s => s.clockIn && !s.clockOut) ||
          entry.sessions.some(s => s.breakStart && !s.breakEnd);
        if (!hasOrphans) return entry;
        needsSync = true;
        return {
          ...entry,
          sessions: entry.sessions.map(s => ({
            ...s,
            clockOut: s.clockOut || s.clockIn, // close with clock-in time as fallback
            breakEnd: s.breakStart && !s.breakEnd ? (s.clockOut || s.clockIn) : s.breakEnd,
          })),
        };
      });

      // Persist any fixed orphans
      if (needsSync) {
        sanitized.filter((e, i) => e !== dbEntries[i]).forEach(e => upsertEntryToDb(e));
      }

      setEntries(sanitized);
      const todayEntry = sanitized.find(e => e.date === today && e.type === 'work');
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

  const generateId = () => crypto.randomUUID();

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

  // End the entire day: close all open sessions
  const endDay = useCallback(() => {
    const time = new Date().toTimeString().slice(0, 5);
    setStatus(prevStatus => {
      const entryId = prevStatus.currentEntryId;
      if (entryId) {
        setEntries(prevEntries => {
          const updated = prevEntries.map(e => {
            if (e.id === entryId) {
              return {
                ...e,
                sessions: e.sessions.map(s => ({
                  ...s,
                  clockOut: s.clockOut || time,
                  breakEnd: s.breakStart && !s.breakEnd ? time : s.breakEnd,
                })),
              };
            }
            return e;
          });
          const changedEntry = updated.find(e => e.id === entryId);
          if (changedEntry) upsertEntryToDb(changedEntry);
          return updated;
        });
        toast({ title: 'Day Ended', description: `All sessions closed at ${time}` });
      }
      return { isClockedIn: false, isOnBreak: false, currentEntryId: null, currentSessionId: null };
    });
  }, []);

  // Check break limit
  const checkBreakLimit = useCallback((maxBreakMinutes: number): boolean => {
    const todayEntry = getTodayEntry();
    if (!todayEntry) return false;
    const totalBreak = getTotalBreakMinutes(todayEntry.sessions);
    return totalBreak >= maxBreakMinutes;
  }, [entries]);

  // Get today's net work minutes
  const getTodayNetWorkMinutes = useCallback((): number => {
    const todayEntry = getTodayEntry();
    if (!todayEntry) return 0;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let totalMins = 0;
    for (const s of todayEntry.sessions) {
      if (!s.clockIn) continue;
      const [inH, inM] = s.clockIn.split(':').map(Number);
      const outMin = s.clockOut
        ? (() => { const [h, m] = s.clockOut.split(':').map(Number); return h * 60 + m; })()
        : nowMin;
      let mins = outMin - (inH * 60 + inM);
      if (mins < 0) mins += 24 * 60;
      totalMins += mins;
    }
    return Math.max(0, totalMins - getTotalBreakMinutes(todayEntry.sessions));
  }, [entries]);

  const getTodayEntry = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return entries.find(e => e.date === today && e.type === 'work');
  }, [entries]);

  return { entries, loading, status, clockIn, clockOut, startBreak, endBreak, endDay, addEntry, updateEntry, updateSession, deleteEntry, deleteSession, getTodayEntry, checkBreakLimit, getTodayNetWorkMinutes };
}

import { useState, useEffect } from 'react';
import { TimeEntry, WorkSession, WorkStatus } from '@/types/timeEntry';
import { upsertEntryToDb, deleteEntryFromDb, fetchEntriesFromDb } from '@/lib/dbSync';

export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [status, setStatus] = useState<WorkStatus>({
    isClockedIn: false,
    isOnBreak: false,
    currentEntryId: null,
    currentSessionId: null,
  });

  // Load entries from Cloud DB on mount
  useEffect(() => {
    fetchEntriesFromDb().then((dbEntries) => {
      setEntries(dbEntries);

      // Check for active session
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
    });
  }, []);

  // Save entries to state and sync changed entries to Cloud DB
  const saveEntries = (newEntries: TimeEntry[], changedEntryIds?: string[]) => {
    setEntries(newEntries);
    if (changedEntryIds) {
      for (const id of changedEntryIds) {
        const entry = newEntries.find(e => e.id === id);
        if (entry) {
          upsertEntryToDb(entry);
        }
      }
    }
  };

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const clockIn = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    
    const existingToday = entries.find(e => e.date === today && e.type === 'work');
    const newSessionId = generateId();
    
    if (existingToday) {
      const newSession: WorkSession = {
        id: newSessionId,
        clockIn: time,
        clockOut: null,
        breakStart: null,
        breakEnd: null,
      };
      const updated = entries.map(e => 
        e.id === existingToday.id 
          ? { ...e, sessions: [...e.sessions, newSession] }
          : e
      );
      saveEntries(updated, [existingToday.id]);
      setStatus({ isClockedIn: true, isOnBreak: false, currentEntryId: existingToday.id, currentSessionId: newSessionId });
    } else {
      const newEntry: TimeEntry = {
        id: generateId(),
        date: today,
        type: 'work',
        sessions: [{ id: newSessionId, clockIn: time, clockOut: null, breakStart: null, breakEnd: null }],
        notes: '',
      };
      saveEntries([...entries, newEntry], [newEntry.id]);
      setStatus({ isClockedIn: true, isOnBreak: false, currentEntryId: newEntry.id, currentSessionId: newSessionId });
    }
  };

  const clockOut = () => {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    
    if (status.currentEntryId && status.currentSessionId) {
      const updated = entries.map(e => {
        if (e.id === status.currentEntryId) {
          return {
            ...e,
            sessions: e.sessions.map(s => {
              if (s.id === status.currentSessionId) {
                return { ...s, clockOut: time, breakEnd: s.breakStart && !s.breakEnd ? time : s.breakEnd };
              }
              return s;
            }),
          };
        }
        return e;
      });
      saveEntries(updated, [status.currentEntryId!]);
    }
    setStatus({ isClockedIn: false, isOnBreak: false, currentEntryId: null, currentSessionId: null });
  };

  const startBreak = () => {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    
    if (status.currentEntryId && status.currentSessionId) {
      const updated = entries.map(e => {
        if (e.id === status.currentEntryId) {
          return {
            ...e,
            sessions: e.sessions.map(s => 
              s.id === status.currentSessionId ? { ...s, breakStart: time, breakEnd: null } : s
            ),
          };
        }
        return e;
      });
      saveEntries(updated, [status.currentEntryId!]);
      setStatus(prev => ({ ...prev, isOnBreak: true }));
    }
  };

  const endBreak = () => {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    
    if (status.currentEntryId && status.currentSessionId) {
      const updated = entries.map(e => {
        if (e.id === status.currentEntryId) {
          return {
            ...e,
            sessions: e.sessions.map(s => 
              s.id === status.currentSessionId ? { ...s, breakEnd: time } : s
            ),
          };
        }
        return e;
      });
      saveEntries(updated, [status.currentEntryId!]);
      setStatus(prev => ({ ...prev, isOnBreak: false }));
    }
  };

  const addEntry = (entry: Omit<TimeEntry, 'id'>) => {
    const newEntry = { ...entry, id: generateId() };
    saveEntries([...entries, newEntry], [newEntry.id]);
  };

  const updateEntry = (id: string, updates: Partial<TimeEntry>) => {
    const updated = entries.map(e => e.id === id ? { ...e, ...updates } : e);
    saveEntries(updated, [id]);
  };

  const updateSession = (entryId: string, sessionId: string, updates: Partial<WorkSession>) => {
    const updated = entries.map(e => {
      if (e.id === entryId) {
        return { ...e, sessions: e.sessions.map(s => s.id === sessionId ? { ...s, ...updates } : s) };
      }
      return e;
    });
    saveEntries(updated, [entryId]);
  };

  const deleteEntry = (id: string) => {
    const filtered = entries.filter(e => e.id !== id);
    saveEntries(filtered);
    deleteEntryFromDb(id);
    if (status.currentEntryId === id) {
      setStatus({ isClockedIn: false, isOnBreak: false, currentEntryId: null, currentSessionId: null });
    }
  };

  const deleteSession = (entryId: string, sessionId: string) => {
    const updated = entries.map(e => {
      if (e.id === entryId) {
        return { ...e, sessions: e.sessions.filter(s => s.id !== sessionId) };
      }
      return e;
    }).filter(e => e.type === 'leave' || e.sessions.length > 0);
    
    saveEntries(updated, [entryId]);
    if (status.currentSessionId === sessionId) {
      setStatus({ isClockedIn: false, isOnBreak: false, currentEntryId: null, currentSessionId: null });
    }
  };

  const getTodayEntry = () => {
    const today = new Date().toISOString().split('T')[0];
    return entries.find(e => e.date === today && e.type === 'work');
  };

  return {
    entries, status, clockIn, clockOut, startBreak, endBreak,
    addEntry, updateEntry, updateSession, deleteEntry, deleteSession, getTodayEntry,
  };
}

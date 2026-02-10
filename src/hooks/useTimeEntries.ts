import { useState, useEffect, useCallback } from 'react';
import { TimeEntry, WorkSession, WorkStatus, LegacyTimeEntry } from '@/types/timeEntry';
import { upsertEntryToDb, deleteEntryFromDb, fetchEntriesFromDb } from '@/lib/dbSync';

const STORAGE_KEY = 'timetrack-entries';

// Migrate legacy entries to new format
function migrateEntry(entry: LegacyTimeEntry | TimeEntry): TimeEntry {
  // Check if already new format
  if ('sessions' in entry) {
    return entry as TimeEntry;
  }
  
  const legacy = entry as LegacyTimeEntry;
  const sessions: WorkSession[] = [];
  
  if (legacy.clockIn) {
    sessions.push({
      id: `${legacy.id}-session-1`,
      clockIn: legacy.clockIn,
      clockOut: legacy.clockOut,
      breakStart: legacy.breakStart,
      breakEnd: legacy.breakEnd,
    });
  }
  
  return {
    id: legacy.id,
    date: legacy.date,
    type: legacy.type,
    sessions,
    notes: legacy.notes,
  };
}

export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [status, setStatus] = useState<WorkStatus>({
    isClockedIn: false,
    isOnBreak: false,
    currentEntryId: null,
    currentSessionId: null,
  });

  // Load entries from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as (LegacyTimeEntry | TimeEntry)[];
      const migrated = parsed.map(migrateEntry);
      setEntries(migrated);
      
      // Save migrated entries back
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      
      // Check for active session
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = migrated.find(e => e.date === today && e.type === 'work');
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
    }
  }, []);

  // Save entries to localStorage and sync changed entries to DB
  const saveEntries = (newEntries: TimeEntry[], changedEntryIds?: string[]) => {
    setEntries(newEntries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
    
    // Sync changed entries to MySQL DB
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
      // Add new session to existing entry
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
      setStatus({ 
        isClockedIn: true, 
        isOnBreak: false, 
        currentEntryId: existingToday.id,
        currentSessionId: newSessionId,
      });
    } else {
      // Create new entry with first session
      const newEntry: TimeEntry = {
        id: generateId(),
        date: today,
        type: 'work',
        sessions: [{
          id: newSessionId,
          clockIn: time,
          clockOut: null,
          breakStart: null,
          breakEnd: null,
        }],
        notes: '',
      };
      saveEntries([...entries, newEntry], [newEntry.id]);
      setStatus({ 
        isClockedIn: true, 
        isOnBreak: false, 
        currentEntryId: newEntry.id,
        currentSessionId: newSessionId,
      });
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
                return {
                  ...s,
                  clockOut: time,
                  // End break if still on break
                  breakEnd: s.breakStart && !s.breakEnd ? time : s.breakEnd,
                };
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
              s.id === status.currentSessionId 
                ? { ...s, breakStart: time, breakEnd: null }
                : s
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
              s.id === status.currentSessionId 
                ? { ...s, breakEnd: time }
                : s
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
    const updated = entries.map(e => 
      e.id === id ? { ...e, ...updates } : e
    );
    saveEntries(updated, [id]);
  };

  const updateSession = (entryId: string, sessionId: string, updates: Partial<WorkSession>) => {
    const updated = entries.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          sessions: e.sessions.map(s => 
            s.id === sessionId ? { ...s, ...updates } : s
          ),
        };
      }
      return e;
    });
    saveEntries(updated, [entryId]);
  };

  const deleteEntry = (id: string) => {
    const entry = entries.find(e => e.id === id);
    const filtered = entries.filter(e => e.id !== id);
    saveEntries(filtered);
    if (entry) {
      deleteEntryFromDb(entry.date);
    }
    if (status.currentEntryId === id) {
      setStatus({ isClockedIn: false, isOnBreak: false, currentEntryId: null, currentSessionId: null });
    }
  };

  const deleteSession = (entryId: string, sessionId: string) => {
    const updated = entries.map(e => {
      if (e.id === entryId) {
        const newSessions = e.sessions.filter(s => s.id !== sessionId);
        return { ...e, sessions: newSessions };
      }
      return e;
    }).filter(e => e.type === 'leave' || e.sessions.length > 0); // Remove empty work entries
    
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
    entries,
    status,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    addEntry,
    updateEntry,
    updateSession,
    deleteEntry,
    deleteSession,
    getTodayEntry,
  };
}

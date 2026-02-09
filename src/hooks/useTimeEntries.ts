import { useState, useEffect } from 'react';
import { TimeEntry, WorkStatus } from '@/types/timeEntry';

const STORAGE_KEY = 'timetrack-entries';

export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [status, setStatus] = useState<WorkStatus>({
    isClockedIn: false,
    isOnBreak: false,
    currentEntryId: null,
  });

  // Load entries from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as TimeEntry[];
      setEntries(parsed);
      
      // Check for active session
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = parsed.find(e => e.date === today && e.type === 'work');
      if (todayEntry && todayEntry.clockIn && !todayEntry.clockOut) {
        setStatus({
          isClockedIn: true,
          isOnBreak: !!(todayEntry.breakStart && !todayEntry.breakEnd),
          currentEntryId: todayEntry.id,
        });
      }
    }
  }, []);

  // Save entries to localStorage
  const saveEntries = (newEntries: TimeEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries));
  };

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const clockIn = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    
    const existingToday = entries.find(e => e.date === today && e.type === 'work');
    
    if (existingToday) {
      // Update existing entry
      const updated = entries.map(e => 
        e.id === existingToday.id 
          ? { ...e, clockIn: time, clockOut: null }
          : e
      );
      saveEntries(updated);
      setStatus({ isClockedIn: true, isOnBreak: false, currentEntryId: existingToday.id });
    } else {
      // Create new entry
      const newEntry: TimeEntry = {
        id: generateId(),
        date: today,
        clockIn: time,
        clockOut: null,
        breakStart: null,
        breakEnd: null,
        type: 'work',
        notes: '',
      };
      saveEntries([...entries, newEntry]);
      setStatus({ isClockedIn: true, isOnBreak: false, currentEntryId: newEntry.id });
    }
  };

  const clockOut = () => {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    
    if (status.currentEntryId) {
      const updated = entries.map(e => 
        e.id === status.currentEntryId 
          ? { 
              ...e, 
              clockOut: time,
              // End break if still on break
              breakEnd: e.breakStart && !e.breakEnd ? time : e.breakEnd
            }
          : e
      );
      saveEntries(updated);
    }
    setStatus({ isClockedIn: false, isOnBreak: false, currentEntryId: null });
  };

  const startBreak = () => {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    
    if (status.currentEntryId) {
      const updated = entries.map(e => 
        e.id === status.currentEntryId 
          ? { ...e, breakStart: time, breakEnd: null }
          : e
      );
      saveEntries(updated);
      setStatus(prev => ({ ...prev, isOnBreak: true }));
    }
  };

  const endBreak = () => {
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    
    if (status.currentEntryId) {
      const updated = entries.map(e => 
        e.id === status.currentEntryId 
          ? { ...e, breakEnd: time }
          : e
      );
      saveEntries(updated);
      setStatus(prev => ({ ...prev, isOnBreak: false }));
    }
  };

  const addEntry = (entry: Omit<TimeEntry, 'id'>) => {
    const newEntry = { ...entry, id: generateId() };
    saveEntries([...entries, newEntry]);
  };

  const updateEntry = (id: string, updates: Partial<TimeEntry>) => {
    const updated = entries.map(e => 
      e.id === id ? { ...e, ...updates } : e
    );
    saveEntries(updated);
  };

  const deleteEntry = (id: string) => {
    const filtered = entries.filter(e => e.id !== id);
    saveEntries(filtered);
    if (status.currentEntryId === id) {
      setStatus({ isClockedIn: false, isOnBreak: false, currentEntryId: null });
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
    deleteEntry,
    getTodayEntry,
  };
}

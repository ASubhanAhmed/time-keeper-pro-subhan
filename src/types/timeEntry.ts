export type EntryType = 'work' | 'leave';

// A single clock-in/out session within a day
export interface WorkSession {
  id: string;
  clockIn: string; // HH:mm
  clockOut: string | null; // HH:mm
  breakStart: string | null; // HH:mm
  breakEnd: string | null; // HH:mm
}

export interface TimeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  type: EntryType;
  sessions: WorkSession[]; // Multiple sessions per day
  notes: string;
}

// Legacy format for migration
export interface LegacyTimeEntry {
  id: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  type: EntryType;
  notes: string;
}

export interface WorkStatus {
  isClockedIn: boolean;
  isOnBreak: boolean;
  currentEntryId: string | null;
  currentSessionId: string | null;
}

// Helper to get earliest clock-in and latest clock-out from sessions
export function getDayBounds(sessions: WorkSession[]): { earliestIn: string | null; latestOut: string | null } {
  if (sessions.length === 0) return { earliestIn: null, latestOut: null };
  
  const validClockIns = sessions.map(s => s.clockIn).filter(Boolean);
  const validClockOuts = sessions.map(s => s.clockOut).filter((t): t is string => t !== null);
  
  const earliestIn = validClockIns.length > 0 
    ? validClockIns.reduce((min, t) => t < min ? t : min) 
    : null;
  
  const latestOut = validClockOuts.length > 0 
    ? validClockOuts.reduce((max, t) => t > max ? t : max) 
    : null;
  
  return { earliestIn, latestOut };
}

// Get total break time from all sessions
export function getTotalBreakMinutes(sessions: WorkSession[]): number {
  return sessions.reduce((total, session) => {
    if (session.breakStart && session.breakEnd) {
      const [bsH, bsM] = session.breakStart.split(':').map(Number);
      const [beH, beM] = session.breakEnd.split(':').map(Number);
      let breakMinutes = (beH * 60 + beM) - (bsH * 60 + bsM);
      if (breakMinutes < 0) breakMinutes += 24 * 60;
      return total + breakMinutes;
    }
    return total;
  }, 0);
}

export type EntryType = 'work' | 'break' | 'leave';

export interface TimeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  clockIn: string | null; // HH:mm
  clockOut: string | null; // HH:mm
  breakStart: string | null; // HH:mm
  breakEnd: string | null; // HH:mm
  type: EntryType;
  notes: string;
}

export interface WorkStatus {
  isClockedIn: boolean;
  isOnBreak: boolean;
  currentEntryId: string | null;
}

import { useEffect, useState, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Timer } from 'lucide-react';
import { TimeEntry, getTotalBreakMinutes } from '@/types/timeEntry';

interface ClockDisplayProps {
  todayEntry?: TimeEntry;
  isClockedIn: boolean;
}

/** Calculate total time in office (all session durations, NOT subtracting breaks) */
function getTotalOfficeDisplay(todayEntry: TimeEntry | undefined): { total: string; netWork: string; breakTime: string } {
  const zero = { total: '00:00:00', netWork: '00:00', breakTime: '00:00' };
  if (!todayEntry || todayEntry.sessions.length === 0) return zero;

  const now = new Date();
  let totalMinutes = 0;

  for (const s of todayEntry.sessions) {
    if (!s.clockIn) continue;
    const [inH, inM] = s.clockIn.split(':').map(Number);
    const clockInMins = inH * 60 + inM;

    let clockOutMins: number;
    if (s.clockOut) {
      const [outH, outM] = s.clockOut.split(':').map(Number);
      clockOutMins = outH * 60 + outM;
      if (clockOutMins < clockInMins) clockOutMins += 24 * 60;
    } else {
      clockOutMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      if (clockOutMins < clockInMins) clockOutMins += 24 * 60;
    }
    totalMinutes += clockOutMins - clockInMins;
  }

  // Break time (completed + active)
  const completedBreak = getTotalBreakMinutes(todayEntry.sessions);
  const activeSession = todayEntry.sessions.find(s => s.breakStart && !s.breakEnd);
  let activeBreakMins = 0;
  if (activeSession?.breakStart) {
    const [bsH, bsM] = activeSession.breakStart.split(':').map(Number);
    activeBreakMins = (now.getHours() * 60 + now.getMinutes()) - (bsH * 60 + bsM);
    if (activeBreakMins < 0) activeBreakMins += 24 * 60;
  }
  const totalBreak = completedBreak + activeBreakMins;
  const netMins = Math.max(0, totalMinutes - totalBreak);

  // Format total as HH:MM:SS
  const totalSec = Math.floor(Math.max(0, totalMinutes) * 60);
  const tH = Math.floor(totalSec / 3600);
  const tM = Math.floor((totalSec % 3600) / 60);
  const tS = totalSec % 60;
  const total = `${String(tH).padStart(2, '0')}:${String(tM).padStart(2, '0')}:${String(tS).padStart(2, '0')}`;

  // Format net work as HH:MM
  const nH = Math.floor(netMins / 60);
  const nM = Math.round(netMins % 60);
  const netWork = `${String(nH).padStart(2, '0')}:${String(nM).padStart(2, '0')}`;

  // Format break as HH:MM
  const bH = Math.floor(totalBreak / 60);
  const bM = Math.round(totalBreak % 60);
  const breakTime = `${String(bH).padStart(2, '0')}:${String(bM).padStart(2, '0')}`;

  return { total, netWork, breakTime };
}

export const ClockDisplay = memo(function ClockDisplay({ todayEntry, isClockedIn }: ClockDisplayProps) {
  const [time, setTime] = useState(new Date());
  const [display, setDisplay] = useState(getTotalOfficeDisplay(todayEntry));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setDisplay(getTotalOfficeDisplay(todayEntry));
    }, 1000);
    setDisplay(getTotalOfficeDisplay(todayEntry));
    return () => clearInterval(timer);
  }, [todayEntry, isClockedIn]);

  return (
    <Card className="border-none bg-card/50 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center py-6 sm:py-8 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Timer className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Total Time in Office</span>
        </div>
        <p className="font-mono text-4xl sm:text-6xl font-bold tracking-tight text-foreground">
          {display.total}
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>Work: <strong className="text-foreground">{display.netWork}</strong></span>
          <span className="text-border">·</span>
          <span>Break: <strong className="text-foreground">{display.breakTime}</strong></span>
        </div>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          {' · '}
          {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </CardContent>
    </Card>
  );
});

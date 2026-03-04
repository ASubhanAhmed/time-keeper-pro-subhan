import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Timer } from 'lucide-react';
import { TimeEntry, getTotalBreakMinutes } from '@/types/timeEntry';

interface ClockDisplayProps {
  todayEntry?: TimeEntry;
  isClockedIn: boolean;
}

/** Calculate net work time = sum of (session durations) - total breaks */
function getNetWorkDisplay(todayEntry: TimeEntry | undefined, isClockedIn: boolean): string {
  if (!todayEntry || todayEntry.sessions.length === 0) return '00:00:00';

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
      // Active session
      clockOutMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      if (clockOutMins < clockInMins) clockOutMins += 24 * 60;
    }

    totalMinutes += clockOutMins - clockInMins;
  }

  // Subtract breaks
  const breakMins = getTotalBreakMinutes(todayEntry.sessions);
  // For active break, subtract elapsed break time
  const activeSession = todayEntry.sessions.find(s => s.breakStart && !s.breakEnd);
  let activeBreakMins = 0;
  if (activeSession && activeSession.breakStart) {
    const [bsH, bsM] = activeSession.breakStart.split(':').map(Number);
    activeBreakMins = (now.getHours() * 60 + now.getMinutes()) - (bsH * 60 + bsM);
    if (activeBreakMins < 0) activeBreakMins += 24 * 60;
  }

  let netMins = totalMinutes - breakMins - activeBreakMins;
  if (netMins < 0) netMins = 0;

  const totalSec = Math.floor(netMins * 60);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ClockDisplay({ todayEntry, isClockedIn }: ClockDisplayProps) {
  const [time, setTime] = useState(new Date());
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setElapsed(getNetWorkDisplay(todayEntry, isClockedIn));
    }, 1000);
    setElapsed(getNetWorkDisplay(todayEntry, isClockedIn));
    return () => clearInterval(timer);
  }, [todayEntry, isClockedIn]);

  return (
    <Card className="border-none bg-card/50 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center py-6 sm:py-8 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Timer className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Net Work Time</span>
        </div>
        <p className="font-mono text-4xl sm:text-6xl font-bold tracking-tight text-foreground">
          {elapsed}
        </p>
        <p className="mt-3 text-xs sm:text-sm text-muted-foreground">
          {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          {' · '}
          {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </CardContent>
    </Card>
  );
}

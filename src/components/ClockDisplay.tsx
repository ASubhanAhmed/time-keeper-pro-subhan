import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Timer } from 'lucide-react';
import { TimeEntry, getDayBounds } from '@/types/timeEntry';

interface ClockDisplayProps {
  todayEntry?: TimeEntry;
  isClockedIn: boolean;
}

function getElapsedDisplay(todayEntry: TimeEntry | undefined, isClockedIn: boolean): string {
  if (!todayEntry || todayEntry.sessions.length === 0) return '00:00:00';

  const { earliestIn } = getDayBounds(todayEntry.sessions);
  if (!earliestIn) return '00:00:00';

  const now = new Date();
  const [inH, inM] = earliestIn.split(':').map(Number);
  const startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), inH, inM).getTime();

  // If all sessions are clocked out, use latest clock-out
  const allClockedOut = todayEntry.sessions.every(s => s.clockOut);
  let endMs: number;
  if (allClockedOut && !isClockedIn) {
    const latestOut = todayEntry.sessions
      .map(s => s.clockOut!)
      .reduce((max, t) => (t > max ? t : max));
    const [outH, outM] = latestOut.split(':').map(Number);
    endMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), outH, outM).getTime();
  } else {
    endMs = now.getTime();
  }

  let diffMs = endMs - startMs;
  if (diffMs < 0) diffMs = 0;

  const totalSec = Math.floor(diffMs / 1000);
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
      setElapsed(getElapsedDisplay(todayEntry, isClockedIn));
    }, 1000);
    setElapsed(getElapsedDisplay(todayEntry, isClockedIn));
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

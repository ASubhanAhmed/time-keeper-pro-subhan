import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimeEntry, WorkStatus, getDayBounds, getTotalBreakMinutes } from '@/types/timeEntry';
import { formatTime, calculateSessionsWorkDuration } from '@/lib/timeUtils';
import { Timer, Coffee, Clock, LogIn } from 'lucide-react';

interface StatusCardProps {
  status: WorkStatus;
  todayEntry: TimeEntry | undefined;
}

export function StatusCard({ status, todayEntry }: StatusCardProps) {
  const getStatusBadge = () => {
    if (!status.isClockedIn) {
      return <Badge variant="secondary" className="text-sm">Not Working</Badge>;
    }
    if (status.isOnBreak) {
      return <Badge className="bg-accent text-accent-foreground text-sm">On Break</Badge>;
    }
    return <Badge className="bg-primary text-primary-foreground text-sm">Working</Badge>;
  };

  const { earliestIn, latestOut } = todayEntry 
    ? getDayBounds(todayEntry.sessions) 
    : { earliestIn: null, latestOut: null };

  const totalBreakMinutes = todayEntry ? getTotalBreakMinutes(todayEntry.sessions) : 0;
  const breakDisplay = totalBreakMinutes > 0 
    ? `${Math.floor(totalBreakMinutes / 60)}h ${totalBreakMinutes % 60}m`
    : '--:--';

  return (
    <Card className="border-none bg-card shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Today's Status</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 rounded-lg bg-muted/50 p-2 sm:p-3">
            <LogIn className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Start</p>
              <p className="font-mono text-base sm:text-lg font-semibold truncate">
                {formatTime(earliestIn)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 rounded-lg bg-muted/50 p-2 sm:p-3">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">End</p>
              <p className="font-mono text-base sm:text-lg font-semibold truncate">
                {formatTime(latestOut)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 rounded-lg bg-muted/50 p-2 sm:p-3">
            <Coffee className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Break</p>
              <p className="font-mono text-base sm:text-lg font-semibold truncate">
                {breakDisplay}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 rounded-lg bg-muted/50 p-2 sm:p-3">
            <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Work Time</p>
              <p className="font-mono text-base sm:text-lg font-semibold truncate">
                {todayEntry ? calculateSessionsWorkDuration(todayEntry.sessions) : '--:--'}
              </p>
            </div>
          </div>
        </div>
        {todayEntry && todayEntry.sessions.length > 1 && (
          <p className="text-xs text-muted-foreground text-center">
            {todayEntry.sessions.length} sessions today
          </p>
        )}
      </CardContent>
    </Card>
  );
}

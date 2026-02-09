import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimeEntry, WorkStatus } from '@/types/timeEntry';
import { formatTime, calculateWorkDuration } from '@/lib/timeUtils';
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

  return (
    <Card className="border-none bg-card shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Today's Status</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <LogIn className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Clock In</p>
              <p className="font-mono text-lg font-semibold">
                {formatTime(todayEntry?.clockIn ?? null)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Clock Out</p>
              <p className="font-mono text-lg font-semibold">
                {formatTime(todayEntry?.clockOut ?? null)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Coffee className="h-5 w-5 text-accent-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Break</p>
              <p className="font-mono text-lg font-semibold">
                {todayEntry?.breakStart 
                  ? `${formatTime(todayEntry.breakStart)} - ${formatTime(todayEntry.breakEnd ?? null)}`
                  : '--:--'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Timer className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Work Time</p>
              <p className="font-mono text-lg font-semibold">
                {calculateWorkDuration(
                  todayEntry?.clockIn ?? null,
                  todayEntry?.clockOut ?? null,
                  todayEntry?.breakStart ?? null,
                  todayEntry?.breakEnd ?? null
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

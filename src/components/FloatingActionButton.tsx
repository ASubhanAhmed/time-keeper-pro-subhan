import { memo } from 'react';
import { Clock, Coffee, LogOut as LogOutIcon, CalendarX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkStatus } from '@/types/timeEntry';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface FABProps {
  status: WorkStatus;
  onClockIn: () => void;
  onClockOut: () => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
  onEndDay?: () => void;
}

export const FloatingActionButton = memo(function FloatingActionButton({
  status, onClockIn, onClockOut, onStartBreak, onEndBreak, onEndDay,
}: FABProps) {
  if (!status.isClockedIn) {
    return (
      <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2 sm:hidden">
        <Button size="lg" className="h-14 w-14 rounded-full shadow-xl" onClick={onClockIn}>
          <Clock className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2 sm:hidden">
      {status.isOnBreak ? (
        <Button size="lg" variant="secondary" className="h-12 rounded-full px-5 shadow-xl" onClick={onEndBreak}>
          <Coffee className="mr-2 h-5 w-5" /> End Break
        </Button>
      ) : (
        <Button size="lg" variant="outline" className="h-12 rounded-full px-5 shadow-xl glass" onClick={onStartBreak}>
          <Coffee className="mr-2 h-5 w-5" /> Break
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="lg" variant="destructive" className="h-14 w-14 rounded-full shadow-xl">
            <LogOutIcon className="h-6 w-6" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>End Session or Day?</AlertDialogTitle>
            <AlertDialogDescription>End just this session or the entire day?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onClockOut} className="rounded-xl">End Session</AlertDialogAction>
            {onEndDay && (
              <AlertDialogAction onClick={onEndDay} className="rounded-xl bg-destructive hover:bg-destructive/90">
                <CalendarX className="mr-1 h-4 w-4" /> End Day
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

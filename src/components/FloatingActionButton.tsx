import { memo } from 'react';
import { Clock, Coffee, LogOut as LogOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WorkStatus } from '@/types/timeEntry';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface FABProps {
  status: WorkStatus;
  onClockIn: () => void;
  onClockOut: () => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
}

export const FloatingActionButton = memo(function FloatingActionButton({
  status,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
}: FABProps) {
  if (!status.isClockedIn) {
    return (
      <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2 sm:hidden">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={onClockIn}
        >
          <Clock className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2 sm:hidden">
      {status.isOnBreak ? (
        <Button
          size="lg"
          variant="secondary"
          className="h-12 rounded-full px-5 shadow-lg"
          onClick={onEndBreak}
        >
          <Coffee className="mr-2 h-5 w-5" />
          End Break
        </Button>
      ) : (
        <Button
          size="lg"
          variant="outline"
          className="h-12 rounded-full px-5 shadow-lg bg-card"
          onClick={onStartBreak}
        >
          <Coffee className="mr-2 h-5 w-5" />
          Break
        </Button>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="lg"
            variant="destructive"
            className="h-14 w-14 rounded-full shadow-lg"
          >
            <LogOutIcon className="h-6 w-6" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clock Out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clock out and end your current session?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onClockOut}>Clock Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

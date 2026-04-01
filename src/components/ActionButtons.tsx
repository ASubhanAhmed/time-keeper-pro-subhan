import { Button } from '@/components/ui/button';
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
import { WorkStatus } from '@/types/timeEntry';
import { LogIn, LogOut, Coffee, Play, CalendarX } from 'lucide-react';

interface ActionButtonsProps {
  status: WorkStatus;
  onClockIn: () => void;
  onClockOut: () => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
  onEndDay?: () => void;
}

export function ActionButtons({
  status,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
  onEndDay,
}: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {!status.isClockedIn ? (
        <Button
          onClick={onClockIn}
          size="lg"
          className="col-span-2 h-14 sm:h-16 text-base sm:text-lg font-semibold rounded-2xl shadow-md"
        >
          <LogIn className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
          Clock In
        </Button>
      ) : (
        <>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="lg"
                className="h-14 sm:h-16 text-base sm:text-lg font-semibold rounded-2xl shadow-md"
              >
                <LogOut className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                <span className="hidden xs:inline">Clock Out</span>
                <span className="xs:hidden">Out</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>End Session or Day?</AlertDialogTitle>
                <AlertDialogDescription>
                  Choose whether to end just the current session or end the entire day (close all sessions).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClockOut} className="rounded-xl">
                  <LogOut className="mr-1 h-4 w-4" /> End Session
                </AlertDialogAction>
                {onEndDay && (
                  <AlertDialogAction onClick={onEndDay} className="rounded-xl bg-destructive hover:bg-destructive/90">
                    <CalendarX className="mr-1 h-4 w-4" /> End Day
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {!status.isOnBreak ? (
            <Button
              onClick={onStartBreak}
              variant="secondary"
              size="lg"
              className="h-14 sm:h-16 text-base sm:text-lg font-semibold rounded-2xl shadow-md"
            >
              <Coffee className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
              <span className="hidden xs:inline">Start Break</span>
              <span className="xs:hidden">Break</span>
            </Button>
          ) : (
            <Button
              onClick={onEndBreak}
              variant="outline"
              size="lg"
              className="h-14 sm:h-16 text-base sm:text-lg font-semibold rounded-2xl shadow-md"
            >
              <Play className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
              <span className="hidden xs:inline">End Break</span>
              <span className="xs:hidden">Resume</span>
            </Button>
          )}
        </>
      )}
    </div>
  );
}

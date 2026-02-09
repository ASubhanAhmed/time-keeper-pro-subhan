import { Button } from '@/components/ui/button';
import { WorkStatus } from '@/types/timeEntry';
import { LogIn, LogOut, Coffee, Play } from 'lucide-react';

interface ActionButtonsProps {
  status: WorkStatus;
  onClockIn: () => void;
  onClockOut: () => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
}

export function ActionButtons({
  status,
  onClockIn,
  onClockOut,
  onStartBreak,
  onEndBreak,
}: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {!status.isClockedIn ? (
        <Button 
          onClick={onClockIn} 
          size="lg" 
          className="col-span-2 h-14 sm:h-16 text-base sm:text-lg font-semibold"
        >
          <LogIn className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
          Clock In
        </Button>
      ) : (
        <>
          <Button 
            onClick={onClockOut} 
            variant="destructive" 
            size="lg" 
            className="h-14 sm:h-16 text-base sm:text-lg font-semibold"
          >
            <LogOut className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            <span className="hidden xs:inline">Clock Out</span>
            <span className="xs:hidden">Out</span>
          </Button>
          {!status.isOnBreak ? (
            <Button 
              onClick={onStartBreak} 
              variant="secondary" 
              size="lg" 
              className="h-14 sm:h-16 text-base sm:text-lg font-semibold"
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
              className="h-14 sm:h-16 text-base sm:text-lg font-semibold"
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

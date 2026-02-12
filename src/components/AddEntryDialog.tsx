import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { CalendarIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimeEntry, EntryType, WorkSession } from '@/types/timeEntry';
import { toast } from '@/hooks/use-toast';

interface AddEntryDialogProps {
  onAdd: (entry: Omit<TimeEntry, 'id'>) => void;
}

export function AddEntryDialog({ onAdd }: AddEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [type, setType] = useState<EntryType>('work');
  const [clockIn, setClockIn] = useState('09:00');
  const [clockOut, setClockOut] = useState('17:00');
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');
  const [notes, setNotes] = useState('');

  const generateSessionId = () => Math.random().toString(36).substring(2, 15);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    if (type === 'work') {
      if (clockOut && clockIn && clockOut <= clockIn) {
        toast({ title: 'Invalid times', description: 'Clock out must be after clock in', variant: 'destructive' });
        return;
      }
      if (breakStart && breakEnd && breakEnd <= breakStart) {
        toast({ title: 'Invalid times', description: 'Break end must be after break start', variant: 'destructive' });
        return;
      }
      if (breakStart && !breakEnd) {
        toast({ title: 'Invalid times', description: 'Break end is required when break start is set', variant: 'destructive' });
        return;
      }
      if (breakStart && clockIn && breakStart < clockIn) {
        toast({ title: 'Invalid times', description: 'Break must be within work session', variant: 'destructive' });
        return;
      }
      if (breakEnd && clockOut && breakEnd > clockOut) {
        toast({ title: 'Invalid times', description: 'Break must be within work session', variant: 'destructive' });
        return;
      }
    }

    const sessions: WorkSession[] = type === 'work' ? [{
      id: generateSessionId(),
      clockIn: clockIn,
      clockOut: clockOut,
      breakStart: breakStart || null,
      breakEnd: breakEnd || null,
    }] : [];

    onAdd({
      date: format(date, 'yyyy-MM-dd'),
      type,
      sessions,
      notes,
    });

    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setDate(new Date());
    setType('work');
    setClockIn('09:00');
    setClockOut('17:00');
    setBreakStart('');
    setBreakEnd('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Time Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Work Day</SelectItem>
                <SelectItem value="leave">Leave Day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'work' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Clock In</Label>
                  <Input
                    type="time"
                    value={clockIn}
                    onChange={(e) => setClockIn(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Clock Out</Label>
                  <Input
                    type="time"
                    value={clockOut}
                    onChange={(e) => setClockOut(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Break Start (optional)</Label>
                  <Input
                    type="time"
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Break End</Label>
                  <Input
                    type="time"
                    value={breakEnd}
                    onChange={(e) => setBreakEnd(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Entry</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

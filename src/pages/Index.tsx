import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClockDisplay } from '@/components/ClockDisplay';
import { StatusCard } from '@/components/StatusCard';
import { ActionButtons } from '@/components/ActionButtons';
import { AddEntryDialog } from '@/components/AddEntryDialog';
import { EntriesTable } from '@/components/EntriesTable';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { Clock, Table } from 'lucide-react';

const Index = () => {
  const {
    entries,
    status,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    addEntry,
    updateEntry,
    updateSession,
    deleteEntry,
    deleteSession,
    getTodayEntry,
  } = useTimeEntries();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">TimeTrack</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <div className="flex justify-center mb-6 sm:mb-8">
            <TabsList className="grid w-full max-w-xs sm:max-w-md grid-cols-2">
              <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                <Clock className="h-4 w-4" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                <Table className="h-4 w-4" />
                <span>History</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            <div className="mx-auto max-w-xl space-y-4 sm:space-y-6">
              <ClockDisplay />
              <StatusCard status={status} todayEntry={getTodayEntry()} />
              <ActionButtons
                status={status}
                onClockIn={clockIn}
                onClockOut={clockOut}
                onStartBreak={startBreak}
                onEndBreak={endBreak}
              />
              <div className="flex justify-center">
                <AddEntryDialog onAdd={addEntry} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Time Entries</h2>
              <AddEntryDialog onAdd={addEntry} />
            </div>
            <EntriesTable
              entries={entries}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
              onUpdateSession={updateSession}
              onDeleteSession={deleteSession}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;

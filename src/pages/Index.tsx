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
    deleteEntry,
    getTodayEntry,
  } = useTimeEntries();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Clock className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">TimeTrack</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-8 grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="mx-auto max-w-xl space-y-6">
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

          <TabsContent value="history" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Time Entries</h2>
              <AddEntryDialog onAdd={addEntry} />
            </div>
            <EntriesTable
              entries={entries}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;

import { useState, lazy, Suspense, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClockDisplay } from '@/components/ClockDisplay';
import { StatusCard } from '@/components/StatusCard';
import { ActionButtons } from '@/components/ActionButtons';
import { AddEntryDialog } from '@/components/AddEntryDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { useTimeEntries } from '@/hooks/useTimeEntries';
import { exportEntriesToCSV } from '@/lib/csvExport';
import { Clock, Table, LayoutGrid, Download, LogOut, BarChart3, Search, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';


// Lazy load heavy tab content
const EntriesTable = lazy(() => import('@/components/EntriesTable').then(m => ({ default: m.EntriesTable })));
const KanbanBoard = lazy(() => import('@/components/KanbanBoard').then(m => ({ default: m.KanbanBoard })));
const AnalyticsDashboard = lazy(() => import('@/components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-4 sm:space-y-6">
      <Skeleton className="h-[140px] w-full rounded-xl" />
      <Skeleton className="h-[100px] w-full rounded-xl" />
      <Skeleton className="h-[64px] w-full rounded-xl" />
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[200px] w-full rounded-xl" />
      <Skeleton className="h-[300px] w-full rounded-xl" />
    </div>
  );
}

function WelcomeState({ onClockIn }: { onClockIn: () => void }) {
  return (
    <Card className="border-none bg-card/50 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center py-10 px-6 text-center space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Rocket className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Welcome to TimeTrack!</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Start tracking your work hours by clocking in. Your time entries, analytics, and tasks will appear as you use the app.
        </p>
        <Button size="lg" onClick={onClockIn} className="mt-2">
          <Clock className="mr-2 h-5 w-5" />
          Clock In to Get Started
        </Button>
      </CardContent>
    </Card>
  );
}

const Index = () => {
  const { signOut } = useAuth();
  const {
    entries,
    loading,
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

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  const isNewUser = !loading && entries.length === 0 && !status.isClockedIn;

  // Memoize filtered entries
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(e =>
      e.date.includes(searchQuery) ||
      e.type.toLowerCase().includes(q) ||
      (e.notes && e.notes.toLowerCase().includes(q))
    );
  }, [entries, searchQuery]);

  const handleExportCSV = useCallback(() => exportEntriesToCSV(entries), [entries]);

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
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
              <LogOut className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-6 sm:mb-8">
            <TabsList className="grid w-full max-w-sm sm:max-w-lg grid-cols-4">
              <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Table className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>History</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Tasks</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            {loading ? (
              <DashboardSkeleton />
            ) : isNewUser ? (
              <div className="mx-auto max-w-xl">
                <WelcomeState onClockIn={clockIn} />
              </div>
            ) : (
              <div className="mx-auto max-w-xl space-y-4 sm:space-y-6">
                <ClockDisplay todayEntry={getTodayEntry()} isClockedIn={status.isClockedIn} />
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
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
            <Suspense fallback={<TabSkeleton />}>
              {loading ? <TabSkeleton /> : <AnalyticsDashboard entries={entries} />}
            </Suspense>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Time Entries</h2>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 w-full sm:w-[200px]"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={entries.length === 0}>
                  <Download className="mr-1 h-4 w-4" />
                  CSV
                </Button>
                <AddEntryDialog onAdd={addEntry} />
              </div>
            </div>
            <Suspense fallback={<TabSkeleton />}>
              {loading ? (
                <Skeleton className="h-[300px] w-full rounded-xl" />
              ) : (
                <EntriesTable
                  entries={filteredEntries}
                  onUpdate={updateEntry}
                  onDelete={deleteEntry}
                  onUpdateSession={updateSession}
                  onDeleteSession={deleteSession}
                />
              )}
            </Suspense>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 sm:space-y-6">
            <Suspense fallback={<TabSkeleton />}>
              <KanbanBoard />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
};

export default Index;

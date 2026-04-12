import { useState, lazy, Suspense, useMemo, useCallback, useEffect } from 'react';
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
import { exportEntriesToJSON } from '@/lib/jsonExport';
import { generateMonthlyPDF } from '@/lib/pdfReport';
import { Clock, Table, LayoutGrid, Download, LogOut, BarChart3, Search, Rocket, FileJson, FileText, ChevronDown, Shield } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useWorkRules } from '@/hooks/useWorkRules';
import { toast } from '@/hooks/use-toast';
import { WorkRulesSettings } from '@/components/WorkRulesSettings';
import { ShaderBackground } from '@/components/ShaderBackground';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

const EntriesTable = lazy(() => import('@/components/EntriesTable').then(m => ({ default: m.EntriesTable })));
const KanbanBoard = lazy(() => import('@/components/KanbanBoard').then(m => ({ default: m.KanbanBoard })));
const AnalyticsDashboard = lazy(() => import('@/components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-4 sm:space-y-6">
      <Skeleton className="h-[140px] w-full rounded-2xl" />
      <Skeleton className="h-[100px] w-full rounded-2xl" />
      <Skeleton className="h-[64px] w-full rounded-2xl" />
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[200px] w-full rounded-2xl" />
      <Skeleton className="h-[300px] w-full rounded-2xl" />
    </div>
  );
}

function WelcomeState({ onClockIn }: { onClockIn: () => void }) {
  return (
    <Card className="glass border-none rounded-2xl shadow-lg grain overflow-hidden">
      <CardContent className="relative z-10 flex flex-col items-center py-10 px-6 text-center space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Rocket className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Welcome to TimeTrack!</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Start tracking your work hours by clocking in. Your time entries, analytics, and tasks will appear as you use the app.
        </p>
        <Button size="lg" onClick={onClockIn} className="mt-2 rounded-xl shadow-md">
          <Clock className="mr-2 h-5 w-5" />
          Clock In to Get Started
        </Button>
      </CardContent>
    </Card>
  );
}

const Index = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const {
    entries,
    loading,
    status,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    endDay,
    addEntry,
    updateEntry,
    updateSession,
    deleteEntry,
    deleteSession,
    getTodayEntry,
    checkBreakLimit,
    getTodayNetWorkMinutes,
  } = useTimeEntries();
  const { rules, updateRules } = useWorkRules();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAdmin, loading: isRoleLoading } = useUserRole();

  const isNewUser = !loading && entries.length === 0 && !status.isClockedIn;

  const todayEntry = useMemo(() => getTodayEntry(), [entries, status]);

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
  const handleExportJSON = useCallback(() => exportEntriesToJSON(entries), [entries]);
  const handleExportPDF = useCallback(async () => {
    const now = new Date();
    await generateMonthlyPDF(entries, now.getFullYear(), now.getMonth());
  }, [entries]);

  const handleBulkDelete = useCallback((ids: string[]) => {
    ids.forEach(id => deleteEntry(id));
  }, [deleteEntry]);

  // Break limit warning on start break
  const handleStartBreak = useCallback(() => {
    if (rules.breakLimitEnabled && checkBreakLimit(rules.maxBreakMinutes)) {
      toast({ title: '⚠️ Break Limit Reached', description: `You've already used ${rules.maxBreakMinutes} min of break today.`, variant: 'destructive' });
    }
    startBreak();
  }, [startBreak, rules, checkBreakLimit]);

  // Min work hours warning on clock out
  const handleClockOut = useCallback(() => {
    if (rules.minWorkEnabled) {
      const netMinutes = getTodayNetWorkMinutes();
      const minMinutes = rules.minWorkHours * 60;
      if (netMinutes < minMinutes) {
        const remaining = Math.ceil((minMinutes - netMinutes) / 60 * 10) / 10;
        toast({ title: '⚠️ Below Minimum Hours', description: `You still need ~${remaining}h of net work to meet the ${rules.minWorkHours}h target.`, variant: 'destructive' });
      }
    }
    clockOut();
  }, [clockOut, rules, getTodayNetWorkMinutes]);

  const handleEndDay = useCallback(() => {
    if (rules.minWorkEnabled) {
      const netMinutes = getTodayNetWorkMinutes();
      const minMinutes = rules.minWorkHours * 60;
      if (netMinutes < minMinutes) {
        const remaining = Math.ceil((minMinutes - netMinutes) / 60 * 10) / 10;
        toast({ title: '⚠️ Below Minimum Hours', description: `You still need ~${remaining}h of net work to meet the ${rules.minWorkHours}h target.`, variant: 'destructive' });
      }
    }
    endDay();
  }, [endDay, rules, getTodayNetWorkMinutes]);

  return (
    <div className="min-h-screen premium-gradient grain">
      <ShaderBackground />
      <div className="relative z-10">
        <header className="glass-strong sticky top-0 z-20 border-b border-border/30">
          <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary shadow-md">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">TimeTrack</h1>
            </div>
            <div className="flex items-center gap-1">
              {!isRoleLoading && isAdmin && (
                <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} title="Admin Portal" className="rounded-xl">
                  <Shield className="h-5 w-5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={signOut} title="Sign out" className="rounded-xl">
                <LogOut className="h-5 w-5" />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-6 sm:mb-8">
              <TabsList className="glass rounded-2xl grid w-full max-w-sm sm:max-w-lg grid-cols-4 p-1">
                <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm rounded-xl">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm rounded-xl">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm rounded-xl">
                  <Table className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>History</span>
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm rounded-xl">
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
                  <ClockDisplay todayEntry={todayEntry} isClockedIn={status.isClockedIn} />
                  <StatusCard status={status} todayEntry={todayEntry} />
                  <ActionButtons
                    status={status}
                    onClockIn={clockIn}
                    onClockOut={handleClockOut}
                    onStartBreak={handleStartBreak}
                    onEndBreak={endBreak}
                    onEndDay={handleEndDay}
                  />
                  <WorkRulesSettings rules={rules} onUpdate={updateRules} />
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
                      className="pl-8 h-9 w-full sm:w-[200px] rounded-xl"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={entries.length === 0} className="rounded-xl">
                        <Download className="mr-1 h-4 w-4" />
                        Export
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={handleExportCSV}>
                        <Table className="mr-2 h-4 w-4" />
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportJSON}>
                        <FileJson className="mr-2 h-4 w-4" />
                        Export as JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportPDF}>
                        <FileText className="mr-2 h-4 w-4" />
                        Export as PDF (this month)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AddEntryDialog onAdd={addEntry} />
                </div>
              </div>
              <Suspense fallback={<TabSkeleton />}>
                {loading ? (
                  <Skeleton className="h-[300px] w-full rounded-2xl" />
                ) : (
                  <EntriesTable
                    entries={filteredEntries}
                    onUpdate={updateEntry}
                    onDelete={deleteEntry}
                    onUpdateSession={updateSession}
                    onDeleteSession={deleteSession}
                    onBulkDelete={handleBulkDelete}
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
    </div>
  );
};

export default Index;

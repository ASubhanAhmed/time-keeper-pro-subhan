import { useState, useEffect, useMemo, memo, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock, Calendar, Coffee, TrendingUp, FileDown, Target, Pencil, Check, Award, BarChart3, Hash, Flame } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeEntry } from '@/types/timeEntry';
import { getWeekSummary, getMonthSummary, getWeekDates, getLifetimeSummary, getWorkMinutesLive, getWorkStreak, getHeatmapData } from '@/lib/analyticsUtils';
import { getTotalBreakMinutes } from '@/types/timeEntry';
import { generateMonthlyPDF } from '@/lib/pdfReport';

const PredictionCards = lazy(() => import('@/components/PredictionCards').then(m => ({ default: m.PredictionCards })));

interface AnalyticsDashboardProps {
  entries: TimeEntry[];
}

const chartConfig = {
  hours: { label: 'Hours', color: 'hsl(var(--chart-1))' },
  breakHours: { label: 'Break', color: 'hsl(var(--chart-5))' },
};

const DEFAULT_TARGET_HOURS = 9;

const THEME_COLORS = {
  teal: { r: 157, g: 217, b: 210 },
  gold: { r: 244, g: 208, b: 111 },
  orange: { r: 255, g: 136, b: 17 },
};

function lerpRGB(a: typeof THEME_COLORS.teal, b: typeof THEME_COLORS.teal, t: number) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function getGradientColor(pct: number, opacity: number = 1): string {
  const clamped = Math.min(Math.max(pct, 0), 1.2);
  let color: { r: number; g: number; b: number };
  if (clamped <= 0.5) {
    color = lerpRGB(THEME_COLORS.teal, THEME_COLORS.gold, clamped / 0.5);
  } else {
    color = lerpRGB(THEME_COLORS.gold, THEME_COLORS.orange, (clamped - 0.5) / 0.5);
  }
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
}

const StatCard = memo(function StatCard({ icon: Icon, iconBg, iconColor, label, value }: {
  icon: any; iconBg: string; iconColor: string; label: string; value: string;
}) {
  return (
    <Card className="border-none glass rounded-2xl shadow-md">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: iconBg }}>
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
});

// Lazy load chart components since recharts is heavy
const LazyChartSection = lazy(() => import('@/components/AnalyticsCharts'));

export const AnalyticsDashboard = memo(function AnalyticsDashboard({ entries }: AnalyticsDashboardProps) {
  const [dailyTarget, setDailyTarget] = useState(() => {
    const saved = localStorage.getItem('dailyTargetHours');
    return saved ? parseFloat(saved) : DEFAULT_TARGET_HOURS;
  });
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(() => {
    const saved = localStorage.getItem('dailyTargetHours');
    return saved ?? String(DEFAULT_TARGET_HOURS);
  });
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const summary = useMemo(() => getWeekSummary(entries, weekOffset), [entries, weekOffset]);
  const monthData = useMemo(() => getMonthSummary(entries, monthOffset), [entries, monthOffset]);
  const lifetime = useMemo(() => getLifetimeSummary(entries), [entries]);
  const streak = useMemo(() => getWorkStreak(entries), [entries]);
  const heatmapData = useMemo(() => getHeatmapData(entries, 26), [entries]);

  const now = new Date();
  const [pdfMonth, setPdfMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`);
  const today = now.toISOString().split('T')[0];

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() =>
    `${new Date(weekDates[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(weekDates[6] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    [weekDates]
  );

  const barData = useMemo(() => summary.days.map((d) => {
    const isToday = d.date === today;
    const entry = entries.find(e => e.date === d.date && e.type === 'work');
    const liveMinutes = isToday && entry ? getWorkMinutesLive(entry) : d.totalMinutes;
    const liveBreak = isToday && entry ? getTotalBreakMinutes(entry.sessions) : d.breakMinutes;
    const dayDate = new Date(d.date + 'T00:00:00');
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
    return {
      day: d.dayLabel,
      hours: Math.round(Math.max(0, liveMinutes / 60) * 100) / 100,
      breakHours: Math.round(Math.max(0, liveBreak / 60) * 100) / 100,
      isWeekend,
    };
  }), [summary.days, today, entries, tick]);

  const monthBarData = useMemo(() => monthData.weekSummaries.map(w => ({
    week: w.label,
    hours: Math.max(0, w.totalHours),
  })), [monthData.weekSummaries]);

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({
        value: `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      });
    }
    return opts;
  }, []);

  const handleDownloadPDF = () => {
    const [y, m] = pdfMonth.split('-').map(Number);
    generateMonthlyPDF(entries, y, m);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Suspense fallback={<Skeleton className="h-[120px] w-full rounded-2xl" />}>
        <PredictionCards entries={entries} />
      </Suspense>

      {/* Lifetime Analytics */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">Lifetime Stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Clock} iconBg="rgba(255,136,17,0.12)" iconColor="#FF8811" label="Total Hours" value={`${lifetime.totalHours.toFixed(1)}h`} />
          <StatCard icon={Calendar} iconBg="rgba(157,217,210,0.2)" iconColor="#9DD9D2" label="Days Worked" value={String(lifetime.daysWorked)} />
          <StatCard icon={TrendingUp} iconBg="rgba(244,208,111,0.2)" iconColor="#F4D06F" label="Avg / Day" value={`${lifetime.avgHoursPerDay.toFixed(1)}h`} />
          <StatCard icon={Coffee} iconBg="rgba(255,136,17,0.12)" iconColor="#FF8811" label="Total Break" value={`${Math.floor(lifetime.totalBreakMinutes / 60)}h ${lifetime.totalBreakMinutes % 60}m`} />
          <StatCard icon={Hash} iconBg="rgba(157,217,210,0.2)" iconColor="#9DD9D2" label="Sessions" value={String(lifetime.totalSessions)} />
          <StatCard icon={Award} iconBg="rgba(244,208,111,0.2)" iconColor="#F4D06F" label="Since" value={lifetime.firstDate ? new Date(lifetime.firstDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'} />
        </div>
      </div>

      {/* Work Streak & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4">
        <Card className="border-none glass rounded-2xl shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-6 min-h-[160px]">
            <Flame className="h-8 w-8 mb-2" style={{ color: '#FF8811' }} />
            <p className="text-4xl font-bold text-foreground">{streak}</p>
            <p className="text-sm text-muted-foreground mt-1">Day Streak</p>
            <p className="text-xs text-muted-foreground">(weekdays)</p>
          </CardContent>
        </Card>

        <Card className="border-none glass rounded-2xl shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Activity Heatmap</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="overflow-x-auto" ref={(el) => {
              if (el) requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth; });
            }}>
              <div className="flex gap-[2px] min-w-fit">
                {Array.from({ length: Math.max(...heatmapData.map(d => d.weekIndex), 0) + 1 }, (_, weekIdx) => {
                  const weekDaysData = heatmapData.filter(d => d.weekIndex === weekIdx);
                  return (
                    <div key={weekIdx} className="flex flex-col gap-[2px]">
                      {Array.from({ length: 7 }, (_, dayIdx) => {
                        const day = weekDaysData.find(d => d.dayOfWeek === dayIdx);
                        if (!day) return <div key={dayIdx} className="w-3 h-3" />;
                        const intensity = day.hours === 0 ? 0 : Math.min(1, day.hours / 10);
                        const bg = day.hours === 0 ? 'bg-secondary' : '';
                        const style = day.hours > 0 ? { backgroundColor: getGradientColor(intensity * 1.0) } : undefined;
                        return (
                          <Tooltip key={dayIdx}>
                            <TooltipTrigger asChild>
                              <div className={`w-3 h-3 rounded-[3px] ${bg} transition-colors cursor-default`} style={style} />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs rounded-lg">
                              <p className="font-medium">{day.date}</p>
                              <p>{day.hours > 0 ? `${day.hours.toFixed(1)}h worked` : 'No work'}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <span>Less</span>
                {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
                  <div key={i} className={`w-3 h-3 rounded-[3px] ${v === 0 ? 'bg-secondary' : ''}`} style={v > 0 ? { backgroundColor: getGradientColor(v) } : undefined} />
                ))}
                <span>More</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Weekly Overview</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground min-w-[160px] text-center">{weekLabel}</span>
          <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Clock} iconBg="hsl(var(--primary) / 0.1)" iconColor="hsl(var(--primary))" label="Total Hours" value={`${summary.totalHours.toFixed(1)}h`} />
        <StatCard icon={TrendingUp} iconBg="hsl(var(--primary) / 0.1)" iconColor="hsl(var(--primary))" label="Avg / Day" value={`${summary.avgHoursPerDay.toFixed(1)}h`} />
        <StatCard icon={Calendar} iconBg="hsl(var(--primary) / 0.1)" iconColor="hsl(var(--primary))" label="Days Worked" value={String(summary.daysWorked)} />
        <StatCard icon={Coffee} iconBg="hsl(var(--primary) / 0.1)" iconColor="hsl(var(--primary))" label="Total Break" value={`${Math.floor(summary.totalBreakMinutes / 60)}h ${summary.totalBreakMinutes % 60}m`} />
      </div>

      {/* Daily Target Progress */}
      <Card className="border-none glass rounded-2xl shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span>Daily Target</span>
            {editingTarget ? (
              <div className="flex items-center gap-1 ml-2">
                <Input type="number" min={1} max={24} step={0.5} value={targetInput} onChange={e => setTargetInput(e.target.value)} className="w-20 h-7 text-sm rounded-lg" />
                <span className="text-sm text-muted-foreground">hours</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                  const val = parseFloat(targetInput);
                  if (val > 0 && val <= 24) { setDailyTarget(val); localStorage.setItem('dailyTargetHours', String(val)); }
                  setEditingTarget(false);
                }}>
                  <Check className="h-4 w-4 text-primary" />
                </Button>
              </div>
            ) : (
              <button onClick={() => { setTargetInput(String(dailyTarget)); setEditingTarget(true); }} className="flex items-center gap-1 ml-1 text-sm font-normal text-muted-foreground hover:text-primary transition-colors">
                ({dailyTarget}h) <Pencil className="h-3 w-3" />
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.days.map(d => {
            const isToday = d.date === today;
            const entry = entries.find(e => e.date === d.date && e.type === 'work');
            const liveTotalMinutes = isToday && entry ? getWorkMinutesLive(entry) : d.totalMinutes;
            const liveBreakMinutes = isToday && entry ? getTotalBreakMinutes(entry.sessions) : d.breakMinutes;
            const workHours = Math.max(0, (liveTotalMinutes - liveBreakMinutes) / 60);
            const breakHours = Math.max(0, liveBreakMinutes / 60);
            const totalHours = workHours + breakHours;
            const pct = totalHours / dailyTarget;
            const workPct = Math.min(100, (workHours / dailyTarget) * 100);
            const breakPct = Math.min(100 - workPct, (breakHours / dailyTarget) * 100);
            const workColor = getGradientColor(pct);
            const breakColor = getGradientColor(pct, 0.5);
            const textColor = getGradientColor(pct);
            const dayDate = new Date(d.date + 'T00:00:00');
            const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

            return (
              <div key={d.date} className={`flex items-center gap-3 ${isToday ? 'ring-1 ring-primary/30 rounded-xl p-2 -mx-2' : ''} ${isWeekend ? 'opacity-40' : ''}`}>
                <span className={`text-xs w-10 shrink-0 font-medium ${isToday ? 'text-primary' : isWeekend ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>{d.dayLabel}</span>
                <div className="relative h-3 flex-1 rounded-full bg-secondary overflow-hidden">
                  <div className="absolute inset-y-0 left-0 rounded-l-full transition-all duration-500" style={{ width: `${workPct}%`, backgroundColor: workColor }} />
                  <div className="absolute inset-y-0 rounded-r-full transition-all duration-500" style={{ left: `${workPct}%`, width: `${breakPct}%`, backgroundColor: breakColor }} />
                </div>
                <span className="text-xs w-20 text-right font-medium tabular-nums" style={{ color: totalHours > 0 ? textColor : undefined }}>
                  {totalHours.toFixed(1)} / {dailyTarget}h
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-6 rounded-sm" style={{ background: `linear-gradient(90deg, ${getGradientColor(0)}, ${getGradientColor(0.5)}, ${getGradientColor(1)})` }} />
                Smooth progress gradient
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts - lazy loaded */}
      <Suspense fallback={<Skeleton className="h-[300px] w-full rounded-2xl" />}>
        <LazyChartSection
          barData={barData}
          monthBarData={monthBarData}
          dailyTarget={dailyTarget}
          monthData={monthData}
          monthOffset={monthOffset}
          setMonthOffset={setMonthOffset}
          chartConfig={chartConfig}
          pdfMonth={pdfMonth}
          setPdfMonth={setPdfMonth}
          monthOptions={monthOptions}
          handleDownloadPDF={handleDownloadPDF}
          longestDay={summary.longestDay}
        />
      </Suspense>
    </div>
  );
});

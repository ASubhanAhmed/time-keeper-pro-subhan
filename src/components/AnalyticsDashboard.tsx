import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { ChevronLeft, ChevronRight, Clock, Calendar, Coffee, TrendingUp, FileDown, Target, Pencil, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TimeEntry } from '@/types/timeEntry';
import { getWeekSummary, getMonthSummary, getWeekDates } from '@/lib/analyticsUtils';
import { generateMonthlyPDF } from '@/lib/pdfReport';
import { PredictionCards } from '@/components/PredictionCards';

interface AnalyticsDashboardProps {
  entries: TimeEntry[];
}

const chartConfig = {
  hours: { label: 'Hours', color: 'hsl(var(--chart-1))' },
  breakHours: { label: 'Break', color: 'hsl(var(--chart-5))' },
};

const DEFAULT_TARGET_HOURS = 9;

/** Returns a color that transitions through the project palette: #9DD9D2 (teal) → #F4D06F (gold) → #FF8811 (orange) */
function getGradientColor(pct: number, opacity: number = 1): string {
  const clamped = Math.min(Math.max(pct, 0), 1.2);
  // Interpolate between teal(173,40%,73%) → gold(43,87%,69%) → orange(32,100%,53%)
  let hue: number, sat: number, light: number;
  if (clamped <= 0.5) {
    const t = clamped / 0.5;
    hue = 173 + (43 - 173) * t;   // 173→43
    sat = 40 + (87 - 40) * t;      // 40→87
    light = 73 + (69 - 73) * t;    // 73→69
  } else {
    const t = (clamped - 0.5) / 0.7; // stretch to 1.2
    hue = 43 + (32 - 43) * t;      // 43→32
    sat = 87 + (100 - 87) * t;     // 87→100
    light = 69 + (53 - 69) * t;    // 69→53
  }
  return `hsl(${Math.round(hue)} ${Math.round(sat)}% ${Math.round(light)}% / ${opacity})`;
}

export function AnalyticsDashboard({ entries }: AnalyticsDashboardProps) {
  const [dailyTarget, setDailyTarget] = useState(DEFAULT_TARGET_HOURS);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(DEFAULT_TARGET_HOURS));
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const summary = getWeekSummary(entries, weekOffset);
  const monthData = getMonthSummary(entries, monthOffset);

  // PDF month selector
  const now = new Date();
  const [pdfMonth, setPdfMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`);

  const weekDates = getWeekDates(weekOffset);
  const weekLabel = `${new Date(weekDates[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(weekDates[6] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const barData = summary.days.map(d => ({
    day: d.dayLabel,
    hours: Math.round(Math.max(0, d.totalMinutes / 60) * 100) / 100,
    breakHours: Math.round(Math.max(0, d.breakMinutes / 60) * 100) / 100,
  }));

  const monthBarData = monthData.weekSummaries.map(w => ({
    week: w.label,
    hours: Math.max(0, w.totalHours),
  }));

  // Month options for PDF (last 12 months)
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      value: `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
  }

  const handleDownloadPDF = () => {
    const [y, m] = pdfMonth.split('-').map(Number);
    generateMonthlyPDF(entries, y, m);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Prediction Cards */}
      <PredictionCards entries={entries} />

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Weekly Overview</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground min-w-[160px] text-center">
            {weekLabel}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-none shadow-md">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Hours</p>
              <p className="text-lg font-bold">{summary.totalHours.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg / Day</p>
              <p className="text-lg font-bold">{summary.avgHoursPerDay.toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Days Worked</p>
              <p className="text-lg font-bold">{summary.daysWorked}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Coffee className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Break</p>
              <p className="text-lg font-bold">
                {Math.floor(summary.totalBreakMinutes / 60)}h {summary.totalBreakMinutes % 60}m
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Target Progress */}
      <Card className="border-none shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span>Daily Target</span>
            {editingTarget ? (
              <div className="flex items-center gap-1 ml-2">
                <Input
                  type="number"
                  min={1}
                  max={24}
                  step={0.5}
                  value={targetInput}
                  onChange={e => setTargetInput(e.target.value)}
                  className="w-20 h-7 text-sm"
                />
                <span className="text-sm text-muted-foreground">hours</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const val = parseFloat(targetInput);
                    if (val > 0 && val <= 24) setDailyTarget(val);
                    setEditingTarget(false);
                  }}
                >
                  <Check className="h-4 w-4 text-primary" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => { setTargetInput(String(dailyTarget)); setEditingTarget(true); }}
                className="flex items-center gap-1 ml-1 text-sm font-normal text-muted-foreground hover:text-primary transition-colors"
              >
                ({dailyTarget}h)
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.days.map(d => {
            const workHours = Math.max(0, d.netMinutes / 60);
            const breakHours = Math.max(0, d.breakMinutes / 60);
            const totalHours = workHours + breakHours;
            const pct = totalHours / dailyTarget;
            const workPct = Math.min(100, (workHours / dailyTarget) * 100);
            const breakPct = Math.min(100 - workPct, (breakHours / dailyTarget) * 100);
            const isToday = d.date === new Date().toISOString().split('T')[0];

            const workColor = getGradientColor(pct);
            const breakColor = getGradientColor(pct, 0.5);
            const textColor = getGradientColor(pct);

            return (
              <div key={d.date} className={`flex items-center gap-3 ${isToday ? 'ring-1 ring-primary/30 rounded-lg p-2 -mx-2' : ''}`}>
                <span className={`text-xs w-10 shrink-0 font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {d.dayLabel}
                </span>
                <div className="relative h-3 flex-1 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-l-full transition-all duration-500"
                    style={{ width: `${workPct}%`, backgroundColor: workColor }}
                  />
                  <div
                    className="absolute inset-y-0 rounded-r-full transition-all duration-500"
                    style={{ left: `${workPct}%`, width: `${breakPct}%`, backgroundColor: breakColor }}
                  />
                </div>
                <span
                  className="text-xs w-20 text-right font-medium tabular-nums"
                  style={{ color: totalHours > 0 ? textColor : undefined }}
                >
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

      {/* Weekly Hours Chart */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Daily Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="day" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `${v}h`} domain={[0, 'auto']} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={dailyTarget} stroke="hsl(var(--primary))" strokeDasharray="6 3" strokeOpacity={0.6} label={{ value: `${dailyTarget}h target`, position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="breakHours" fill="var(--color-breakHours)" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Monthly Trend with Navigation */}
      <Card className="border-none shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{monthData.monthLabel}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(m => m - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(m => m + 1)} disabled={monthOffset >= 0}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={monthBarData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="week" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `${v}h`} domain={[0, 'auto']} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* PDF Export */}
      <Card className="border-none shadow-md">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
          <div className="flex items-center gap-2 flex-1">
            <FileDown className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Download Monthly Timesheet</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={pdfMonth} onValueChange={setPdfMonth}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleDownloadPDF} size="sm">
              <FileDown className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Longest Day */}
      {summary.longestDay && (
        <Card className="border-none shadow-md">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Longest day this week</p>
            <p className="text-lg font-bold">
              {summary.longestDay.dayLabel} — {(summary.longestDay.totalMinutes / 60).toFixed(1)}h
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({summary.longestDay.sessions} session{summary.longestDay.sessions !== 1 ? 's' : ''})
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

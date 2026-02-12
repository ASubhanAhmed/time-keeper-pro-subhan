import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, Clock, Calendar, Coffee, TrendingUp } from 'lucide-react';
import { TimeEntry } from '@/types/timeEntry';
import { getWeekSummary, getMonthSummary, getWeekDates } from '@/lib/analyticsUtils';

interface AnalyticsDashboardProps {
  entries: TimeEntry[];
}

const chartConfig = {
  hours: { label: 'Hours', color: 'hsl(var(--chart-1))' },
  breakHours: { label: 'Break', color: 'hsl(var(--chart-5))' },
};

export function AnalyticsDashboard({ entries }: AnalyticsDashboardProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const summary = getWeekSummary(entries, weekOffset);
  const monthData = getMonthSummary(entries);

  const weekDates = getWeekDates(weekOffset);
  const weekLabel = `${new Date(weekDates[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(weekDates[6] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const barData = summary.days.map(d => ({
    day: d.dayLabel,
    hours: Math.round((d.netMinutes / 60) * 100) / 100,
    breakHours: Math.round((d.breakMinutes / 60) * 100) / 100,
  }));

  const monthBarData = monthData.weekSummaries.map(w => ({
    week: w.label,
    hours: w.totalHours,
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Analytics</h2>
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
        <Card className="border-none bg-card shadow-md">
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
        <Card className="border-none bg-card shadow-md">
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
        <Card className="border-none bg-card shadow-md">
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
        <Card className="border-none bg-card shadow-md">
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

      {/* Weekly Hours Chart */}
      <Card className="border-none bg-card shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Daily Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="day" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `${v}h`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="breakHours" fill="var(--color-breakHours)" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card className="border-none bg-card shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Last 4 Weeks</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={monthBarData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="week" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `${v}h`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Longest Day */}
      {summary.longestDay && (
        <Card className="border-none bg-card shadow-md">
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

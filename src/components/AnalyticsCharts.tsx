import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import { ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AnalyticsChartsProps {
  barData: { day: string; hours: number; breakHours: number }[];
  monthBarData: { week: string; hours: number }[];
  dailyTarget: number;
  monthData: { monthLabel: string; weekSummaries: any[] };
  monthOffset: number;
  setMonthOffset: (fn: (m: number) => number) => void;
  chartConfig: any;
  pdfMonth: string;
  setPdfMonth: (v: string) => void;
  monthOptions: { value: string; label: string }[];
  handleDownloadPDF: () => void;
  longestDay?: { dayLabel: string; totalMinutes: number; sessions: number } | null;
}

export default function AnalyticsCharts({
  barData, monthBarData, dailyTarget, monthData, monthOffset, setMonthOffset,
  chartConfig, pdfMonth, setPdfMonth, monthOptions, handleDownloadPDF, longestDay,
}: AnalyticsChartsProps) {
  return (
    <>
      {/* Weekly Hours Chart */}
      <Card className="border-none glass rounded-2xl shadow-md">
        <CardHeader><CardTitle className="text-lg">Daily Hours</CardTitle></CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="day" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `${v}h`} domain={[0, 'auto']} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={dailyTarget} stroke="hsl(var(--primary))" strokeDasharray="6 3" strokeOpacity={0.6} label={{ value: `${dailyTarget}h target`, position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Bar dataKey="hours" fill="var(--color-hours)" radius={[6, 6, 0, 0]} stackId="a" />
              <Bar dataKey="breakHours" fill="var(--color-breakHours)" radius={[6, 6, 0, 0]} stackId="a" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card className="border-none glass rounded-2xl shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{monthData.monthLabel}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setMonthOffset(m => m - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setMonthOffset(m => m + 1)} disabled={monthOffset >= 0}>
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
              <Bar dataKey="hours" fill="var(--color-hours)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* PDF Export */}
      <Card className="border-none glass rounded-2xl shadow-md">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4">
          <div className="flex items-center gap-2 flex-1">
            <FileDown className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Download Monthly Timesheet</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={pdfMonth} onValueChange={setPdfMonth}>
              <SelectTrigger className="w-full sm:w-[200px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {monthOptions.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button onClick={handleDownloadPDF} size="sm" className="rounded-xl">
              <FileDown className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {longestDay && (
        <Card className="border-none glass rounded-2xl shadow-md">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Longest day this week</p>
            <p className="text-lg font-bold">
              {longestDay.dayLabel} — {(longestDay.totalMinutes / 60).toFixed(1)}h
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({longestDay.sessions} session{longestDay.sessions !== 1 ? 's' : ''})
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

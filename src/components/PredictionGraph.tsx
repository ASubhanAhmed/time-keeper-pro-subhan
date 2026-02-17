import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Area, ComposedChart } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { TimeEntry } from '@/types/timeEntry';
import { getForecastTimeSeries, ForecastPoint } from '@/lib/predictions';

const COLORS = {
  orange: '#FF8811',
  cream: '#FFF8F0',
  gold: '#F4D06F',
  teal: '#9DD9D2',
};

type MetricKey = 'office' | 'break' | 'departure';

const METRIC_CONFIG: Record<MetricKey, { label: string; unit: string; dataKey: string; upperKey: string; lowerKey: string; formatter: (v: number) => string }> = {
  office: {
    label: 'Total Time in Office',
    unit: 'h',
    dataKey: 'officeValue',
    upperKey: 'officeUpper',
    lowerKey: 'officeLower',
    formatter: (v) => `${v.toFixed(1)}h`,
  },
  break: {
    label: 'Break Time',
    unit: 'm',
    dataKey: 'breakValue',
    upperKey: 'breakUpper',
    lowerKey: 'breakLower',
    formatter: (v) => `${Math.round(v)}m`,
  },
  departure: {
    label: 'Departure Time',
    unit: '',
    dataKey: 'departureValue',
    upperKey: 'departureUpper',
    lowerKey: 'departureLower',
    formatter: (v) => {
      const h = Math.floor(v / 60) % 24;
      const m = Math.round(v % 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },
  },
};

function buildChartData(points: ForecastPoint[], metric: MetricKey) {
  return points.map(p => {
    let value: number | null = null;
    let upper: number | null = null;
    let lower: number | null = null;

    if (metric === 'office') {
      value = p.totalOfficeHours;
      if (p.isForecast && p.varianceOffice != null && value != null) {
        upper = value + p.varianceOffice;
        lower = Math.max(0, value - p.varianceOffice);
      }
    } else if (metric === 'break') {
      value = p.breakMinutes;
      if (p.isForecast && p.varianceBreak != null && value != null) {
        upper = value + p.varianceBreak;
        lower = Math.max(0, value - p.varianceBreak);
      }
    } else {
      value = p.departureMinutes;
      if (p.isForecast && p.varianceDeparture != null && value != null) {
        upper = value + p.varianceDeparture;
        lower = Math.max(0, value - p.varianceDeparture);
      }
    }

    return {
      date: p.label,
      fullDate: p.date,
      isForecast: p.isForecast,
      actualValue: !p.isForecast ? value : null,
      forecastValue: p.isForecast ? value : null,
      // For the connecting point: last actual + first forecast share a value
      bridgeValue: value,
      upper,
      lower,
      range: upper != null && lower != null ? [lower, upper] : null,
    };
  });
}

interface PredictionGraphProps {
  entries: TimeEntry[];
}

export function PredictionGraph({ entries }: PredictionGraphProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('office');
  const config = METRIC_CONFIG[activeMetric];
  const points = getForecastTimeSeries(entries, 7);
  const chartData = buildChartData(points, activeMetric);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLabel = chartData.find(d => d.fullDate === todayStr)?.date;

  const chartConfig = {
    actualValue: { label: 'Actual', color: COLORS.orange },
    forecastValue: { label: 'Forecast', color: COLORS.teal },
  };

  return (
    <Card className="border-none shadow-md">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" style={{ color: COLORS.orange }} />
            <span>Forecast</span>
          </CardTitle>
          <div className="flex gap-1 flex-wrap">
            {(Object.keys(METRIC_CONFIG) as MetricKey[]).map(key => (
              <Button
                key={key}
                variant={activeMetric === key ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 px-2.5"
                style={activeMetric === key ? { backgroundColor: COLORS.orange, borderColor: COLORS.orange } : {}}
                onClick={() => setActiveMetric(key)}
              >
                {METRIC_CONFIG[key].label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="date"
              className="text-xs"
              interval="preserveStartEnd"
              tick={{ fontSize: 10 }}
            />
            <YAxis
              className="text-xs"
              tickFormatter={config.formatter}
              domain={['auto', 'auto']}
              tick={{ fontSize: 10 }}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value) => config.formatter(Number(value))} />}
            />

            {/* Variance band (area) for forecast */}
            <Area
              dataKey="upper"
              stroke="none"
              fill={COLORS.teal}
              fillOpacity={0.15}
              connectNulls={false}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              dataKey="lower"
              stroke="none"
              fill={COLORS.cream}
              fillOpacity={1}
              connectNulls={false}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />

            {/* Actual data line */}
            <Line
              dataKey="actualValue"
              stroke={COLORS.orange}
              strokeWidth={2.5}
              dot={{ fill: COLORS.orange, r: 3 }}
              connectNulls
              activeDot={{ r: 5, fill: COLORS.orange }}
            />

            {/* Forecast line (dashed) */}
            <Line
              dataKey="forecastValue"
              stroke={COLORS.teal}
              strokeWidth={2.5}
              strokeDasharray="6 3"
              dot={{ fill: COLORS.teal, r: 3 }}
              connectNulls
              activeDot={{ r: 5, fill: COLORS.teal }}
            />

            {/* Today vertical line */}
            {todayLabel && (
              <ReferenceLine
                x={todayLabel}
                stroke={COLORS.gold}
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: 'Today',
                  position: 'top',
                  fontSize: 11,
                  fill: COLORS.gold,
                  fontWeight: 600,
                }}
              />
            )}
          </ComposedChart>
        </ChartContainer>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded" style={{ backgroundColor: COLORS.orange }} />
            Actual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded border-b-2 border-dashed" style={{ borderColor: COLORS.teal }} />
            Forecast
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-5 rounded-sm" style={{ backgroundColor: COLORS.teal, opacity: 0.15 }} />
            Variance
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-4 w-0.5 rounded" style={{ backgroundColor: COLORS.gold }} />
            Today
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

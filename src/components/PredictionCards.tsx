import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimeEntry } from '@/types/timeEntry';
import { getPredictions, DayPrediction } from '@/lib/predictions';
import { Clock, Coffee, LogOut, Brain, TrendingUp } from 'lucide-react';

interface PredictionCardsProps {
  entries: TimeEntry[];
}

function PredictionCard({ prediction }: { prediction: DayPrediction }) {
  const workHours = prediction.isActual ? prediction.actualWorkHours : prediction.predictedWorkHours;
  const breakMin = prediction.isActual ? prediction.actualBreakMinutes : prediction.predictedBreakMinutes;
  const departure = prediction.isActual ? prediction.actualDeparture : prediction.predictedDeparture;
  const isToday = prediction.label === 'Today';

  return (
    <Card className={`border-none shadow-md ${isToday ? 'ring-1 ring-primary/40' : ''}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{prediction.label}</span>
          <Badge variant={prediction.isActual ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
            {prediction.isActual ? 'Actual' : (
              <span className="flex items-center gap-0.5">
                <Brain className="h-2.5 w-2.5" />
                Predicted
              </span>
            )}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Clock className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Work</p>
              <p className="text-sm font-bold tabular-nums">{workHours?.toFixed(1) ?? '--'}h</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Coffee className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Break</p>
              <p className="text-sm font-bold tabular-nums">{breakMin ?? '--'}m</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <LogOut className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Departure</p>
              <p className="text-sm font-bold font-mono tabular-nums">{departure ?? '--:--'}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PredictionCards({ entries }: PredictionCardsProps) {
  const predictions = getPredictions(entries);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Predictions</h3>
        <span className="text-xs text-muted-foreground">(EWMA Model)</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {predictions.map(p => (
          <PredictionCard key={p.label} prediction={p} />
        ))}
      </div>
    </div>
  );
}

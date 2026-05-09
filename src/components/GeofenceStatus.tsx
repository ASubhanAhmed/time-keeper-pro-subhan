import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Crosshair, MapPin, Radar, Timer } from 'lucide-react';
import type { useGeofence } from '@/hooks/useGeofence';
import { useEffect, useState } from 'react';

interface Props {
  g: ReturnType<typeof useGeofence>;
  isClockedIn: boolean;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function GeofenceStatus({ g, isClockedIn }: Props) {
  const [, force] = useState(0);
  // Refresh "x seconds ago" every 5s
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const hasLocation = g.settings.lat != null && g.settings.lng != null;
  const fmtDist = (d: number | null) =>
    d == null ? '—' : d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(2)} km`;

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Radar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Geofence Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Service</span>
          <Badge variant={g.settings.enabled ? 'default' : 'secondary'}>
            {g.settings.enabled ? (g.settings.auto ? 'Active · Auto' : 'Active · Suggest') : 'Disabled'}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Permission</span>
          <Badge variant={g.permission === 'granted' ? 'default' : g.permission === 'denied' ? 'destructive' : 'secondary'} className="capitalize">
            {g.permission}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Current zone</span>
          <Badge variant={g.currentZone === 'inside' ? 'default' : 'secondary'} className="capitalize">
            {g.currentZone}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Work location
          </span>
          <span className="text-xs font-medium">
            {hasLocation ? `${g.settings.label} · ${g.settings.radius_m}m` : 'Not set'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5" /> Distance to work
          </span>
          <span className="text-xs font-medium">{fmtDist(g.lastDistance)}</span>
        </div>

        <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Last reading
            </span>
            <span className="font-medium">
              {g.lastPosition ? timeAgo(g.lastPosition.timestamp) : 'Waiting…'}
            </span>
          </div>
          {g.lastPosition && (
            <>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Coords</span>
                <span className="font-mono">
                  {g.lastPosition.lat.toFixed(5)}, {g.lastPosition.lng.toFixed(5)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Accuracy</span>
                <span>± {Math.round(g.lastPosition.accuracy)} m</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5" /> Last transition
          </span>
          <span className="text-xs font-medium capitalize">
            {g.lastTransition
              ? `${g.lastTransition.zone} · ${timeAgo(g.lastTransition.at)}`
              : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Clock state</span>
          <Badge variant={isClockedIn ? 'default' : 'secondary'}>
            {isClockedIn ? 'Clocked in' : 'Clocked out'}
          </Badge>
        </div>

        {g.settings.auto && (
          <p className="text-[11px] text-muted-foreground leading-snug pt-1 border-t border-border/40">
            Auto mode is on. The app clocks you in when you enter the radius and ends the day when you leave. You can edit any entry from History.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

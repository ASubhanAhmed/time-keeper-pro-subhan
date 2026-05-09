import { MapPin, Navigation, ShieldAlert, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import type { useGeofence } from '@/hooks/useGeofence';

interface Props {
  g: ReturnType<typeof useGeofence>;
}

export function GeofenceSettings({ g }: Props) {
  const [capturing, setCapturing] = useState(false);

  const hasLocation = g.settings.lat != null && g.settings.lng != null;

  const handleCapture = async () => {
    setCapturing(true);
    if (g.permission !== 'granted') await g.requestPermission();
    await g.captureCurrentLocation();
    setCapturing(false);
  };

  const handleToggle = async (v: boolean) => {
    if (v && g.permission !== 'granted') {
      const ok = await g.requestPermission();
      if (!ok) return;
    }
    g.setEnabled(v);
  };

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Geofence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Location-based suggestions</p>
            <p className="text-xs text-muted-foreground">
              Detect arrival at / departure from work
            </p>
          </div>
          <Switch checked={g.settings.enabled} onCheckedChange={handleToggle} disabled={g.loading} />
        </div>

        {g.settings.enabled && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/30 p-2.5">
            <div className="min-w-0 flex items-start gap-2">
              <Zap className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Auto clock in / out</p>
                <p className="text-xs text-muted-foreground">
                  Skip the prompt and act automatically. You can always edit entries.
                </p>
              </div>
            </div>
            <Switch checked={g.settings.auto} onCheckedChange={g.setAuto} />
          </div>
        )}

        {g.permission === 'denied' && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs">
            <ShieldAlert className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
            <span>Location permission denied. Enable it in your browser/system settings.</span>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs">Work location label</Label>
          <Input
            value={g.settings.label}
            onChange={(e) => g.setLabel(e.target.value || 'Office')}
            className="h-9"
            placeholder="Office"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {hasLocation ? (
              <span>
                Saved: {g.settings.lat!.toFixed(5)}, {g.settings.lng!.toFixed(5)}
              </span>
            ) : (
              <span>No location saved yet</span>
            )}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCapture}
            disabled={capturing}
            className="gap-1.5"
          >
            <Navigation className="w-3.5 h-3.5" />
            {capturing ? 'Getting…' : hasLocation ? 'Update to current' : 'Use current location'}
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Radius</Label>
            <span className="text-xs font-medium">{g.settings.radius_m} m</span>
          </div>
          <Slider
            min={50}
            max={500}
            step={10}
            value={[g.settings.radius_m]}
            onValueChange={([v]) => g.setRadius(v)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Debounce readings</Label>
            <span className="text-xs font-medium">{g.settings.debounce_count}</span>
          </div>
          <Slider
            min={1}
            max={5}
            step={1}
            value={[g.settings.debounce_count]}
            onValueChange={([v]) => g.setDebounce(v)}
          />
          <p className="text-[11px] text-muted-foreground leading-snug">
            How many consecutive GPS readings in the new zone are required before acting. Higher = fewer false triggers, lower = faster reaction.
          </p>
        </div>

        {g.settings.enabled && hasLocation && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
            <span className="text-muted-foreground">Status</span>
            <div className="flex items-center gap-2">
              {g.lastDistance != null && (
                <span className="text-muted-foreground">
                  {g.lastDistance < 1000 ? `${Math.round(g.lastDistance)} m` : `${(g.lastDistance / 1000).toFixed(2)} km`}
                </span>
              )}
              <Badge variant={g.currentZone === 'inside' ? 'default' : 'secondary'} className="capitalize">
                {g.currentZone}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

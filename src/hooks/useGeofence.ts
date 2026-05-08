import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GeofenceSettings {
  enabled: boolean;
  lat: number | null;
  lng: number | null;
  radius_m: number;
  label: string;
  last_zone_state: 'inside' | 'outside' | 'unknown';
}

const DEFAULT: GeofenceSettings = {
  enabled: false,
  lat: null,
  lng: null,
  radius_m: 100,
  label: 'Office',
  last_zone_state: 'unknown',
};

// Haversine — meters between two lat/lng points
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

interface Actions {
  isClockedIn: boolean;
  onSuggestClockIn: () => void;
  onSuggestEndDay: () => void;
}

export function useGeofence(actions: Actions) {
  const [settings, setSettings] = useState<GeofenceSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [currentZone, setCurrentZone] = useState<'inside' | 'outside' | 'unknown'>('unknown');
  const [lastDistance, setLastDistance] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const pendingZoneRef = useRef<{ zone: 'inside' | 'outside'; count: number } | null>(null);
  const userIdRef = useRef<string | null>(null);
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Load settings
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }
      userIdRef.current = user.id;
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setSettings({
          enabled: data.geofence_enabled,
          lat: data.geofence_lat,
          lng: data.geofence_lng,
          radius_m: data.geofence_radius_m,
          label: data.geofence_label,
          last_zone_state: (data.last_zone_state as any) || 'unknown',
        });
        setCurrentZone((data.last_zone_state as any) || 'unknown');
      }
      setLoading(false);
      // Probe permission state
      if ('permissions' in navigator) {
        try {
          const p = await (navigator as any).permissions.query({ name: 'geolocation' });
          setPermission(p.state);
          p.onchange = () => setPermission(p.state);
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (next: Partial<GeofenceSettings>) => {
    const userId = userIdRef.current;
    if (!userId) return;
    const merged = { ...settings, ...next };
    setSettings(merged);
    await supabase.from('user_settings').upsert({
      user_id: userId,
      geofence_enabled: merged.enabled,
      geofence_lat: merged.lat,
      geofence_lng: merged.lng,
      geofence_radius_m: merged.radius_m,
      geofence_label: merged.label,
      last_zone_state: merged.last_zone_state,
    }, { onConflict: 'user_id' });
  }, [settings]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) { resolve(false); return; }
      navigator.geolocation.getCurrentPosition(
        () => { setPermission('granted'); resolve(true); },
        (err) => {
          setPermission(err.code === err.PERMISSION_DENIED ? 'denied' : 'prompt');
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const captureCurrentLocation = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        toast.error('Geolocation not supported on this device');
        resolve(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await persist({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            last_zone_state: 'inside',
          });
          setCurrentZone('inside');
          toast.success('Work location saved');
          resolve(true);
        },
        (err) => {
          toast.error(err.code === err.PERMISSION_DENIED
            ? 'Location permission denied'
            : 'Could not get current location');
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  }, [persist]);

  // Watch position when enabled + configured
  useEffect(() => {
    if (!settings.enabled || settings.lat == null || settings.lng == null) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    if (!('geolocation' in navigator)) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const dist = distanceMeters(
          pos.coords.latitude, pos.coords.longitude,
          settings.lat!, settings.lng!,
        );
        setLastDistance(dist);
        const newZone: 'inside' | 'outside' = dist <= settings.radius_m ? 'inside' : 'outside';

        // Debounce: require 2 consecutive readings
        if (pendingZoneRef.current?.zone === newZone) {
          pendingZoneRef.current.count += 1;
        } else {
          pendingZoneRef.current = { zone: newZone, count: 1 };
        }
        if (pendingZoneRef.current.count < 2) return;

        if (newZone !== currentZone) {
          setCurrentZone(newZone);
          persist({ last_zone_state: newZone });

          // Fire suggestion only on transition
          if (newZone === 'inside' && !actionsRef.current.isClockedIn) {
            toast(`You're at ${settings.label}`, {
              description: 'Clock in?',
              duration: 15000,
              action: {
                label: 'Clock In',
                onClick: () => actionsRef.current.onSuggestClockIn(),
              },
            });
          } else if (newZone === 'outside' && actionsRef.current.isClockedIn) {
            toast(`You left ${settings.label}`, {
              description: 'End the day?',
              duration: 15000,
              action: {
                label: 'End Day',
                onClick: () => actionsRef.current.onSuggestEndDay(),
              },
            });
          }
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermission('denied');
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 60000 }
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [settings.enabled, settings.lat, settings.lng, settings.radius_m, settings.label, currentZone, persist]);

  return {
    settings,
    loading,
    permission,
    currentZone,
    lastDistance,
    setEnabled: (v: boolean) => persist({ enabled: v }),
    setRadius: (v: number) => persist({ radius_m: v }),
    setLabel: (v: string) => persist({ label: v }),
    captureCurrentLocation,
    requestPermission,
  };
}

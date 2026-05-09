import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Geolocation as CapGeo } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface GeofenceSettings {
  enabled: boolean;
  auto: boolean;
  debounce_count: number;
  lat: number | null;
  lng: number | null;
  radius_m: number;
  label: string;
  last_zone_state: 'inside' | 'outside' | 'unknown';
}

const DEFAULT: GeofenceSettings = {
  enabled: false,
  auto: false,
  debounce_count: 2,
  lat: null,
  lng: null,
  radius_m: 100,
  label: 'Office',
  last_zone_state: 'unknown',
};

const IS_NATIVE = Capacitor.isNativePlatform();

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

// ── Unified geolocation wrappers: Capacitor native → browser fallback ──

function nativeGetCurrentPosition(opts: {
  enableHighAccuracy?: boolean;
  timeout?: number;
}): Promise<GeolocationPosition> {
  if (IS_NATIVE) {
    return CapGeo.getCurrentPosition({
      enableHighAccuracy: opts.enableHighAccuracy ?? true,
      timeout: opts.timeout ?? 10000,
    }).then((res) => ({
      coords: {
        latitude: res.coords.latitude,
        longitude: res.coords.longitude,
        accuracy: res.coords.accuracy,
        altitude: res.coords.altitude ?? null,
        altitudeAccuracy: res.coords.altitudeAccuracy ?? null,
        heading: res.coords.heading ?? null,
        speed: res.coords.speed ?? null,
      } as GeolocationCoordinates,
      timestamp: Date.now(),
    } as GeolocationPosition));
  }
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('No geolocation')); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: opts.enableHighAccuracy ?? true,
      timeout: opts.timeout ?? 10000,
    });
  });
}

function nativeWatchPosition(
  onSuccess: (pos: GeolocationPosition) => void,
  onError: (err: GeolocationPositionError) => void,
  opts: { enableHighAccuracy?: boolean; maximumAge?: number; timeout?: number }
): string | number {
  if (IS_NATIVE) {
    CapGeo.watchPosition(
      {
        enableHighAccuracy: opts.enableHighAccuracy ?? true,
        maximumAge: opts.maximumAge ?? 30000,
        timeout: opts.timeout ?? 60000,
      },
      (loc, err) => {
        if (err) {
          const fakeErr = { code: err.code ?? 1, message: err.message, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError;
          onError(fakeErr);
          return;
        }
        if (!loc) return;
        onSuccess({
          coords: {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            altitude: loc.coords.altitude ?? null,
            altitudeAccuracy: loc.coords.altitudeAccuracy ?? null,
            heading: loc.coords.heading ?? null,
            speed: loc.coords.speed ?? null,
          } as GeolocationCoordinates,
          timestamp: Date.now(),
        } as GeolocationPosition);
      }
    ).then((id) => {
      // Capacitor watch returns the callbackId via promise; we can't return it synchronously.
      // We handle this via the ref storage in the effect below.
    });
    return 'capacitor-watch';
  }
  if (!('geolocation' in navigator)) return -1;
  return navigator.geolocation.watchPosition(onSuccess, onError, {
    enableHighAccuracy: opts.enableHighAccuracy ?? true,
    maximumAge: opts.maximumAge ?? 30000,
    timeout: opts.timeout ?? 60000,
  });
}

function nativeClearWatch(id: string | number | null) {
  if (id == null) return;
  if (IS_NATIVE && id === 'capacitor-watch') {
    // We need the actual callbackId stored separately; handled in the effect.
    return;
  }
  if (typeof id === 'number' && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(id);
  }
}

async function nativeRequestPermission(): Promise<boolean> {
  if (IS_NATIVE) {
    try {
      const perms = await CapGeo.requestPermissions();
      return perms.location === 'granted';
    } catch {
      return false;
    }
  }
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) { resolve(false); return; }
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// ── Hook ──

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
  const watchIdRef = useRef<string | number | null>(null);
  const capWatchIdRef = useRef<string | null>(null); // actual Capacitor callbackId
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
          auto: (data as any).geofence_auto ?? false,
          debounce_count: (data as any).geofence_debounce_count ?? 2,
          lat: data.geofence_lat,
          lng: data.geofence_lng,
          radius_m: data.geofence_radius_m,
          label: data.geofence_label,
          last_zone_state: (data.last_zone_state as any) || 'unknown',
        });
        setCurrentZone((data.last_zone_state as any) || 'unknown');
      }
      setLoading(false);
      // Probe permission state (browser only)
      if (!IS_NATIVE && 'permissions' in navigator) {
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
      geofence_auto: merged.auto,
      geofence_debounce_count: merged.debounce_count,
      geofence_lat: merged.lat,
      geofence_lng: merged.lng,
      geofence_radius_m: merged.radius_m,
      geofence_label: merged.label,
      last_zone_state: merged.last_zone_state,
    } as any, { onConflict: 'user_id' });
  }, [settings]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const ok = await nativeRequestPermission();
    setPermission(ok ? 'granted' : 'denied');
    return ok;
  }, []);

  const captureCurrentLocation = useCallback(async (): Promise<boolean> => {
    try {
      const pos = await nativeGetCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
      await persist({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        last_zone_state: 'inside',
      });
      setCurrentZone('inside');
      toast.success('Work location saved');
      return true;
    } catch (err: any) {
      toast.error(
        err?.code === 1 || err?.message?.includes('denied')
          ? 'Location permission denied'
          : 'Could not get current location'
      );
      return false;
    }
  }, [persist]);

  // Watch position when enabled + configured
  useEffect(() => {
    if (!settings.enabled || settings.lat == null || settings.lng == null) {
      nativeClearWatch(watchIdRef.current);
      if (capWatchIdRef.current && IS_NATIVE) {
        CapGeo.clearWatch({ id: capWatchIdRef.current }).catch(() => {});
        capWatchIdRef.current = null;
      }
      watchIdRef.current = null;
      return;
    }

    const handlePos = (pos: GeolocationPosition) => {
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
    };

    const handleErr = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) setPermission('denied');
    };

    if (IS_NATIVE) {
      CapGeo.watchPosition(
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 60000,
        },
        (loc, err) => {
          if (err) {
            const fakeErr = { code: err.code ?? 1, message: err.message, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError;
            handleErr(fakeErr);
            return;
          }
          if (!loc) return;
          handlePos({
            coords: {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
              altitude: loc.coords.altitude ?? null,
              altitudeAccuracy: loc.coords.altitudeAccuracy ?? null,
              heading: loc.coords.heading ?? null,
              speed: loc.coords.speed ?? null,
            } as GeolocationCoordinates,
            timestamp: Date.now(),
          } as GeolocationPosition);
        }
      ).then((id) => {
        capWatchIdRef.current = id;
        watchIdRef.current = 'capacitor-watch';
      });
    } else {
      const id = nativeWatchPosition(handlePos, handleErr, {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 60000,
      });
      watchIdRef.current = id;
    }

    return () => {
      nativeClearWatch(watchIdRef.current);
      if (capWatchIdRef.current && IS_NATIVE) {
        CapGeo.clearWatch({ id: capWatchIdRef.current }).catch(() => {});
        capWatchIdRef.current = null;
      }
      watchIdRef.current = null;
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

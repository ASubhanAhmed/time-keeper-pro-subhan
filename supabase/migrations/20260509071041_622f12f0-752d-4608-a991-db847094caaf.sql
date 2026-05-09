ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS geofence_auto boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geofence_debounce_count integer NOT NULL DEFAULT 2;
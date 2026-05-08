## Geofence Suggestions — Implementation Plan

Add an opt-in feature that detects when the user enters/leaves their work location and **suggests** clocking in or ending the day. No automatic actions — user always confirms.

### 1. Database — new `user_settings` table

Per-user settings (one row per user, RLS by `user_id`):
- `geofence_enabled` (bool, default false)
- `geofence_lat`, `geofence_lng` (numeric)
- `geofence_radius_m` (int, default 100)
- `geofence_label` (text, e.g. "Office")
- `last_zone_state` (text: `inside` | `outside` | `unknown`) — prevents duplicate prompts

### 2. Settings UI — new section in main app

Add a "Location & Geofence" card (in Index page or a settings dialog):
- Toggle: **Enable location-based suggestions**
- Button: **Use current location as work** (one tap, captures lat/lng)
- Slider: **Radius** (50–500m, default 100m)
- Status row: shows saved location label + "Currently: inside / outside / unknown"
- Permission state with a "Grant location" button if denied

### 3. Geofence hook — `useGeofence.ts`

- On mount (if enabled): start `Geolocation.watchPosition` (Capacitor plugin on native, browser API as fallback)
- On every position update:
  - Compute distance (Haversine) to saved point
  - Determine new zone: `inside` if distance ≤ radius, else `outside`
  - **Only fire suggestion on transition** (outside→inside or inside→outside)
  - Persist `last_zone_state` to DB so transitions survive app restarts
- Debounce: require 2 consecutive readings in the new zone before firing (kills GPS jitter)

### 4. Suggestion UX

- **Enter work zone** → toast with action: *"You're at Office. Clock in?"* → buttons: **Clock In** / **Dismiss**
- **Leave work zone (while clocked in)** → toast: *"You left Office. End the day?"* → buttons: **End Day** / **Dismiss**
- Suggestions never trigger if user is already in the matching state
- Tie into existing `clockIn()` and `endDay()` from `useTimeEntries`

### 5. Capacitor — native shell for background tracking

Install and configure:
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
- `@capacitor/geolocation` (foreground + permission API)
- `@capacitor/local-notifications` (so suggestions fire when app is backgrounded)
- For true background tracking when the app is closed: `@capacitor-community/background-geolocation` (community plugin, requires extra iOS/Android permission setup)

`capacitor.config.ts`:
- `appId: app.lovable.d0985ab44a1e42c59a27eb9b1ae7e82b`
- `appName: time-keeper-pro-subhan`
- Hot-reload `server.url` pointing at the sandbox preview

### 6. Permissions wiring

- iOS `Info.plist`: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`
- Android `AndroidManifest.xml`: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `POST_NOTIFICATIONS`
- Settings UI requests permission on first toggle-on, with a clear rationale dialog explaining background use

### 7. User instructions (after install)

After Capacitor is added, the user will need (one-time, on their own machine):
1. Export to GitHub → `git pull`
2. `npm install`
3. `npx cap add ios` and/or `npx cap add android`
4. `npm run build && npx cap sync`
5. `npx cap run ios` (needs Mac + Xcode) or `npx cap run android` (Android Studio)
6. Publish to App Store / Play Store for the final release with background entitlements

### Technical notes

- All geofence math is client-side (Haversine) — no maps API key required.
- The web build still works: it uses `navigator.geolocation` and only fires while the tab is open. Native build adds the background capability.
- `last_zone_state` persisted to DB makes transitions reliable across reloads, device restarts, and the foreground/background transition.
- No floating UI elements (per project rules) — settings live in a card, suggestions use the existing toast system with action buttons.

### Files to create/edit

- **migration**: create `user_settings` table + RLS
- **new**: `src/hooks/useGeofence.ts`
- **new**: `src/components/GeofenceSettings.tsx`
- **new**: `capacitor.config.ts`
- **edit**: `src/pages/Index.tsx` — mount `useGeofence`, render settings card
- **edit**: `package.json` — Capacitor + plugin deps
- **edit**: `index.html` — meta viewport already fine; add safe-area styles if needed

Approve and I'll execute steps 1–6 (and give you the copy-paste commands for step 7).
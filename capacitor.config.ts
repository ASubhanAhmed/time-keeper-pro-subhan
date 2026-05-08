import type { CapacitorConfig } from '@capacitor/cli';

// This config supports BOTH webapp and Capacitor Android/iOS builds.
//
// For webapp (priority): no action needed — Capacitor is invisible to the web build.
//
// For native development with hot-reload:
//   Uncomment `server.url` below so the app loads from the sandbox preview.
//   Run: npm run build && npx cap sync
//
// For production APK / App Store release:
//   Comment OUT `server.url` so the app bundles the local `dist/` assets.
//   Run: npm run build && npx cap sync

const config: CapacitorConfig = {
  appId: 'app.lovable.d0985ab44a1e42c59a27eb9b1ae7e82b',
  appName: 'time-keeper-pro-subhan',
  webDir: 'dist',
  // server: {
  //   url: 'https://d0985ab4-4a1e-42c5-9a27-eb9b1ae7e82b.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  plugins: {
    Geolocation: {},
  },
};

export default config;

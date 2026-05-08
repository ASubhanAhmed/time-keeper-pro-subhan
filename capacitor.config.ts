import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d0985ab44a1e42c59a27eb9b1ae7e82b',
  appName: 'time-keeper-pro-subhan',
  webDir: 'dist',
  server: {
    url: 'https://d0985ab4-4a1e-42c5-9a27-eb9b1ae7e82b.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    Geolocation: {
      // iOS prompts use these descriptions (also set in Info.plist)
    },
  },
};

export default config;

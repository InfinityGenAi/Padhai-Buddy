import { CapacitorConfig } from '@capacitor/cli';

const isProduction = process.env.NODE_ENV === 'production';
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

function getServerUrl(): string {
  const url = process.env.CAPACITOR_SERVER_URL;
  
  if (isCapacitorBuild) {
    // Production build: MUST have CAPACITOR_SERVER_URL set to a valid HTTPS URL
    if (!url || url === 'http://localhost:3000') {
      throw new Error(
        'CAPACITOR_SERVER_URL must be set to a valid HTTPS production URL for Android production builds. ' +
        'Set CAPACITOR_SERVER_URL environment variable to your production HTTPS URL (e.g., https://padhaibuddy.com).'
      );
    }
    if (!url.startsWith('https://')) {
      throw new Error('CAPACITOR_SERVER_URL must be a valid HTTPS URL for production builds.');
    }
    return url;
  }
  
  // Development: allow localhost fallback
  return url || 'http://localhost:3000';
}

const config: CapacitorConfig = {
  appId: 'com.padhaibuddy.app',
  appName: 'Padhai Buddy',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: getServerUrl(),
    cleartext: !isProduction && !isCapacitorBuild, // Allow cleartext only in dev
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    },
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#6366F1',
      sound: 'default',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0B0F14',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    App: {
      launchAutoHide: true,
    },
  },
};

export default config;
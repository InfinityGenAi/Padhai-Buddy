import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.padhaibuddy.app',
  appName: 'Padhai Buddy',
  webDir: 'out',
  server: {
    androidScheme: 'https',
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
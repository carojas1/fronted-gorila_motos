import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId:    'com.gorilamoto.app',
  appName:  'Gorila Motos',
  webDir:   'dist',
  server: {
    /* Para desarrollo local apunta al backend */
    // androidScheme: 'http',
    // url: 'http://10.0.2.2:8080',  // emulador Android → localhost
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0C0C10',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#E11428',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0C0C10',
    },
  },
};

export default config;

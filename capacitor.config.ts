import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.zentto.web3app',
  appName: 'Zentto',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Keyboard: {
      resize: 'native' as any,   // el webview se achica → el campo enfocado sube y no queda tapado
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      // Lo ocultamos manualmente desde main.tsx, pero con auto-hide de respaldo
      // (3s) para que NUNCA quede colgado si el hide manual no dispara.
      launchAutoHide: true,
      launchShowDuration: 3000,
      backgroundColor: '#0b0e1a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'small',
      spinnerColor: '#6366f1',
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
};

export default config;

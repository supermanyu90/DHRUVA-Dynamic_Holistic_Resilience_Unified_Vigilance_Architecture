import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dhruva.app',
  appName: 'DHRUVA',
  webDir: 'dist',
  // Bundled model: the built `dist/` ships inside the app and is served
  // from the local origin. Live data is still fetched over the network.
  backgroundColor: '#0a0f1a',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      // We hide it manually once React mounts so there's no blank flash
      // between the native splash and the app's own loading screen.
      launchAutoHide: false,
      backgroundColor: '#0a0f1a',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#0a0f1a',
    },
  },
};

export default config;

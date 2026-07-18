// Capacitor config for the packaged Android/iOS app.
// Kept dependency-free (no `@capacitor/cli` type import) so the web build /
// install never needs Capacitor packages. Before building the native app,
// reinstall the Capacitor deps — see README-mobile.md.
const config = {
  appId: 'com.dhruva.app',
  appName: 'DHRUVA',
  webDir: 'dist',
  // Bundled model: the built `dist/` ships inside the app and is served from
  // the local origin. Live data is still fetched over the network.
  backgroundColor: '#0a0f1a',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
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

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'be.tokyosushibarliege.app',
  appName: 'Tokyo Sushi Bar',
  webDir: '.output/public',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#F6F5F2',
    },
    Keyboard: {
      resize: 'none',          // Matches KeyboardResize.None set at runtime; applies before JS runs
      resizeOnFullScreen: true,
    },
    CapacitorHttp: {
      enabled: false,           // Use WKWebView networking instead of native HTTP (CORS is configured server-side)
    },
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  android: {
    backgroundColor: '#F6F5F2', // Matches tsb-one — prevents white flash before WebView loads
  },
}

export default config

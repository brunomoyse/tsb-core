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
  },
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#F6F5F2', // Matches tsb-one — prevents white flash before WebView loads
  },
}

export default config

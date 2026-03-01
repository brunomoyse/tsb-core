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
  },
  server: {
    androidScheme: 'https',
  },
}

export default config

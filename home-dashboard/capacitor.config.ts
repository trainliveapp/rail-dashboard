import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.trainlive.app',
  appName: 'TrainLive',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      backgroundColor: '#1e3a8a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
}

export default config

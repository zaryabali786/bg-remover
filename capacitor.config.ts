import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.backgroundremover',
  appName: 'Background Remover',
  webDir: 'www',  // Ensure this is correct
  plugins: {
    LiveUpdates: {
      appId: '995343ea',
      channel: 'Production',
      autoUpdateMethod: 'background',
      maxVersions: 2
    }
  }

};

export default config;

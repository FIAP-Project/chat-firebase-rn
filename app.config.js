const fs = require('fs');
const path = require('path');

// google-services.json (Android) e GoogleService-Info.plist (iOS) são opcionais para abrir o projeto,
// mas necessários para o push em build nativo.
const googleServicesAndroid = path.resolve(__dirname, 'google-services.json');
const googleServicesIos = path.resolve(__dirname, 'GoogleService-Info.plist');

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Chat Firebase',
  slug: 'chat-firebase-rn',
  owner: 'cerbon',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'chatfirebase',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'br.com.fiap.chatfirebase',
    ...(fs.existsSync(googleServicesIos) ? { googleServicesFile: './GoogleService-Info.plist' } : {}),
    infoPlist: { UIBackgroundModes: ['remote-notification'] },
  },
  android: {
    package: 'br.com.fiap.chatfirebase',
    ...(fs.existsSync(googleServicesAndroid) ? { googleServicesFile: './google-services.json' } : {}),
  },
  plugins: [
    ['expo-notifications', { color: '#2563eb' }],
    [
      'expo-image-picker',
      { photosPermission: 'O app precisa acessar suas fotos para definir a foto de perfil ou do grupo.' },
    ],
  ],
  extra: {
    eas: { projectId: '9a1f4741-aa5e-4306-be68-19022efb3898' },
  },
};
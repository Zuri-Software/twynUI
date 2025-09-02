const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  name: IS_DEV ? 'Twyn (Dev)' : 'Twyn',
  slug: 'twyn',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV ? 'com.dhruvnashdesai.twyn.dev' : 'com.dhruvnashdesai.twyn',
    infoPlist: {
      NSPhotoLibraryUsageDescription: 'This app needs access to your photo library to select photos for AI model training and image generation.',
      NSPhotoLibraryAddUsageDescription: 'This app needs access to save AI-generated images to your photo library.',
      NSCameraUsageDescription: 'This app needs access to your camera to take photos for AI model training.'
    },
    entitlements: {
      'aps-environment': 'production'
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: IS_DEV ? 'com.dhruvnashdesai.twyn.dev' : 'com.dhruvnashdesai.twyn',
    edgeToEdgeEnabled: true
  },
  web: {
    favicon: './assets/favicon.png'
  },
  fonts: [
    './assets/fonts/FatFrank-Heavy.otf'
  ],
  plugins: [
    [
      'expo-camera',
      {
        cameraPermission: 'This app needs access to your camera to take photos for AI model training.'
      }
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'This app needs access to your photo library to select photos for AI model training and image generation.',
        cameraPermission: 'This app needs access to your camera to take photos for AI model training.'
      }
    ],
    [
      'expo-media-library',
      {
        photosPermission: 'This app needs access to your photo library to save AI-generated images.',
        savePhotosPermission: 'This app needs access to save AI-generated images to your photo library.',
        isAccessMediaLocationEnabled: true
      }
    ],
    [
      'expo-notifications',
      {
        color: '#FE6EFD',
        iosDisplayInForeground: true
      }
    ]
  ],
  updates: {
    url: 'https://u.expo.dev/895b0ffc-ca13-47ca-9d32-504395c39b6f'
  },
  runtimeVersion: '1.0.2',
  extra: {
    eas: {
      projectId: '895b0ffc-ca13-47ca-9d32-504395c39b6f'
    }
  },
  owner: 'dhruvnashdesai'
};
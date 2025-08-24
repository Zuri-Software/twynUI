// Jest setup file for React Native Testing Library

// Only import if available
try {
  require('react-native-gesture-handler/jestSetup');
} catch (error) {
  // Gesture handler setup not available, skip
}

// Mock react-native animated modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}), { virtual: true });

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo modules
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://document-directory/',
  cacheDirectory: 'file://cache-directory/',
  makeDirectoryAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  deleteAsync: jest.fn(),
  downloadAsync: jest.fn(),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
  prefetch: jest.fn(),
  clearMemoryCache: jest.fn(),
  clearDiskCache: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      dispatch: jest.fn(),
      goBack: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
  };
});

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  })),
}));

// Mock our custom services
jest.mock('./src/services/APIService', () => ({
  APIService: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    generateImages: jest.fn(),
    fetchUserModels: jest.fn(),
    fetchPresets: jest.fn(),
    trainCharacter: jest.fn(),
  },
}));

jest.mock('./src/services/ImageCacheManager', () => ({
  preloadImages: jest.fn(),
  prefetchCritical: jest.fn(),
  prefetchImage: jest.fn(),
  getCachedImagePath: jest.fn(),
  isImageCached: jest.fn(),
  clearCache: jest.fn(),
  getCacheStats: jest.fn(),
}));

// Global test setup
global.console = {
  ...console,
  // Uncomment to suppress console logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Increase Jest timeout for async tests
jest.setTimeout(10000);
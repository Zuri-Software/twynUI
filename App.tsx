import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import RootScreen from './src/screens/RootScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

console.log('🚀 [App.tsx] App component is being loaded');

export default function App() {
  console.log('📱 [App.tsx] App component is rendering');
  
  const [fontsLoaded] = useFonts({
    'FatFrank-Heavy': require('./assets/fonts/FatFrank-Heavy.otf'),
  });

  useEffect(() => {
    async function prepare() {
      try {
        if (fontsLoaded) {
          console.log('✅ [App.tsx] Fonts loaded successfully');
          // Hide the splash screen once fonts are loaded
          await SplashScreen.hideAsync();
        }
      } catch (e) {
        console.warn('⚠️ [App.tsx] Error hiding splash screen:', e);
      }
    }

    prepare();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    console.log('⏳ [App.tsx] Fonts are still loading...');
    return null; // Show splash screen while fonts load
  }
  
  try {
    return (
      <>
        <RootScreen />
        <StatusBar style="auto" />
      </>
    );
  } catch (error) {
    console.error('❌ [App.tsx] Error in App component:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'red' }}>
        <Text style={{ color: 'white', fontSize: 20 }}>ERROR IN APP</Text>
        <Text style={{ color: 'white', fontSize: 16 }}>{String(error)}</Text>
      </View>
    );
  }
}

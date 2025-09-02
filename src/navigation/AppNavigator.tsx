import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { HomeIcon, FavoritesIcon, GalleryIcon, TrainingIcon, CameraIcon } from '../components/icons/TabIcons';
import { CONTAINER_RADIUS } from '../styles/borderRadius';

// Import screens
import HomeScreen from '../screens/main/HomeScreen';
import FavoritesScreen from '../screens/main/FavoritesScreen';
import GalleryScreen from '../screens/main/GalleryScreen';
import TrainingScreen from '../screens/main/TrainingScreen';
import PresetDetailScreen from '../screens/main/PresetDetailScreen';
import CameraScreen from '../screens/main/CameraScreen';
import { useGeneration } from '../context/GenerationContext';
import { useTraining } from '../context/TrainingContext';
import { useAppState } from '../context/AppStateContext';

// Types
export type RootTabParamList = {
  Home: undefined;
  Favorites: undefined;
  Gallery: undefined;
  Training: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  PresetDetail: { 
    preset: any; 
    characterId?: string; 
    onGenerateRequest?: (preset: any, characterId: string) => void;
  };
};

export type FavoritesStackParamList = {
  FavoritesScreen: undefined;
  PresetDetail: { 
    preset: any; 
    characterId?: string; 
    onGenerateRequest?: (preset: any, characterId: string) => void;
  };
};

export type GalleryStackParamList = {
  GalleryScreen: undefined;
};

export type TrainingStackParamList = {
  TrainingScreen: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const FavoritesStack = createStackNavigator<FavoritesStackParamList>();
const GalleryStack = createStackNavigator<GalleryStackParamList>();
const TrainingStack = createStackNavigator<TrainingStackParamList>();

// Wrapper components that connect generation context to screens
function HomeScreenWithGeneration() {
  return <HomeScreen />;
}

function FavoritesScreenWithGeneration() {
  return <FavoritesScreen />;
}

function PresetDetailScreenWithGeneration(props: any) {
  console.log('🚨🚨🚨 [AppNavigator] PresetDetailScreenWithGeneration WRAPPER CALLED! 🚨🚨🚨');
  
  const { startGeneration } = useGeneration();
  const { models } = useTraining();
  const { selectedLoraId, availableLoRAs } = useAppState();

  console.log('[🔍 AppNavigator] startGeneration available:', !!startGeneration);

  const handleGenerateRequest = async (preset: any, characterId: string) => {
    console.log('[AppNavigator] 🚀 Generation requested for:', preset.name, 'with character:', characterId);
    console.log('[AppNavigator] 📝 Full preset data:', {
      id: preset.id,
      style_id: preset.style_id,
      name: preset.name,
      prompt: preset.prompt
    });
    
    try {
      console.log('[AppNavigator] 🔄 Calling startGeneration...');
      await startGeneration(preset, characterId, models);
      console.log('[AppNavigator] ✅ startGeneration completed');
    } catch (error) {
      console.error('[AppNavigator] ❌ startGeneration failed:', error);
      throw error; // Re-throw so PresetDetailScreen can handle it
    }
  };

  // Use global selected model or fall back to first available model
  const selectedCharacterId = selectedLoraId || (availableLoRAs.length > 0 ? availableLoRAs[0].id : undefined);

  console.log('[🔍 AppNavigator] Creating route params with onGenerateRequest:', !!handleGenerateRequest);
  console.log('[🔍 AppNavigator] Original route params:', props.route?.params);
  
  return (
    <PresetDetailScreen
      {...props}
      route={{
        ...props.route,
        params: {
          ...props.route.params,
          characterId: props.route.params?.characterId || selectedCharacterId,
          onGenerateRequest: handleGenerateRequest,
        }
      }}
    />
  );
}

// Stack Navigators for each tab
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeScreen" component={HomeScreenWithGeneration} />
      <HomeStack.Screen name="PresetDetail" component={PresetDetailScreenWithGeneration} />
    </HomeStack.Navigator>
  );
}

function FavoritesStackNavigator() {
  return (
    <FavoritesStack.Navigator screenOptions={{ headerShown: false }}>
      <FavoritesStack.Screen name="FavoritesScreen" component={FavoritesScreenWithGeneration} />
      <FavoritesStack.Screen name="PresetDetail" component={PresetDetailScreenWithGeneration} />
    </FavoritesStack.Navigator>
  );
}

function GalleryStackNavigator() {
  return (
    <GalleryStack.Navigator screenOptions={{ headerShown: false }}>
      <GalleryStack.Screen name="GalleryScreen" component={GalleryScreen} />
    </GalleryStack.Navigator>
  );
}

function TrainingStackNavigator() {
  return (
    <TrainingStack.Navigator screenOptions={{ headerShown: false }}>
      <TrainingStack.Screen name="TrainingScreen" component={TrainingScreen} />
    </TrainingStack.Navigator>
  );
}

// Custom Tab Bar with center camera button
function CustomTabBar({ state, descriptors, navigation, selectedTab, onTabChange }: any) {
  const getTabIcon = (routeName: string, isFocused: boolean) => {
    const iconProps = {
      size: 24,
      color: '#ffffff',
      focused: isFocused,
    };
    
    switch (routeName) {
      case 'Home':
        return <HomeIcon {...iconProps} />;
      case 'Favorites':
        return <FavoritesIcon {...iconProps} />;
      case 'Gallery':
        return <GalleryIcon {...iconProps} />;
      case 'Training':
        return <TrainingIcon {...iconProps} />;
      default:
        return null;
    }
  };

  const handleCameraPress = () => {
    navigation.navigate('CameraModal');
  };

  const handleTabPress = (route: any, index: number) => {
    const isFocused = state.index === index;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      if (onTabChange) {
        onTabChange(index);
      }
      navigation.navigate(route.name);
    }
  };

  // Split routes into left and right sides
  const leftRoutes = state.routes.slice(0, 2); // Home, Favorites
  const rightRoutes = state.routes.slice(2);   // Gallery, Training

  return (
    <View style={styles.tabBar}>
      <View style={styles.tabContainer}>
        <View style={styles.spacer} />
        
        {/* Left side tabs */}
        <View style={styles.tabSideContainer}>
          {leftRoutes.map((route: any, index: number) => {
            const isFocused = state.index === index;
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabButton}
                onPress={() => handleTabPress(route, index)}
                activeOpacity={0.7}
              >
                {getTabIcon(route.name, isFocused)}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Center Camera Button */}
        <TouchableOpacity
          style={styles.cameraButton}
          onPress={handleCameraPress}
          activeOpacity={0.8}
        >
          <CameraIcon size={36} />
        </TouchableOpacity>

        {/* Right side tabs */}
        <View style={styles.tabSideContainer}>
          {rightRoutes.map((route: any, index: number) => {
            const originalIndex = index + 2; // Adjust for original position
            const isFocused = state.index === originalIndex;
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabButton}
                onPress={() => handleTabPress(route, originalIndex)}
                activeOpacity={0.7}
              >
                {getTabIcon(route.name, isFocused)}
              </TouchableOpacity>
            );
          })}
        </View>
        
        <View style={styles.spacer} />
      </View>
    </View>
  );
}

// Screen wrapper with rounded corners
function ScreenWrapper({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.screenWrapper}>
      {children}
    </View>
  );
}

// Wrapped stack navigators
function HomeStackNavigatorWrapped() {
  return (
    <ScreenWrapper>
      <HomeStackNavigator />
    </ScreenWrapper>
  );
}

function FavoritesStackNavigatorWrapped() {
  return (
    <ScreenWrapper>
      <FavoritesStackNavigator />
    </ScreenWrapper>
  );
}

function GalleryStackNavigatorWrapped() {
  return (
    <ScreenWrapper>
      <GalleryStackNavigator />
    </ScreenWrapper>
  );
}

function TrainingStackNavigatorWrapped() {
  return (
    <ScreenWrapper>
      <TrainingStackNavigator />
    </ScreenWrapper>
  );
}

// Main Tab Navigator
function MainTabNavigator() {
  console.log('[MainTabNavigator] 📱 Rendering MainTabNavigator');
  
  const { navigationResetTrigger } = useAppState();
  const [selectedTab, setSelectedTab] = React.useState(0);
  const [shouldResetOnSwitch, setShouldResetOnSwitch] = React.useState(false);
  
  // Listen for navigation reset triggers from AppState
  React.useEffect(() => {
    if (navigationResetTrigger) {
      console.log('[MainTabNavigator] 🔄 Navigation reset triggered, preparing for reset');
      setShouldResetOnSwitch(true);
      // Switch to Home tab when LoRA changes
      setSelectedTab(0);
    }
  }, [navigationResetTrigger]);
  
  // Handle tab change
  const handleTabChange = (index: number) => {
    if (index === 0 && shouldResetOnSwitch) {
      console.log('[MainTabNavigator] 🏠 Switching to Home tab after model change - forcing reset');
      setShouldResetOnSwitch(false);
      // The key prop will force re-render
    }
    setSelectedTab(index);
  };
  
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} selectedTab={selectedTab} onTabChange={handleTabChange} />}
      screenOptions={{
        headerShown: false,
      }}
      sceneContainerStyle={{ backgroundColor: 'transparent' }}
      initialRouteName="Home"
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackNavigatorWrapped} 
        key={shouldResetOnSwitch ? `home-reset-${navigationResetTrigger}` : 'home'}
      />
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesStackNavigatorWrapped} 
        key={shouldResetOnSwitch ? `favorites-reset-${navigationResetTrigger}` : 'favorites'}
      />
      <Tab.Screen 
        name="Gallery" 
        component={GalleryStackNavigatorWrapped} 
        key={shouldResetOnSwitch ? `gallery-reset-${navigationResetTrigger}` : 'gallery'}
      />
      <Tab.Screen 
        name="Training" 
        component={TrainingStackNavigatorWrapped} 
        key={shouldResetOnSwitch ? `training-reset-${navigationResetTrigger}` : 'training'}
      />
    </Tab.Navigator>
  );
}

// Create Root Stack Navigator for modals
const RootStack = createStackNavigator();

// Main App Navigator
export default function AppNavigator() {
  console.log('[AppNavigator] 🚀 Rendering AppNavigator');
  
  return (
    <NavigationContainer theme={{ colors: { background: '#000000' } }}>
      <RootStack.Navigator 
        screenOptions={{ 
          headerShown: false,
          presentation: 'modal',
          animationTypeForReplace: 'push',
        }}
      >
        <RootStack.Screen name="MainTabs" component={MainTabsWithContainer} />
        <RootStack.Screen 
          name="CameraModal" 
          component={CameraScreen}
          options={{
            presentation: 'fullScreenModal',
            animationTypeForReplace: 'push',
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

// Wrapper for MainTabNavigator with container styling
function MainTabsWithContainer() {
  return (
    <View style={styles.appContainer}>
      <MainTabNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#000000', // Black background extending to all edges
  },
  screenWrapper: {
    flex: 1,
    backgroundColor: '#ffffff',   // White background for content
    ...CONTAINER_RADIUS.main,     // Rounded bottom corners only (matches SwiftUI UnevenRoundedRectangle)
    overflow: 'hidden',
    marginBottom: 90,             // Updated space for taller tab bar
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    // Remove paddingTop, add proper safe area handling
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 34,        // Safe area padding
    paddingTop: 20,           // Top padding
    height: 90,               // Increased total height
  },
  spacer: {
    flex: 1, // Left and right spacers for centering
  },
  tabIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 300, // Wider for 5 positions (4 tabs + camera)
    gap: 20,
  },
  tabSideContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 30, // Match original spacing
  },
  cameraButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56, // Larger for prominence
    height: 56,
    marginHorizontal: 20, // Extra space from side tabs
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44, // Match SwiftUI touch target size
    height: 44,
  },
});
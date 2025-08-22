import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { HomeIcon, FavoritesIcon, GalleryIcon, TrainingIcon } from '../components/icons/TabIcons';

// Import screens
import HomeScreen from '../screens/main/HomeScreen';
import FavoritesScreen from '../screens/main/FavoritesScreen';
import GalleryScreen from '../screens/main/GalleryScreen';
import TrainingScreen from '../screens/main/TrainingScreen';
import PresetDetailScreen from '../screens/main/PresetDetailScreen';
import { useGeneration } from '../context/GenerationContext';
import { useTraining } from '../context/TrainingContext';
import { useSelectedModel } from '../context/SelectedModelContext';

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
  const { selectedModelId } = useSelectedModel();

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

  // Use global selected model or fall back to first model
  const selectedCharacterId = selectedModelId || (models.length > 0 ? models[0].id : undefined);

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

// Custom Tab Bar (matching Swift design)
function CustomTabBar({ state, descriptors, navigation }: any) {
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

  return (
    <View style={styles.tabBar}>
      <View style={styles.tabContainer}>
        <View style={styles.spacer} />
        <View style={styles.tabIconsContainer}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined ? options.tabBarLabel : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabButton}
              onPress={onPress}
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
  
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      sceneContainerStyle={{ backgroundColor: 'transparent' }}
    >
      <Tab.Screen name="Home" component={HomeStackNavigatorWrapped} />
      <Tab.Screen name="Favorites" component={FavoritesStackNavigatorWrapped} />
      <Tab.Screen name="Gallery" component={GalleryStackNavigatorWrapped} />
      <Tab.Screen name="Training" component={TrainingStackNavigatorWrapped} />
    </Tab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  console.log('[AppNavigator] 🚀 Rendering AppNavigator');
  
  return (
    <NavigationContainer theme={{ colors: { background: '#000000' } }}>
      <View style={styles.appContainer}>
        <MainTabNavigator />
      </View>
    </NavigationContainer>
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
    borderBottomLeftRadius: 32,   // Rounded bottom corners only
    borderBottomRightRadius: 32,
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
    minWidth: 200, // Approximate width for 4 icons with 30pt spacing
    gap: 30, // Match SwiftUI spacing between icons
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44, // Match SwiftUI touch target size
    height: 44,
  },
});
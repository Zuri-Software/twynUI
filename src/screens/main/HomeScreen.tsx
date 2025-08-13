import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import StaggeredGrid from '../../components/ui/StaggeredGrid';
import { AdaptivePresetCard } from '../../components/ui/PresetCard';
import { CategoryCard } from '../../components/ui/CategoryCard';
import { HowToUseCard } from '../../components/ui/HowToUseCard';
import AnimatedPresetModal from '../../components/ui/AnimatedPresetModal';
import { APIService } from '../../services/APIService';
import { Preset, PresetCategory } from '../../types/preset.types';
import { TYPOGRAPHY, TEXT_COLORS } from '../../styles/typography';
import { COLORS } from '../../styles/colors';
import FreePillButton from '../../components/ui/FreePillButton';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  console.log('[HomeScreen] 🏠 Rendering HomeScreen');
  
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Parallax animation refs
  const parallaxOffset = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;
  const scaleY = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadPresets();
  }, []);

  // Reset category selection when returning to home screen
  useFocusEffect(
    React.useCallback(() => {
      console.log('[HomeScreen] Screen focused, clearing category filter');
      setSelectedCategory(null);
    }, [])
  );

  const loadPresets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const presetsData = await APIService.fetchPresets();
      console.log('[HomeScreen] Loaded presets:', presetsData.length);
      setPresets(presetsData);
    } catch (error: any) {
      console.error('[HomeScreen] Error loading presets:', error);
      setError(error.message || 'Failed to load presets');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetPress = (preset: Preset) => {
    console.log('[HomeScreen] 🎯 Preset selected:', preset.name);
    setSelectedPreset(preset);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedPreset(null);
  };

  // Filtered presets based on selected category
  const filteredPresets = selectedCategory
    ? presets.filter(preset => preset.category === selectedCategory)
    : presets;

  // Dynamic categories based on actual data
  const availableCategories = Array.from(
    new Set(presets.map(preset => preset.category))
  ).sort();

  const handleCategoryPress = (category: PresetCategory) => {
    console.log('[HomeScreen] Category selected:', category);
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  const clearCategoryFilter = () => {
    console.log('[HomeScreen] Clearing category filter');
    setSelectedCategory(null);
  };

  const handleHowToUsePress = () => {
    console.log('[HomeScreen] How to use pressed');
    // TODO: Navigate to tutorial or help screen
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading presets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      {/* Header with white background extending to top edge */}
      <Animated.View style={[
        styles.headerBackground,
        {
          transform: [
            { translateY: parallaxOffset },
            { scaleX: scaleX },
            { scaleY: scaleY }
          ],
          opacity: contentOpacity,
        },
      ]}>
        <SafeAreaView edges={[]} style={styles.headerSafeArea}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../../assets/icon.png')}
                  style={styles.logo}
                  contentFit="contain"
                />
              </View>
              
              <View style={styles.headerButtons}>
                <FreePillButton />
                <TouchableOpacity style={styles.settingsButton}>
                  <Text style={styles.settingsIcon}>⚙︎</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* Main content area with white background and rounded bottom corners */}
      <Animated.View style={[
        styles.contentArea,
        {
          transform: [
            { translateY: parallaxOffset },
            { scaleX: scaleX },
            { scaleY: scaleY }
          ],
          opacity: contentOpacity,
        },
      ]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Combined Tutorial + Category Cards Row */}
          <View style={styles.categoriesSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScrollContent}
            >
              {/* How to Use Card */}
              <HowToUseCard onPress={handleHowToUsePress} />
              
              {/* Category Cards */}
              {availableCategories.map((category) => {
                const categoryPreset = presets.find(preset => preset.category === category);
                return (
                  <CategoryCard
                    key={category}
                    title={category}
                    isSelected={selectedCategory === category}
                    preset={categoryPreset}
                    onPress={() => handleCategoryPress(category)}
                  />
                );
              })}
            </ScrollView>
          </View>

          {/* Browse Section */}
          <View style={styles.browseSection}>
            <View style={styles.browseSectionHeader}>
              <Text style={styles.browseTitle}>
                {selectedCategory ? selectedCategory.toUpperCase() : 'BROWSE'}
              </Text>
              {selectedCategory && (
                <TouchableOpacity onPress={clearCategoryFilter} style={styles.allCategoriesButton}>
                  <Text style={styles.allCategoriesText}>All Categories</Text>
                </TouchableOpacity>
              )}
            </View>

            <StaggeredGrid
              data={filteredPresets}
              columns={2}
              spacing={12}
              renderItem={(preset) => (
                <AdaptivePresetCard
                  preset={preset}
                  onPress={handlePresetPress}
                />
              )}
              keyExtractor={(preset) => preset.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.gridContent}
            />
          </View>
        </ScrollView>
      </Animated.View>

      {/* Animated Preset Modal */}
      <AnimatedPresetModal
        preset={selectedPreset}
        visible={showModal}
        onClose={handleModalClose}
        parallaxOffset={parallaxOffset}
        scaleX={scaleX}
        scaleY={scaleY}
        contentOpacity={contentOpacity}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Main container with black background extending to all edges
  container: {
    flex: 1,
    backgroundColor: COLORS.background.black,
  },
  
  // Header background extends to top edge (like SwiftUI)
  headerBackground: {
    backgroundColor: COLORS.background.white,
  },
  headerSafeArea: {
    backgroundColor: COLORS.background.white,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 44, // Status bar height + minimal padding
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    marginLeft: 8, // 8pt offset like SwiftUI
    marginTop: 8, // 8pt offset like SwiftUI
  },
  logo: {
    width: 65,
    height: 65,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // 12pt spacing between buttons
  },
  settingsButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 18,
    color: TEXT_COLORS.primary,
  },

  // Main content area - rounded corners now handled by navigator
  contentArea: {
    flex: 1,
    backgroundColor: COLORS.background.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20, // Small padding for content separation
  },

  // Categories section (matching SwiftUI spacing)
  categoriesSection: {
    paddingTop: 5,
    paddingBottom: 5,
    backgroundColor: COLORS.background.white,
  },
  categoriesScrollContent: {
    paddingLeft: 2,
    paddingRight: 16,
    gap: 8, // Reduced spacing between cards
  },

  // Browse section (matching SwiftUI spacing)
  browseSection: {
    flex: 1,
    paddingHorizontal: 2, // Reduced from 16pt to 8pt for wider grid
    paddingTop: 10, // 10pt top padding from categories
  },
  browseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 16
  },
  browseTitle: {
    ...TYPOGRAPHY.fatFrankTitle,
    color: TEXT_COLORS.primary,
  },
  allCategoriesButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
    shadowColor: COLORS.ui.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  allCategoriesText: {
    ...TYPOGRAPHY.systemCaption,
    color: TEXT_COLORS.primary,
  },

  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.white,
  },
  loadingText: {
    ...TYPOGRAPHY.systemBody,
    color: TEXT_COLORS.secondary,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.background.white,
  },
  errorTitle: {
    ...TYPOGRAPHY.fatFrankTitle,
    color: COLORS.system.red,
    marginBottom: 8,
  },
  errorText: {
    ...TYPOGRAPHY.systemBody,
    color: TEXT_COLORS.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  gridContent: {
    paddingBottom: 40,
  },
});
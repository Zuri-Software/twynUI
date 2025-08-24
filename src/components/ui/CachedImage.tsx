import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import ImageCacheManager, { CachePriority } from '../../services/ImageCacheManager';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  priority?: CachePriority;
  showLoadingIndicator?: boolean;
  fallbackText?: string;
  onCacheHit?: () => void;
  onCacheMiss?: () => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: any) => void;
}

/**
 * CachedImage - High-performance cached image component
 * 
 * Features:
 * - Automatic prefetching and caching via ImageCacheManager
 * - Priority-based loading
 * - Loading states with optional indicators
 * - Fallback handling
 * - Cache hit/miss callbacks for performance monitoring
 */
export default function CachedImage({
  uri,
  priority = CachePriority.NORMAL,
  showLoadingIndicator = false,
  fallbackText,
  onCacheHit,
  onCacheMiss,
  onLoadStart,
  onLoadEnd,
  onError,
  style,
  ...imageProps
}: CachedImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cachedPath, setCachedPath] = useState<string | null>(null);

  useEffect(() => {
    loadImage();
  }, [uri, priority]);

  const loadImage = async () => {
    if (!uri) {
      setError('No image URL provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      onLoadStart?.();

      // Check if already cached
      const existingCachedPath = await ImageCacheManager.getCachedImagePath(uri);
      
      if (existingCachedPath) {
        // Cache hit!
        console.log('[🖼️ CachedImage] ✅ Cache hit for:', uri.substring(0, 50) + '...');
        setCachedPath(existingCachedPath);
        onCacheHit?.();
        setLoading(false);
        onLoadEnd?.();
        return;
      }

      // Cache miss - prefetch the image
      console.log('[🖼️ CachedImage] ⚠️ Cache miss, prefetching:', uri.substring(0, 50) + '...');
      onCacheMiss?.();

      const success = await ImageCacheManager.prefetchImage(uri, priority);
      
      if (success) {
        // Get the cached path after prefetch
        const newCachedPath = await ImageCacheManager.getCachedImagePath(uri);
        setCachedPath(newCachedPath);
      } else {
        // Prefetch failed, use original URL
        console.log('[🖼️ CachedImage] ⚠️ Prefetch failed, using original URL');
        setCachedPath(uri);
      }

      setLoading(false);
      onLoadEnd?.();

    } catch (err: any) {
      console.error('[🖼️ CachedImage] ❌ Failed to load image:', err);
      setError(err.message || 'Failed to load image');
      setLoading(false);
      onError?.(err);
    }
  };

  const handleImageError = (error: any) => {
    console.error('[🖼️ CachedImage] Image load error:', error);
    setError('Failed to display image');
    setLoading(false);
    onError?.(error);
  };

  const handleImageLoadStart = () => {
    // Only set loading if not already loaded from cache
    if (!cachedPath) {
      setLoading(true);
    }
  };

  const handleImageLoadEnd = () => {
    setLoading(false);
    onLoadEnd?.();
  };

  // Render error state
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{fallbackText || 'Image unavailable'}</Text>
      </View>
    );
  }

  // Render loading state
  if (loading && showLoadingIndicator) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color="#007AFF" />
        {fallbackText && (
          <Text style={styles.loadingText}>{fallbackText}</Text>
        )}
      </View>
    );
  }

  // Render the cached image
  return (
    <Image
      source={{ 
        uri: cachedPath || uri,
      }}
      style={style}
      onLoadStart={handleImageLoadStart}
      onLoadEnd={handleImageLoadEnd}
      onError={handleImageError}
      cachePolicy="memory-disk"
      transition={200} // Smooth transition when image loads
      {...imageProps}
    />
  );
}

// Default styles for error and loading states
const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
  },
  loadingContainer: {
    padding: 16,
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '400',
  },
});
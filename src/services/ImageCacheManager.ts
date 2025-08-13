import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

enum CachePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

interface CacheEntry {
  url: string;
  localPath: string;
  priority: CachePriority;
  lastAccessed: number;
  size: number;
}

class ImageCacheManager {
  private static instance: ImageCacheManager;
  private readonly cacheDirectory: string;
  private readonly maxCacheSize: number = 100 * 1024 * 1024; // 100MB max cache size
  private readonly maxCacheEntries: number = 200; // Max 200 cached images
  private readonly cacheMetadataKey = 'image_cache_metadata';

  private constructor() {
    this.cacheDirectory = `${FileSystem.cacheDirectory}images/`;
    this.initializeCacheDirectory();
  }

  public static getInstance(): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager();
    }
    return ImageCacheManager.instance;
  }

  /**
   * Initialize cache directory
   */
  private async initializeCacheDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDirectory, { intermediates: true });
        console.log('[ImageCacheManager] ✅ Cache directory created');
      }
    } catch (error) {
      console.error('[ImageCacheManager] ❌ Failed to create cache directory:', error);
    }
  }

  /**
   * Preload images with specified priority
   */
  public async preloadImages(imageUrls: string[], priority: CachePriority = CachePriority.NORMAL): Promise<void> {
    console.log(`[ImageCacheManager] 🔄 Preloading ${imageUrls.length} images with ${priority} priority`);

    // Limit preloading based on priority
    const limit = this.getPreloadLimit(priority);
    const urlsToPreload = imageUrls.slice(0, limit);

    try {
      // Batch preload images more aggressively for development
      const batchSize = 10;
      for (let i = 0; i < urlsToPreload.length; i += batchSize) {
        const batch = urlsToPreload.slice(i, i + batchSize);
        await Promise.all(batch.map(url => Image.prefetch([url]).catch(err => {
          console.warn(`[ImageCacheManager] ⚠️ Failed to prefetch ${url}:`, err);
        })));
        console.log(`[ImageCacheManager] ✅ Preloaded batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(urlsToPreload.length/batchSize)}`);
      }
      
      console.log(`[ImageCacheManager] ✅ Successfully preloaded ${urlsToPreload.length} images`);
      
      // Update our cache metadata
      await this.updateCacheMetadata(urlsToPreload, priority);
    } catch (error) {
      console.error('[ImageCacheManager] ❌ Failed to preload images:', error);
    }
  }

  /**
   * Get preload limit based on priority
   */
  private getPreloadLimit(priority: CachePriority): number {
    switch (priority) {
      case CachePriority.HIGH:
        return 200; // Preload more images for high priority in dev
      case CachePriority.NORMAL:
        return 100; // Preload more images for normal priority in dev
      case CachePriority.LOW:
        return 50; // Preload more images for low priority in dev
      default:
        return 100;
    }
  }

  /**
   * Update cache metadata for tracking
   */
  private async updateCacheMetadata(urls: string[], priority: CachePriority): Promise<void> {
    try {
      const existingMetadata = await this.getCacheMetadata();
      const now = Date.now();

      // Add new entries
      for (const url of urls) {
        const filename = this.getFilenameFromUrl(url);
        const localPath = `${this.cacheDirectory}${filename}`;

        existingMetadata[url] = {
          url,
          localPath,
          priority,
          lastAccessed: now,
          size: 0, // Will be updated when we get actual size
        };
      }

      await AsyncStorage.setItem(this.cacheMetadataKey, JSON.stringify(existingMetadata));
      console.log(`[ImageCacheManager] 📝 Updated cache metadata for ${urls.length} images`);
    } catch (error) {
      console.error('[ImageCacheManager] ❌ Failed to update cache metadata:', error);
    }
  }

  /**
   * Get cache metadata
   */
  private async getCacheMetadata(): Promise<Record<string, CacheEntry>> {
    try {
      const metadata = await AsyncStorage.getItem(this.cacheMetadataKey);
      return metadata ? JSON.parse(metadata) : {};
    } catch (error) {
      console.error('[ImageCacheManager] ❌ Failed to get cache metadata:', error);
      return {};
    }
  }

  /**
   * Generate filename from URL
   */
  private getFilenameFromUrl(url: string): string {
    // Create a hash-like filename from URL
    const hash = url.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Get file extension from URL
    const extension = url.split('.').pop()?.toLowerCase() || 'jpg';
    return `${Math.abs(hash)}.${extension}`;
  }

  /**
   * Clear cache (remove old/unused entries)
   */
  public async clearCache(): Promise<void> {
    console.log('[ImageCacheManager] 🗑️ Clearing image cache...');

    try {
      // Clear expo-image cache
      await Image.clearMemoryCache();
      await Image.clearDiskCache();

      // Clear our cache directory
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.cacheDirectory);
        await this.initializeCacheDirectory();
      }

      // Clear metadata
      await AsyncStorage.removeItem(this.cacheMetadataKey);

      console.log('[ImageCacheManager] ✅ Cache cleared successfully');
    } catch (error) {
      console.error('[ImageCacheManager] ❌ Failed to clear cache:', error);
    }
  }

  /**
   * Get cache size and statistics
   */
  public async getCacheStats(): Promise<{
    totalSize: number;
    entryCount: number;
    entries: CacheEntry[];
  }> {
    try {
      const metadata = await this.getCacheMetadata();
      const entries = Object.values(metadata);
      
      let totalSize = 0;
      for (const entry of entries) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
          if (fileInfo.exists) {
            totalSize += fileInfo.size || 0;
          }
        } catch (error) {
          // File might not exist, skip
        }
      }

      return {
        totalSize,
        entryCount: entries.length,
        entries,
      };
    } catch (error) {
      console.error('[ImageCacheManager] ❌ Failed to get cache stats:', error);
      return {
        totalSize: 0,
        entryCount: 0,
        entries: [],
      };
    }
  }

  /**
   * Cleanup old cache entries (LRU eviction)
   */
  public async cleanupCache(): Promise<void> {
    console.log('[ImageCacheManager] 🧹 Cleaning up cache...');

    try {
      const stats = await this.getCacheStats();
      
      // If cache is too large or has too many entries, clean up
      if (stats.totalSize > this.maxCacheSize || stats.entryCount > this.maxCacheEntries) {
        // Sort by last accessed (oldest first)
        const sortedEntries = stats.entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
        
        // Remove oldest entries until we're under limits
        const entriesToRemove = Math.max(
          stats.entryCount - this.maxCacheEntries,
          Math.ceil(stats.entries.length * 0.2) // Remove at least 20%
        );

        for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
          const entry = sortedEntries[i];
          try {
            await FileSystem.deleteAsync(entry.localPath);
            console.log(`[ImageCacheManager] 🗑️ Removed cached image: ${entry.url}`);
          } catch (error) {
            // File might not exist, continue
          }
        }

        // Update metadata
        const remainingEntries = sortedEntries.slice(entriesToRemove);
        const newMetadata: Record<string, CacheEntry> = {};
        for (const entry of remainingEntries) {
          newMetadata[entry.url] = entry;
        }

        await AsyncStorage.setItem(this.cacheMetadataKey, JSON.stringify(newMetadata));
        console.log(`[ImageCacheManager] ✅ Cleaned up ${entriesToRemove} cache entries`);
      }
    } catch (error) {
      console.error('[ImageCacheManager] ❌ Failed to cleanup cache:', error);
    }
  }

  /**
   * Prefetch single image
   */
  public async prefetchImage(url: string, priority: CachePriority = CachePriority.NORMAL): Promise<boolean> {
    try {
      await Image.prefetch([url]);
      await this.updateCacheMetadata([url], priority);
      console.log(`[ImageCacheManager] ✅ Prefetched image: ${url}`);
      return true;
    } catch (error) {
      console.error(`[ImageCacheManager] ❌ Failed to prefetch image: ${url}`, error);
      return false;
    }
  }
}

export { CachePriority };
export default ImageCacheManager.getInstance();
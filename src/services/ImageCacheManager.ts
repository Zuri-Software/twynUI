import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

enum CachePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

interface CacheEntry {
  url: string;
  localPath: string;
  priority: CachePriority;
  lastAccessed: number;
  cachedAt: number;
  size: number;
}

class ImageCacheManager {
  private static instance: ImageCacheManager;
  private readonly cacheDirectory: string;
  private readonly maxCacheSize: number = 100 * 1024 * 1024; // 100MB max cache size
  private readonly maxCacheEntries: number = 200; // Max 200 cached images
  private readonly cacheMetadataKey = 'image_cache_metadata';
  private memoryWarningListener: (() => void) | null = null;
  private lastCleanupTime: number = 0;
  private isCleaningUp: boolean = false;

  private constructor() {
    this.cacheDirectory = `${FileSystem.cacheDirectory}images/`;
    this.initializeCacheDirectory();
    this.setupMemoryPressureHandling();
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
   * Setup memory pressure handling
   */
  private setupMemoryPressureHandling(): void {
    // React Native doesn't have direct memory pressure events,
    // but we can implement our own memory management
    this.memoryWarningListener = () => {
      console.log('[ImageCacheManager] 🚨 Memory pressure detected, cleaning cache');
      this.handleMemoryPressure();
    };

    // Periodic cleanup every 10 minutes
    setInterval(() => {
      const now = Date.now();
      const timeSinceLastCleanup = now - this.lastCleanupTime;
      
      // Only run cleanup if it's been more than 10 minutes
      if (timeSinceLastCleanup > 10 * 60 * 1000 && !this.isCleaningUp) {
        this.performMaintenanceCleanup();
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  /**
   * Handle memory pressure by aggressively cleaning cache
   */
  private async handleMemoryPressure(): Promise<void> {
    if (this.isCleaningUp) return;

    console.log('[ImageCacheManager] 🧹 Handling memory pressure...');
    
    try {
      this.isCleaningUp = true;

      // Clear expo-image memory cache first
      await Image.clearMemoryCache();
      
      // Get current cache stats
      const stats = await this.getCacheStats();
      
      if (stats.totalSize > 50 * 1024 * 1024) { // If cache > 50MB
        console.log('[ImageCacheManager] Cache size too large, aggressive cleanup needed');
        
        // Keep only critical priority images
        const metadata = await this.getCacheMetadata();
        const entries = Object.values(metadata);
        const criticalEntries = entries.filter(entry => entry.priority === CachePriority.CRITICAL);
        const nonCriticalEntries = entries.filter(entry => entry.priority !== CachePriority.CRITICAL);
        
        // Delete 80% of non-critical images
        const toDelete = nonCriticalEntries.slice(0, Math.floor(nonCriticalEntries.length * 0.8));
        
        for (const entry of toDelete) {
          try {
            await FileSystem.deleteAsync(entry.localPath);
            delete metadata[entry.url];
          } catch (error) {
            // File might not exist, continue
          }
        }
        
        // Update metadata with remaining entries
        const remainingMetadata: Record<string, CacheEntry> = {};
        for (const entry of criticalEntries) {
          remainingMetadata[entry.url] = entry;
        }
        for (const entry of nonCriticalEntries.slice(Math.floor(nonCriticalEntries.length * 0.8))) {
          remainingMetadata[entry.url] = entry;
        }
        
        await AsyncStorage.setItem(this.cacheMetadataKey, JSON.stringify(remainingMetadata));
        console.log(`[ImageCacheManager] ✅ Memory pressure cleanup: deleted ${toDelete.length} images`);
      }

      this.lastCleanupTime = Date.now();
    } catch (error) {
      console.error('[ImageCacheManager] ❌ Memory pressure cleanup failed:', error);
    } finally {
      this.isCleaningUp = false;
    }
  }

  /**
   * Perform regular maintenance cleanup
   */
  private async performMaintenanceCleanup(): Promise<void> {
    if (this.isCleaningUp) return;
    
    try {
      this.isCleaningUp = true;
      console.log('[ImageCacheManager] 🔧 Performing maintenance cleanup...');

      const stats = await this.getCacheStats();
      
      // Only cleanup if we're above 70% of max capacity
      if (stats.totalSize > this.maxCacheSize * 0.7 || stats.entryCount > this.maxCacheEntries * 0.7) {
        await this.cleanupCache();
      }

      this.lastCleanupTime = Date.now();
    } catch (error) {
      console.error('[ImageCacheManager] ❌ Maintenance cleanup failed:', error);
    } finally {
      this.isCleaningUp = false;
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
      case CachePriority.CRITICAL:
        return 500; // Unlimited for critical images
      case CachePriority.HIGH:
        return 200; // Preload more images for high priority
      case CachePriority.NORMAL:
        return 100; // Standard preload limit
      case CachePriority.LOW:
        return 50; // Limited preload for low priority
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
          cachedAt: now,
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
        // Sort by priority and last accessed (protect critical images)
        const sortedEntries = stats.entries.sort((a, b) => {
          // Critical priority images have lowest priority for deletion
          if (a.priority === CachePriority.CRITICAL && b.priority !== CachePriority.CRITICAL) return 1;
          if (a.priority !== CachePriority.CRITICAL && b.priority === CachePriority.CRITICAL) return -1;
          
          // For same priority, sort by last accessed (oldest first)
          return a.lastAccessed - b.lastAccessed;
        });
        
        // Remove oldest entries until we're under limits (but preserve critical)
        const entriesToRemove = Math.max(
          stats.entryCount - this.maxCacheEntries,
          Math.ceil(stats.entries.length * 0.2) // Remove at least 20%
        );

        let removedCount = 0;
        const metadata = await this.getCacheMetadata();

        for (let i = 0; i < sortedEntries.length && removedCount < entriesToRemove; i++) {
          const entry = sortedEntries[i];
          
          // Skip critical priority images unless we're really out of space
          if (entry.priority === CachePriority.CRITICAL && removedCount < entriesToRemove * 0.8) {
            continue;
          }
          
          try {
            await FileSystem.deleteAsync(entry.localPath);
            delete metadata[entry.url];
            removedCount++;
            console.log(`[ImageCacheManager] 🗑️ Removed cached image: ${entry.url.substring(0, 50)}...`);
          } catch (error) {
            // File might not exist, continue
          }
        }

        await AsyncStorage.setItem(this.cacheMetadataKey, JSON.stringify(metadata));
        console.log(`[ImageCacheManager] ✅ Cleaned up ${removedCount} cache entries`);
      }
    } catch (error) {
      console.error('[ImageCacheManager] ❌ Failed to cleanup cache:', error);
    }
  }

  /**
   * Manually trigger memory optimization (for app state changes)
   */
  public async optimizeMemoryUsage(): Promise<void> {
    console.log('[ImageCacheManager] 🎯 Optimizing memory usage...');
    
    try {
      // Clear memory cache first
      await Image.clearMemoryCache();
      
      // Perform maintenance cleanup
      await this.performMaintenanceCleanup();
      
      console.log('[ImageCacheManager] ✅ Memory optimization complete');
    } catch (error) {
      console.error('[ImageCacheManager] ❌ Memory optimization failed:', error);
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

  /**
   * Prefetch critical images (like currently selected model thumbnails)
   * These images get highest priority and are always cached
   */
  public async prefetchCritical(urls: string[]): Promise<void> {
    console.log(`[ImageCacheManager] 🚨 Prefetching ${urls.length} CRITICAL images`);
    await this.preloadImages(urls, CachePriority.CRITICAL);
  }

  /**
   * Check if image is likely cached (based on metadata)
   * Note: This doesn't guarantee the file exists on disk
   */
  public async isImageCached(url: string): Promise<boolean> {
    try {
      const metadata = await this.getCacheMetadata();
      return url in metadata;
    } catch (error) {
      console.error('[ImageCacheManager] ❌ Failed to check cache status:', error);
      return false;
    }
  }

  /**
   * Get cached image path if it exists
   */
  public async getCachedImagePath(url: string): Promise<string | null> {
    try {
      const metadata = await this.getCacheMetadata();
      const entry = metadata[url];
      
      if (entry) {
        // Check if file actually exists
        const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
        if (fileInfo.exists) {
          // Update last accessed time
          entry.lastAccessed = Date.now();
          await AsyncStorage.setItem(this.cacheMetadataKey, JSON.stringify(metadata));
          return entry.localPath;
        }
      }
      
      return null;
    } catch (error) {
      console.error('[ImageCacheManager] ❌ Failed to get cached image path:', error);
      return null;
    }
  }
}

export { CachePriority };
export default ImageCacheManager.getInstance();
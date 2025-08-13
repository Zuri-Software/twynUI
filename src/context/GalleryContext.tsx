import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { APIService } from '../services/APIService';
import { GenerationBatch } from '../types/preset.types';
import ImageCacheManager, { CachePriority } from '../services/ImageCacheManager';
import NotificationService from '../services/NotificationService';

// Pending generation for skeleton display
interface PendingGeneration {
  id: string;
  preset: {
    name: string;
    image_url: string;
  };
  timestamp: Date;
}

interface GalleryContextType {
  images: string[];
  generationBatches: GenerationBatch[];
  pendingGenerations: PendingGeneration[];
  isLoading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
  addPendingGeneration: (preset: { name: string; image_url: string }) => string;
  removePendingGeneration: (id: string) => void;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

interface GalleryProviderProps {
  children: ReactNode;
}

export function GalleryProvider({ children }: GalleryProviderProps) {
  const [images, setImages] = useState<string[]>([]);
  const [generationBatches, setGenerationBatches] = useState<GenerationBatch[]>([]);
  const [pendingGenerations, setPendingGenerations] = useState<PendingGeneration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Group images into batches of 4 (each generation creates 4 images)
  const groupImagesIntoBatches = (imageUrls: string[]): GenerationBatch[] => {
    const batches: GenerationBatch[] = [];
    
    for (let i = 0; i < imageUrls.length; i += 4) {
      const batchImages = imageUrls.slice(i, i + 4);
      const batch: GenerationBatch = {
        id: `batch-${i / 4}`,
        images: batchImages,
        generatedAt: new Date(), // In real app, this would come from API
      };
      batches.push(batch);
    }
    
    return batches;
  };

  const refresh = async () => {
    try {
      console.log('[GalleryContext] Refreshing gallery...');
      setIsLoading(true);
      setErrorMessage(null);
      
      const currentImageCount = images.length;
      
      // Try to fetch images with proper batch information
      const batchResponse = await APIService.fetchImageBatches();
      console.log('[GalleryContext] API returned', batchResponse.count, 'image batches');
      
      // Flatten batches to get all images for backwards compatibility
      const allImages = batchResponse.batches.flatMap(batch => batch.images);
      console.log('[GalleryContext] Total images:', allImages.length, '(was', currentImageCount, ')');
      
      // Check if we have new images (indicating a generation completed)
      if (allImages.length > currentImageCount && pendingGenerations.length > 0) {
        const newImagesCount = allImages.length - currentImageCount;
        console.log(`[GalleryContext] 🎉 Detected ${newImagesCount} new images, removing pending generations`);
        
        // Remove pending generations (now we can potentially match by timestamp)
        setPendingGenerations([]);
      }
      
      // Set flattened images for backwards compatibility
      setImages(allImages);
      
      // Convert API batches to our GenerationBatch format
      const generationBatches: GenerationBatch[] = batchResponse.batches.map(batch => ({
        id: batch.higgsfield_id || batch.id,
        images: batch.images,
        generatedAt: new Date(batch.created_at),
      }));
      
      console.log('[GalleryContext] Created', generationBatches.length, 'properly grouped generation batches');
      setGenerationBatches(generationBatches);

      // Preload gallery images with high priority for development
      if (allImages.length > 0) {
        const imagesToPreload = allImages.slice(0, 200);
        console.log(`[GalleryContext] Preloading ${imagesToPreload.length} images with HIGH priority`);
        await ImageCacheManager.preloadImages(imagesToPreload, CachePriority.HIGH);
      }
    } catch (error: any) {
      console.error('[GalleryContext] Failed to load images:', error);
      setErrorMessage(error.message || 'Failed to load images');
    } finally {
      setIsLoading(false);
    }
  };

  const addPendingGeneration = (preset: { name: string; image_url: string }): string => {
    const id = `pending_${Date.now()}`;
    const pendingGen: PendingGeneration = {
      id,
      preset,
      timestamp: new Date(),
    };
    
    console.log('[GalleryContext] Adding pending generation skeleton:', id);
    setPendingGenerations(prev => [...prev, pendingGen]);
    return id;
  };

  const removePendingGeneration = (id: string) => {
    console.log('[GalleryContext] Removing pending generation:', id);
    setPendingGenerations(prev => prev.filter(p => p.id !== id));
  };

  // Load images on mount
  useEffect(() => {
    refresh();
  }, []);

  // Listen for generation completion notifications
  useEffect(() => {
    const handleGenerationCompleted = (data: any) => {
      console.log('[GalleryContext] 🎉 Generation completed notification received:', data);
      
      // Refresh gallery to show new images
      refresh();
      
      // Remove any matching pending generation
      if (data.generationId) {
        setPendingGenerations(prev => prev.filter(p => !p.id.includes(data.generationId)));
      }
    };

    // Subscribe to notification events
    const subscription = NotificationService.on('generationCompleted', handleGenerationCompleted);

    // Cleanup listener on unmount
    return () => {
      subscription.remove();
    };
  }, []);

  // Fallback polling when pending generations exist (since push notifications might not work)
  useEffect(() => {
    console.log('[GalleryContext] 🔍 Checking pending generations count:', pendingGenerations.length);
    if (pendingGenerations.length === 0) {
      console.log('[GalleryContext] 🔍 No pending generations, skipping fallback polling');
      return;
    }

    console.log('[GalleryContext] 🔄 Pending generations detected, starting fallback polling');
    let pollCount = 0;
    const maxPolls = 40; // 20 minutes max (30s * 40 = 1200s) - shorter than training since generation is faster
    
    const interval = setInterval(() => {
      pollCount++;
      console.log(`[GalleryContext] Fallback poll ${pollCount}/${maxPolls} - refreshing gallery`);
      
      if (pollCount >= maxPolls) {
        console.log('[GalleryContext] Fallback polling timeout reached, stopping');
        clearInterval(interval);
        // Remove pending generations that timed out
        console.log(`[GalleryContext] Removing ${pendingGenerations.length} timed-out pending generations`);
        setPendingGenerations([]);
        return;
      }
      
      refresh();
    }, 30000); // Check every 30 seconds

    return () => {
      console.log('[GalleryContext] Stopping fallback polling');
      clearInterval(interval);
    };
  }, [pendingGenerations.length]);

  const contextValue: GalleryContextType = {
    images,
    generationBatches,
    pendingGenerations,
    isLoading,
    errorMessage,
    refresh,
    addPendingGeneration,
    removePendingGeneration,
  };

  return (
    <GalleryContext.Provider value={contextValue}>
      {children}
    </GalleryContext.Provider>
  );
}

export function useGallery(): GalleryContextType {
  const context = useContext(GalleryContext);
  if (context === undefined) {
    throw new Error('useGallery must be used within a GalleryProvider');
  }
  return context;
}

export default GalleryContext;
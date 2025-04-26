import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/components/services/firebaseService';
import { ImageMeta } from '../DemoWrapper';
import { useSnack } from '@/components/common/feedback/Snackbar';
import { SocialMediaInstance } from '@/components/ui/social-media-switch';

// Cache for storing normalized data to prevent unnecessary processing
const normalizedDataCache = new Map<string, { data: { [id: string]: ImageMeta }, timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds TTL for cache

interface UseImageMetadataStateProps {
  projectId: string;
  activeInstance: SocialMediaInstance;
  cardsInTransit: Set<string>;
}

export function useImageMetadataState({ 
  projectId, 
  activeInstance, 
  cardsInTransit 
}: UseImageMetadataStateProps) {
  const [imageMetadata, setImageMetadata] = useState<{ [id: string]: ImageMeta }>({});
  const [isLoading, setIsLoading] = useState(false);
  const { createSnack } = useSnack();
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialLoadRef = useRef(true);

  // Memoized function to normalize data
  const normalizeData = useCallback((instanceData: Record<string, any>) => {
    const cacheKey = JSON.stringify({ instanceData, activeInstance });
    const cached = normalizedDataCache.get(cacheKey);
    
    // Return cached data if it's still valid
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const normalizedData: { [id: string]: ImageMeta } = {};

    Object.entries(instanceData).forEach(([id, metaData]) => {
      const meta = metaData as Record<string, any>;
      
      // Handle lastMoved with proper type checking
      let lastMoved: Date = new Date();
      if (meta.lastMoved) {
        if (typeof meta.lastMoved.toDate === 'function') {
          lastMoved = meta.lastMoved.toDate();
        } else if (meta.lastMoved instanceof Date) {
          lastMoved = meta.lastMoved;
        } else if (typeof meta.lastMoved === 'string' || typeof meta.lastMoved === 'number') {
          const parsed = new Date(meta.lastMoved);
          if (!isNaN(parsed.getTime())) {
            lastMoved = parsed;
          }
        }
      }

      normalizedData[id] = {
        url: meta.url || '',
        title: meta.title || '',
        description: meta.description || '',
        caption: meta.caption ?? '',
        label: meta.label || '',
        comment: meta.comment || '',
        videoEmbed: meta.videoEmbed ?? '',
        contentType: meta.contentType || '',
        location: meta.location || 'pool',
        lastMoved,
        comments: Array.isArray(meta.comments) ? meta.comments : [],
        carouselArrangement: Array.isArray(meta.carouselArrangement) ? meta.carouselArrangement : [],
        attachments: Array.isArray(meta.attachments) ? meta.attachments : [],
        id
      };
    });

    // Cache the normalized data
    normalizedDataCache.set(cacheKey, {
      data: normalizedData,
      timestamp: Date.now()
    });

    return normalizedData;
  }, []);

  // Setup Firestore listener
  useEffect(() => {
    if (!projectId) return;

    // Only show loading on initial load
    if (isInitialLoadRef.current) {
      setIsLoading(true);
    }

    const docRef = doc(db, 'projects', projectId);

    const unsub = onSnapshot(
      docRef,
      (docSnapshot) => {
        // Skip updates if cards are in transit
        if (cardsInTransit.size > 0) {
          console.log('Skipping Firestore update while cards are in transit');
          return;
        }

        // Clear existing timeout
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        // Debounce updates
        debounceTimeoutRef.current = setTimeout(() => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const firestoreField = activeInstance === 'facebook' ? 'fbig' : activeInstance;
            const instanceData = data?.imageMetadata?.[firestoreField] || {};

            // Use memoized normalize function
            const normalizedData = normalizeData(instanceData);
            setImageMetadata(normalizedData);
          } else {
            setImageMetadata({});
          }

          setIsLoading(false);
          isInitialLoadRef.current = false;
        }, 250); // Increased debounce time for better performance
      },
      (error) => {
        console.error(`Error in Firestore listener for ${activeInstance}:`, error);
        setIsLoading(false);
        setImageMetadata({});
        createSnack(`Failed to load ${activeInstance} data. Please try again.`, 'error');
      }
    );

    // Cleanup
    return () => {
      unsub();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [projectId, activeInstance, cardsInTransit, normalizeData, createSnack]);

  return {
    imageMetadata,
    isLoading,
    setImageMetadata
  };
} 
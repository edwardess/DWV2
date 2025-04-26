import { useState, useCallback, useRef } from 'react';
import { ImageMeta } from '../DemoWrapper';

interface UseDragDropStateProps {
  imageMetadata: { [id: string]: ImageMeta };
  onUpdateMetadata: (data: { [id: string]: ImageMeta }) => Promise<void>;
}

export function useDragDropState({ 
  imageMetadata, 
  onUpdateMetadata 
}: UseDragDropStateProps) {
  const [cardsInTransit, setCardsInTransit] = useState<Set<string>>(new Set());
  const pendingUpdatesRef = useRef<Map<string, ImageMeta>>(new Map());
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  // Batch updates to reduce Firestore writes
  const batchUpdate = useCallback(() => {
    if (pendingUpdatesRef.current.size === 0) return;

    const updates = { ...imageMetadata };
    pendingUpdatesRef.current.forEach((meta, id) => {
      updates[id] = meta;
    });

    onUpdateMetadata(updates).finally(() => {
      pendingUpdatesRef.current.clear();
      setCardsInTransit(new Set());
    });
  }, [imageMetadata, onUpdateMetadata]);

  // Add an image to transit state
  const addToTransit = useCallback((imageId: string) => {
    setCardsInTransit(prev => {
      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });
  }, []);

  // Remove an image from transit state
  const removeFromTransit = useCallback((imageId: string) => {
    setCardsInTransit(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
  }, []);

  // Queue an update for batch processing
  const queueUpdate = useCallback((imageId: string, metadata: ImageMeta) => {
    pendingUpdatesRef.current.set(imageId, metadata);

    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Schedule batch update
    updateTimeoutRef.current = setTimeout(() => {
      batchUpdate();
    }, 1000); // 1 second debounce
  }, [batchUpdate]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      batchUpdate(); // Process any pending updates
    }
  }, [batchUpdate]);

  return {
    cardsInTransit,
    addToTransit,
    removeFromTransit,
    queueUpdate,
    cleanup
  };
} 
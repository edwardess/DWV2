"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSnack } from "@/components/common/feedback/Snackbar";
import { ContinuousCalendar } from "@/components/pages/Calendar";
import { Bars3Icon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/components/services/firebaseService";
import ContentPool from "@/components/common/media/ContentPool";
import { useAuth } from "@/contexts/AuthContext";
import { type SocialMediaInstance } from "@/components/ui/social-media-switch";
import { useImageMetadataState } from './useImageMetadataState';
import { useLocalStorageState, isViewMode, isTabType, ViewMode, TabType } from './useLocalStorageState';
import { useDragDropState } from './useDragDropState';
import { sanitizeForFirestore } from '@/utils/firestore';
import { ensureRequiredFields } from '@/utils/validation';
import { memoize } from '@/utils/performance';
import { DemoWrapperProps, ImageMeta } from './types';
import { useFirestore, useFirestoreCollectionData } from '@/lib/firebase/reactfire';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import debounce from 'lodash/debounce';
import { ImageWithLoading } from '@/components/common/media/ImageWithLoading';
import { MessengerModal } from '@/components/modals/MessengerModal';
import { useToast } from '@/hooks/useToast';

export default function DemoWrapper_Optimized({ projectId, projectName }: DemoWrapperProps) {
  const { createSnack } = useSnack();
  const { user } = useAuth();
  const firestore = useFirestore();
  const { showToast } = useToast();

  const [images, setImages] = useState<ImageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageMeta | null>(null);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);

  // Local storage state
  const [selectedProjectId, setSelectedProjectId] = useLocalStorageState({
    key: 'selectedProjectId',
    defaultValue: projectId || '',
    validator: (v): v is string => typeof v === 'string'
  });

  const [activeTab, setActiveTab] = useLocalStorageState<TabType>({
    key: 'activeTab',
    defaultValue: 'FBA CARE MAIN',
    validator: isTabType
  });

  const [activeInstance, setActiveInstance] = useLocalStorageState<SocialMediaInstance>({
    key: 'activeInstance',
    defaultValue: 'instagram',
    validator: (v): v is SocialMediaInstance => ['instagram', 'facebook', 'tiktok'].includes(v)
  });

  const [poolViewMode, setPoolViewMode] = useLocalStorageState<ViewMode>({
    key: 'poolViewMode',
    defaultValue: 'full',
    validator: isViewMode
  });

  const [contentPoolVisible, setContentPoolVisible] = useLocalStorageState({
    key: 'contentPoolVisible',
    defaultValue: true,
    validator: (v): v is boolean => typeof v === 'boolean'
  });

  // Collection reference for images
  const imagesRef = useMemo(() => {
    return collection(firestore, 'images');
  }, [firestore]);
  
  // Query for images
  const imagesQuery = useMemo(() => {
    return query(
      imagesRef,
      where('projectId', '==', projectId),
      orderBy('lastMoved', 'desc'),
      limit(100)
    );
  }, [imagesRef, projectId]);
  
  // Subscribe to images collection
  const { data: imageData, status } = useFirestoreCollectionData(imagesQuery, {
    idField: 'id',
  });
  
  // Process image data with memoization
  const processedImages = useMemo(() => {
    return memoize(`processedImages-${imageData?.length}`, () => {
      return (imageData as ImageMeta[])?.map(img => ensureRequiredFields(img)) ?? [];
    });
  }, [imageData]);
  
  // Update local state when Firestore data changes
  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
    } else if (status === 'error') {
      setError('Failed to load images');
      setLoading(false);
    } else {
      setImages(processedImages);
      setLoading(false);
      setError(null);
    }
  }, [status, processedImages]);
  
  // Debounced update function
  const updateImageMetadata = useCallback(
    debounce(async (imageId: string, updates: Partial<ImageMeta>) => {
      try {
        const sanitizedUpdates = sanitizeForFirestore(updates);
        await firestore.doc(`images/${imageId}`).update(sanitizedUpdates);
      } catch (err) {
        console.error('Error updating image:', err);
        showToast('error', 'Failed to update image');
      }
    }, 250),
    [firestore, showToast]
  );
  
  // Handle image selection
  const handleImageSelect = useCallback((image: ImageMeta) => {
    setSelectedImage(image);
    setSidebarVisible(true);
  }, []);
  
  // Handle messenger modal
  const toggleMessenger = useCallback(() => {
    setIsMessengerOpen(prev => !prev);
  }, []);

  // Update selectedProjectId when prop changes
  useEffect(() => {
    if (projectId && projectId !== selectedProjectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId, selectedProjectId, setSelectedProjectId]);

  // Image metadata state with optimized Firebase listener
  const { imageMetadata, isLoading, setImageMetadata } = useImageMetadataState({
    projectId: selectedProjectId,
    activeInstance,
    cardsInTransit: new Set()
  });

  // Optimized update function with retry logic
  const updateImageMetadataFirebase = useCallback(async (updatedInstanceData: { [id: string]: ImageMeta }) => {
    if (!selectedProjectId) {
      console.error("Project ID is not provided");
      createSnack("Project ID is missing", "error");
      return;
    }

    // Validate data
    const validationErrors: string[] = [];
    Object.entries(updatedInstanceData).forEach(([id, meta]) => {
      if (!meta.url || typeof meta.url !== 'string') validationErrors.push(`Image ${id} is missing valid URL`);
      if (!meta.title || typeof meta.title !== 'string') validationErrors.push(`Image ${id} is missing title`);
      if (!meta.location || typeof meta.location !== 'string') validationErrors.push(`Image ${id} is missing location`);
    });

    if (validationErrors.length > 0) {
      console.error("Validation errors:", validationErrors);
      createSnack(`Data validation failed: ${validationErrors[0]}`, "error");
      return;
    }

    // Process data
    const safeInstanceData = ensureRequiredFields(updatedInstanceData);
    const sanitizedInstanceData = sanitizeForFirestore(safeInstanceData);

    // Update with retry logic
    const maxRetries = 2;
    let retryCount = 0;
    let success = false;

    while (retryCount <= maxRetries && !success) {
      try {
        const docRef = doc(db, "projects", selectedProjectId);
        const updateField = activeInstance === "facebook" ? "fbig" : activeInstance;
        
        await updateDoc(docRef, {
          [`imageMetadata.${updateField}`]: sanitizedInstanceData
        });
        
        success = true;
      } catch (error) {
        console.error(`Error updating metadata (attempt ${retryCount + 1}):`, error);
        retryCount++;
        
        if (retryCount > maxRetries) {
          createSnack("Failed to update content. Please try again.", "error");
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }, [selectedProjectId, activeInstance, createSnack]);

  // Drag and drop state management
  const { cardsInTransit, addToTransit, removeFromTransit, queueUpdate, cleanup } = useDragDropState({
    imageMetadata,
    onUpdateMetadata: updateImageMetadataFirebase
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Handlers
  const handleDayDrop = useCallback(async (day: number, month: number, year: number, imageId: string) => {
    if (!imageMetadata[imageId]) {
      console.error("Image not found in metadata:", imageId);
      return;
    }

    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    addToTransit(imageId);

    const updatedMeta: ImageMeta = {
      ...imageMetadata[imageId],
      location: date,
      lastMoved: new Date()
    };

    queueUpdate(imageId, updatedMeta);
  }, [imageMetadata, addToTransit, queueUpdate]);

  const handlePoolDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const imageId = e.dataTransfer.getData("imageId");
    
    if (!imageMetadata[imageId]) {
      console.error("Image not found in metadata:", imageId);
      return;
    }

    addToTransit(imageId);

    const updatedMeta: ImageMeta = {
      ...imageMetadata[imageId],
      location: "pool",
      lastMoved: new Date()
    };

    queueUpdate(imageId, updatedMeta);
  }, [imageMetadata, addToTransit, queueUpdate]);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="demo-wrapper">
      <ContinuousCalendar
        images={images}
        onImageSelect={handleImageSelect}
        onImageUpdate={updateImageMetadata}
        loading={loading}
      />
      
      {selectedImage && (
        <div className={`sidebar ${sidebarVisible ? 'visible' : ''}`}>
          <ImageWithLoading
            src={selectedImage.url}
            alt={selectedImage.title || 'Selected image'}
            onClose={() => setSidebarVisible(false)}
          />
        </div>
      )}
      
      {isMessengerOpen && (
        <MessengerModal
          isOpen={isMessengerOpen}
          onClose={toggleMessenger}
          projectId={projectId}
          userId={user?.uid}
        />
      )}
    </div>
  );
} 
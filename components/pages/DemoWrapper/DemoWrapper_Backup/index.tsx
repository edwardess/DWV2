// Put the components/DemoWrapper.tsx code here 

// DemoWrapper.tsx
"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import HashLoader from "react-spinners/HashLoader";
import { useSnack } from "@/components/common/feedback/Snackbar";
import { ContinuousCalendar } from "@/components/pages/Calendar";
import { Bars3Icon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { db } from "@/components/services/firebaseService";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  deleteField,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import ContentPool from "@/components/common/media/ContentPool";
import UploadModal from "@/components/modals/UploadModal";
import DetailsModal, { ExtendedImageMeta } from "@/components/modals/DetailsModal";
import { CarouselPhoto } from "@/components/modals/DetailsModalParts/RenderSecondColumn";
import AttachmentDropZone, { Attachment } from "@/components/common/media/AttachmentDropZone";
import { useAuth } from "@/components/services/AuthProvider";
import ContentPoolImage from "@/components/common/media/ContentPoolImage";
import { type SocialMediaInstance } from "@/components/ui/social-media-switch";
import { createApprovalNotification, createCommentNotification, createStatusChangeNotification, createEditNotification } from '@/components/services/NotificationService';
import { useLocalStorage } from '@/components/hooks/useLocalStorage';
import { 
  isViewMode, 
  isTabType, 
  isSocialMediaInstance, 
  isString, 
  isBoolean,
  type ViewMode,
  type TabType
} from '@/components/hooks/stateValidators';

// Helper function to sanitize objects for Firestore
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  
  // Handle objects
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip undefined values
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value);
    } else if (key === 'caption') {
      // Explicitly set caption to empty string if undefined
      sanitized[key] = '';
    }
  }
  
  return sanitized;
}

// Utility function to safely convert any value to a Date
function safelyConvertToDate(value: any): Date {
  if (!value) return new Date();
  
  // If it's already a Date object, return it
  if (value instanceof Date) return value;
  
  // If it's a Firestore Timestamp with toDate method
  if (value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  
  // If it's a string or number, try to convert it
  if (typeof value === 'string' || typeof value === 'number') {
    try {
      const date = new Date(value);
      // Check if valid date
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      console.warn('Error converting to Date:', e);
    }
  }
  
  // Fallback to current date
  return new Date();
}

// Helper function to ensure caption and remove undefined values in nested objects
function ensureRequiredFields(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => ensureRequiredFields(item));
  }
  
  // Handle objects
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // Set default values for undefined fields
      if (key === 'caption') result[key] = '';
      else if (key === 'comments') result[key] = [];
      else if (key === 'attachments') result[key] = [];
      else if (key === 'carouselArrangement') result[key] = [];
      else if (key === 'lastMoved') result[key] = new Date();
      // Skip other undefined values
    } else if (typeof value === 'object' && value !== null) {
      // Recursively process nested objects
      result[key] = ensureRequiredFields(value);
    } else if (key === 'lastMoved') {
      // Special handling for lastMoved to ensure it's a Date
      result[key] = safelyConvertToDate(value);
    } else {
      result[key] = value;
    }
  }
  
  // Ensure required fields exist
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    if (obj.hasOwnProperty('caption') === false) result.caption = '';
    if (obj.hasOwnProperty('comments') === false && obj.id) result.comments = [];
    if (obj.hasOwnProperty('attachments') === false && obj.id) result.attachments = [];
    if (obj.hasOwnProperty('lastMoved') === false) result.lastMoved = new Date();
    else if (obj.hasOwnProperty('lastMoved')) {
      // Ensure existing lastMoved is a proper Date
      result.lastMoved = safelyConvertToDate(obj.lastMoved);
    }
  }
  
  return result;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface ImageMeta {
  url: string;
  title: string;
  description: string;
  caption: string;
  label: string;
  comment: string;
  videoEmbed?: string;
  contentType: string;
  location: string;
  lastMoved: Date; // Always a proper Date object
  attachments?: Attachment[];
  comments?: any[]; // Ensure comments is always an array.
  id?: string;
  carouselArrangement?: CarouselPhoto[];
  [key: string]: any; // Allow indexed access for dynamic properties
}

interface DemoWrapperProps {
  projectId: string; // Must be non-empty when a project is selected
  projectName?: string;
}

async function uploadFile(file: File): Promise<string> {
  const storage = getStorage();
  const fileRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
  // Set cache-control to allow caching for 1 year (adjust as needed)
  const metadata = { cacheControl: "public, max-age=31536000" };
  const uploadTask = uploadBytesResumable(fileRef, file, metadata);
  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null,
      (error) => {
        console.error("Upload error:", error);
        reject(error);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadURL) => {
            console.log("File uploaded successfully:", downloadURL);
            resolve(downloadURL);
          })
          .catch((err) => {
            console.error("Download URL error:", err);
            reject(err);
          });
      }
    );
  });
}

export default function DemoWrapper({ projectId, projectName }: DemoWrapperProps) {
  const { createSnack } = useSnack();
  const { user } = useAuth();

  // Convert localStorage state to use new hook
  const [selectedProjectId, setSelectedProjectId] = useLocalStorage({
    key: "selectedProjectId",
    defaultValue: projectId || "",
    validator: isString
  });

  const [activeTab, setActiveTab] = useLocalStorage<TabType>({
    key: "activeTab",
    defaultValue: "FBA CARE MAIN",
    validator: isTabType
  });

  const [activeInstance, setActiveInstance] = useLocalStorage<SocialMediaInstance>({
    key: "activeInstance",
    defaultValue: "instagram",
    validator: isSocialMediaInstance
  });

  const [poolViewMode, setPoolViewMode] = useLocalStorage<ViewMode>({
    key: "poolViewMode",
    defaultValue: "full",
    validator: isViewMode
  });

  const [contentPoolVisible, setContentPoolVisible] = useLocalStorage({
    key: "contentPoolVisible",
    defaultValue: true,
    validator: isBoolean
  });

  // When projectId prop changes, update selectedProjectId
  useEffect(() => {
    if (projectId && projectId !== selectedProjectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId, selectedProjectId, setSelectedProjectId]);

  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [imageMetadata, setImageMetadata] = useState<{ [id: string]: ImageMeta }>({});
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [currentDetailsId, setCurrentDetailsId] = useState<string>("");
  const [detailsEditMode, setDetailsEditMode] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [detailsEditAttachments, setDetailsEditAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Track IDs of invalid entries we've already cleaned up
  const cleanedInvalidIdsRef = useRef<Set<string>>(new Set());

  // Track which IDs are currently being processed to prevent duplicate operations
  const processingApprovalIds = useRef<Set<string>>(new Set());

  // Add a new state to track cards that are currently being dragged
  const [cardsInTransit, setCardsInTransit] = useState<Set<string>>(new Set());

  // When contentPoolVisible changes, update localStorage
  useEffect(() => {
    localStorage.setItem("contentPoolVisible", contentPoolVisible.toString());
  }, [contentPoolVisible]);

  // Process file attachments
  const processAttachmentFiles = async (
    files: File[],
    setAttachmentFn: React.Dispatch<React.SetStateAction<Attachment[]>>
  ) => {
    const remaining = 5 - (setAttachmentFn === setDetailsEditAttachments ? detailsEditAttachments.length : 0);
    const filesArray = Array.from(files).slice(0, remaining);
    setIsLoading(true);
    try {
      const uploads = filesArray.map(async (file) => {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
          createSnack("Only images and videos are allowed.", "error");
          return null;
        }
        if (file.size > 300 * 1024 * 1024) {
          createSnack("File size exceeds 300MB limit.", "error");
          return null;
        }
        const downloadURL = await uploadFile(file);
        return { url: downloadURL, name: file.name };
      });
      const results = await Promise.all(uploads);
      const validResults = results.filter((result): result is Attachment => result !== null);
      setAttachmentFn(prev => [...prev, ...validResults]);
    } catch (error) {
      console.error("Attachment upload error:", error);
      createSnack("Failed to upload attachment.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Log activity to the "activities" subcollection of the project.
  async function logActivity(message: string) {
    if (!selectedProjectId || !user) return;
    try {
      const activitiesCollection = collection(db, "projects", selectedProjectId, "activities");
      await addDoc(activitiesCollection, {
        message,
        timestamp: serverTimestamp(),
        user: {
          uid: user.uid,
          displayName: user.displayName || user.email,
        },
      });
      console.log("Activity logged:", message);
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }

  // Listen for changes to the selected project document and update imageMetadata.
  useEffect(() => {
    if (!selectedProjectId) return;
    
    // Only show loading when initially loading data, not for every Firestore update
    // This prevents the loading spinner from showing during drag operations
    if (Object.keys(imageMetadata).length === 0) {
      setIsLoading(true);
    }
    
    const docRef = doc(db, "projects", selectedProjectId);
    
    // Create a variable to track if this is the initial load
    let isInitialLoad = Object.keys(imageMetadata).length === 0;
    
    // Use a timeout to debounce rapid Firestore updates
    let debounceTimeout: NodeJS.Timeout | null = null;
    
    const unsub = onSnapshot(
      docRef, 
      (docSnapshot) => {
        // Skip updating if there are cards in transit
        if (cardsInTransit.size > 0) {
          console.log('Skipping Firestore update while cards are in transit');
          return;
        }
        
        // Clear any existing timeout to debounce rapid updates
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
        }
        
        // Use a short debounce to batch rapid Firestore updates
        debounceTimeout = setTimeout(() => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            let instanceData = {};
            let firestoreField: string = activeInstance;
            
            // Map UI instance to Firestore field
            if (activeInstance === "facebook") {
              firestoreField = "fbig";
            }
            
            // Get data from the correct Firestore field based on active instance
            if (activeInstance === "facebook") {
              instanceData = data.imageMetadata?.fbig || {};
            } else if (activeInstance === "instagram") {
              instanceData = data.imageMetadata?.instagram || {};
            } else if (activeInstance === "tiktok") {
              instanceData = data.imageMetadata?.tiktok || {};
            } else {
              instanceData = data.imageMetadata?.[activeInstance] || {};
            }
            
            // Process the data without excessive logging
            const normalizedData: { [id: string]: ImageMeta } = {};
            
            Object.entries(instanceData).forEach(([id, metaData]) => {
              const meta = metaData as Record<string, any>;
              
              // Handle lastMoved specifically to ensure it's a valid Date
              let lastMoved: Date;
              if (meta.lastMoved) {
                if (typeof meta.lastMoved.toDate === "function") {
                  lastMoved = meta.lastMoved.toDate();
                } else if (meta.lastMoved instanceof Date) {
                  lastMoved = meta.lastMoved;
                } else if (typeof meta.lastMoved === 'string' || typeof meta.lastMoved === 'number') {
                  try {
                    lastMoved = new Date(meta.lastMoved);
                    if (isNaN(lastMoved.getTime())) {
                      lastMoved = new Date();
                    }
                  } catch (e) {
                    lastMoved = new Date();
                  }
                } else {
                  lastMoved = new Date();
                }
              } else {
                lastMoved = new Date();
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
                lastMoved: lastMoved,
                comments: meta.comments || [],
                carouselArrangement: meta.carouselArrangement || [],
                attachments: meta.attachments || [],
                id: id
              };
            });
            
            setImageMetadata(normalizedData);
          } else {
            setImageMetadata({});
          }
          
          // Always turn off loading indicator when data is loaded or no data exists
          setIsLoading(false);
          isInitialLoad = false;
        }, 50); // Short debounce for batching updates
      },
      (error) => {
        // Handle any errors with the listener
        console.error(`Error in Firestore listener for ${activeInstance}:`, error);
        // Ensure loading is turned off even when there's an error
        setIsLoading(false);
        // Set empty data on error to avoid showing stale data
        setImageMetadata({});
        // Optionally show a notification about the error
        createSnack(`Failed to load ${activeInstance} data. Please try again.`, "error");
      }
    );
    
    return () => {
      unsub();
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [selectedProjectId, activeInstance, cardsInTransit]);

  // Update the project's imageMetadata field in Firestore.
  const updateImageMetadata = async (updatedInstanceData: { [id: string]: ImageMeta }) => {
    if (!selectedProjectId) {
      console.error("Project ID is not provided");
      createSnack("Project ID is missing", "error");
      return;
    }

    // Basic validation of the updatedInstanceData
    if (!updatedInstanceData || typeof updatedInstanceData !== 'object') {
      console.error("Invalid image metadata provided", updatedInstanceData);
      createSnack("Invalid image data format", "error");
      return;
    }

    // Validate that all entries have required fields
    const validationErrors: string[] = [];
    Object.entries(updatedInstanceData).forEach(([id, meta]) => {
      if (!meta.url || typeof meta.url !== 'string') {
        validationErrors.push(`Image ${id} is missing valid URL`);
      }
      // Add minimal validation for critical fields
      if (!meta.title || typeof meta.title !== 'string') {
        validationErrors.push(`Image ${id} is missing title`);
      }
      if (!meta.location || typeof meta.location !== 'string') {
        validationErrors.push(`Image ${id} is missing location`);
      }
    });

    if (validationErrors.length > 0) {
      console.error("Validation errors:", validationErrors);
      createSnack(`Data validation failed: ${validationErrors[0]}`, "error");
      return;
    }

    // Apply safety functions to ensure all required fields are present
    const safeInstanceData = ensureRequiredFields(updatedInstanceData);
    
    // Sanitize to remove any undefined values before saving to Firestore
    const sanitizedInstanceData = sanitizeForFirestore(safeInstanceData);

    const maxRetries = 2;
    let retryCount = 0;
    let success = false;

    while (retryCount <= maxRetries && !success) {
      try {
        // Performance optimization: Only get existing data if needed
        const projectDocRef = doc(db, "projects", selectedProjectId);
        
        // Determine the Firestore field to update based on active instance
        let firestoreInstance: string = activeInstance;
        
        // For Facebook, we need to save to the 'fbig' field to maintain compatibility
        if (activeInstance === "facebook") {
          firestoreInstance = "fbig";
        }
        
        // Create a shallower update object to reduce processing overhead
        const updateObj = {
          [`imageMetadata.${firestoreInstance}`]: sanitizedInstanceData
        };
        
        // Use merge option to preserve other fields
        await setDoc(projectDocRef, updateObj, { merge: true });
        
        // Update local state 
        setImageMetadata(sanitizedInstanceData);
        console.log(`Updated image metadata for ${activeInstance} instance (saved to ${firestoreInstance})`);
        success = true;
      } catch (error) {
        retryCount++;
        console.error(`Error updating image metadata (attempt ${retryCount}/${maxRetries}):`, error);
        
        // Only show error to user if all retries have failed
        if (retryCount > maxRetries) {
          createSnack("Failed to update image metadata after multiple attempts", "error");
        } else {
          // Wait briefly before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
          console.log(`Retrying update (${retryCount}/${maxRetries})...`);
        }
      }
    }
  };

  // Group dropped images by cell (location)
  const groupedDroppedImages = useMemo(() => {
    const obj: { [date: string]: Array<{ id: string; url: string }> } = {};
    if (!imageMetadata) return obj;
    
    Object.entries(imageMetadata).forEach(([id, meta]) => {
      if (meta.location !== "pool") {
        if (!obj[meta.location]) {
          obj[meta.location] = [];
        }
        obj[meta.location].push({ id, url: meta.url });
      }
    });
    return obj;
  }, [imageMetadata]);

  // Get images from the pool
  const poolImages = useMemo(() => {
    const images: Array<{ id: string; url: string }> = [];
    if (!imageMetadata) return images;
    
    Object.entries(imageMetadata).forEach(([id, meta]) => {
      // Only add images with valid URLs and in the pool location
      if (meta.location === "pool" && meta.url && meta.url.trim() !== '') {
        images.push({ id, url: meta.url });
      }
    });
    
    // Log if we find any entries with empty URLs for debugging
    if (Object.keys(imageMetadata).length > 0 && images.length === 0) {
      console.warn("No valid pool images found, but imageMetadata has entries", Object.keys(imageMetadata).length);
    }
    
    return images;
  }, [imageMetadata]);

  // Handler for dropping an image onto a calendar cell.
  const handleDayDrop = async (day: number, month: number, year: number, imageId: string) => {
    if (!selectedProjectId) {
      createSnack("Project not selected.", "error");
      return;
    }
    
    const targetKey = `${year}-${month}-${day}`;
    
    if (!imageMetadata[imageId]) {
      createSnack("Image not found in metadata.", "error");
      return;
    }
    
    // Don't proceed if the image is already at the target location
    if (imageMetadata[imageId].location === targetKey) return;
    
    // Create a new Date object for lastMoved
    const now = new Date();
    
    // Add imageId to cards in transit to prevent UI flicker
    setCardsInTransit(prev => {
      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });
    
    // Create optimistic update for responsive UI immediately 
    const updatedImageMetadata = { 
      ...imageMetadata,
      [imageId]: {
        ...imageMetadata[imageId],
        location: targetKey,
        lastMoved: now,
        caption: imageMetadata[imageId].caption || ''
      }
    };
    
    // Store original state for rollback if needed
    const originalMetadata = {...imageMetadata};
    
    // Update the local state immediately for responsive UI
    setImageMetadata(updatedImageMetadata);
    
    // Show subtle feedback (no loading spinner)
    createSnack(`Moving to ${monthNames[month]} ${day}, ${year}...`, "info");
    
    try {
      // Direct update without retries for better performance
      const projectDocRef = doc(db, "projects", selectedProjectId);
      const firestoreInstance = activeInstance === "facebook" ? "fbig" : activeInstance;
      
      // Create a batch for better performance when updating multiple fields
      const batch = writeBatch(db);
      
      // Update the specific fields needed (reduces data transfer size)
      batch.update(projectDocRef, {
        [`imageMetadata.${firestoreInstance}.${imageId}.location`]: targetKey,
        [`imageMetadata.${firestoreInstance}.${imageId}.lastMoved`]: now,
        [`imageMetadata.${firestoreInstance}.${imageId}.caption`]: imageMetadata[imageId].caption || ''
      });
      
      // Commit the batch operations
      await batch.commit();
      
      // Log the activity after successful update
      logActivity(`${user?.displayName} dropped '${imageMetadata[imageId].title}' on ${monthNames[month]} ${day}, ${year}`);
      
      // Success feedback is subtle
      createSnack(`Moved to ${monthNames[month]} ${day}, ${year}`, "success");
    } catch (error) {
      console.error("Error moving image:", error);
      
      // Revert the local state if update failed
      setImageMetadata(originalMetadata);
      createSnack("Failed to update image location", "error");
    } finally {
      // Remove the card from transit state after a delay to prevent Firestore listener race conditions
      setTimeout(() => {
        setCardsInTransit(prev => {
          const newSet = new Set(prev);
          newSet.delete(imageId);
          return newSet;
        });
      }, 300); // Reduced delay for better responsiveness
    }
  };

  // Handler for dropping an image back to pool.
  const handlePoolDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!selectedProjectId) {
      createSnack("Project not selected.", "error");
      return;
    }
    
    const imageId = e.dataTransfer.getData("imageId");
    if (!imageMetadata[imageId]) {
      console.error("Image not found in metadata:", imageId);
      return;
    }
    
    // Check for empty URL
    if (!imageMetadata[imageId].url || imageMetadata[imageId].url === '') {
      console.error("Attempted to move image with empty URL to pool:", imageId);
      createSnack("Cannot move image with missing URL to pool", "error");
      return;
    }
    
    // Create a new Date object for lastMoved
    const now = new Date();
    
    // Add imageId to cards in transit to prevent UI flicker
    setCardsInTransit(prev => {
      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });
    
    // Store original state for rollback if needed
    const originalMetadata = {...imageMetadata};
    
    // Update the local state immediately for responsive UI
    const updatedImageMetadata = { 
      ...imageMetadata,
      [imageId]: {
        ...imageMetadata[imageId],
        location: "pool",
        lastMoved: now,
        caption: imageMetadata[imageId].caption || ''
      }
    };
    setImageMetadata(updatedImageMetadata);
    
    // Show subtle feedback (no loading spinner)
    createSnack("Moving to pool...", "info");
    
    try {
      // Direct update without retries for better performance
      const projectDocRef = doc(db, "projects", selectedProjectId);
      const firestoreInstance = activeInstance === "facebook" ? "fbig" : activeInstance;
      
      // Create a batch for better performance when updating multiple fields
      const batch = writeBatch(db);
      
      // Update just the specific fields we need to change
      batch.update(projectDocRef, {
        [`imageMetadata.${firestoreInstance}.${imageId}.location`]: "pool",
        [`imageMetadata.${firestoreInstance}.${imageId}.lastMoved`]: now,
        [`imageMetadata.${firestoreInstance}.${imageId}.caption`]: imageMetadata[imageId].caption || ''
      });
      
      // Commit the batch operations
      await batch.commit();
      
      // Log the activity after successful update
      logActivity(`${user?.displayName} moved '${imageMetadata[imageId].title}' back to pool`);
      
      // Success feedback is subtle
      createSnack("Image moved to pool", "success");
    } catch (error) {
      console.error("Error moving image to pool:", error);
      
      // Revert the local state if update failed
      setImageMetadata(originalMetadata);
      createSnack("Failed to move image to pool", "error");
    } finally {
      // Remove the card from transit state after a delay to prevent Firestore listener race conditions
      setTimeout(() => {
        setCardsInTransit(prev => {
          const newSet = new Set(prev);
          newSet.delete(imageId);
          return newSet;
        });
      }, 300); // Reduced delay for better responsiveness
    }
  };

  const handleTabChange = (tab: "FBA CARE MAIN" | "Learning Hub" | "Podcast") => {
    setActiveTab(tab);
    setActiveInstance("facebook");
  };

  const openEditModal = (id: string) => {
    setCurrentDetailsId(id);
    setDetailsModalOpen(true);
  };

  const handleApprove = async (imageId: string) => {
    if (!imageId || !imageMetadata[imageId]) {
      console.warn("Cannot approve: invalid image ID or metadata missing");
      return;
    }
    
    // Track which IDs are currently being processed to prevent duplicate operations
    if (processingApprovalIds.current.has(imageId)) {
      console.log(`Already processing approval for ${imageId}, skipping`);
      return;
    }
    
    // Add this ID to the set of IDs being processed
    processingApprovalIds.current.add(imageId);
    
    setIsLoading(true);
    try {
      // Get the most up-to-date project data
      const projectDocRef = doc(db, "projects", selectedProjectId);
      const currentDoc = await getDoc(projectDocRef);
      
      if (!currentDoc.exists()) {
        throw new Error("Project document not found");
      }
      
      const projectData = currentDoc.data();
      const currentImageMetadata = projectData.imageMetadata || {};
      
      // Determine the Firestore field to use
      let firestoreInstance: string = activeInstance;
      if (activeInstance === "facebook") {
        firestoreInstance = "fbig";
      }
      
      // Get the current instance data
      const instanceData = currentImageMetadata[firestoreInstance] || {};
      
      // Verify the image still exists in Firestore
      if (!instanceData[imageId]) {
        console.warn(`Image ${imageId} not found in Firestore for instance ${firestoreInstance}`);
        createSnack("Content not found in database. Please refresh your page.", "error");
        return;
      }
      
      // Toggle between "Approved" and "Ready for Approval"
      const currentStatus = imageMetadata[imageId].label;
      const newStatus = currentStatus === "Approved" ? "Ready for Approval" : "Approved";
      
      // Update the label to the new status and ensure caption is not undefined
      const updatedMetadata = {
        ...imageMetadata[imageId],
        label: newStatus,
        caption: imageMetadata[imageId].caption || '' // Ensure caption is never undefined
      };
      
      // Apply our safety functions to ensure all required fields have values
      const safeMetadata = ensureRequiredFields(updatedMetadata);
      const sanitizedMetadata = sanitizeForFirestore(safeMetadata);
      
      // Use a more targeted update approach for better performance
      const updateData = {
        [`imageMetadata.${firestoreInstance}.${imageId}.label`]: newStatus,
        [`imageMetadata.${firestoreInstance}.${imageId}.caption`]: updatedMetadata.caption
      };
      
      // Update Firestore with just the changes
      await updateDoc(projectDocRef, updateData);
      
      // Update local state
      setImageMetadata(prevState => ({
        ...prevState,
        [imageId]: {
          ...prevState[imageId],
          label: newStatus
        }
      }));
      
      // User feedback
      if (newStatus === "Approved") {
        createSnack(`${imageMetadata[imageId].title} has been approved`, "success");
        logActivity(`${user?.displayName} approved '${imageMetadata[imageId].title}'`);
      } else {
        createSnack(`${imageMetadata[imageId].title} marked for review`, "info");
        logActivity(`${user?.displayName} marked '${imageMetadata[imageId].title}' for review`);
      }

      // Add notification after successful status update
      if (user && selectedProjectId) {
        await createApprovalNotification(
          selectedProjectId,
          imageId,
          user.displayName || user.email || 'A user',
          currentStatus || '',
          newStatus
        );
      }
    } catch (error) {
      console.error("Error updating approval status:", error);
      createSnack("Failed to update approval status", "error");
    } finally {
      setIsLoading(false);
      // Remove the ID from the processing set after a short delay
      setTimeout(() => {
        processingApprovalIds.current.delete(imageId);
      }, 1000);
    }
  };

  const handleUploadContent = async (formData: FormData, file: File): Promise<void> => {
    if (!selectedProjectId) {
      createSnack("Project not selected.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const label = formData.get("label") as string;
      const contentType = formData.get("contentType") as string;
      const videoEmbed = formData.get("videoEmbed") as string;
      if (!title.trim() || !label || !contentType || !file) {
        createSnack("Please fill in all required fields and drop a file.", "error");
        setIsLoading(false);
        return;
      }
      
      // Show uploading message
      createSnack("Uploading content...", "info");
      
      const downloadURL = await uploadFile(file);
      const id = crypto.randomUUID();
      
      // Create a new Date object for lastMoved
      const now = new Date();
      
      // Create initial metadata with all required fields
      const newMeta: ImageMeta = {
        url: downloadURL,
        title,
        description,
        label,
        comment: "",
        caption: "", // Explicitly set caption to empty string
        videoEmbed,
        contentType,
        location: "pool",
        lastMoved: now,
        attachments: [],
        comments: [],
        carouselArrangement: []
      };
      
      // Update local state immediately for responsive UI
      const updatedImageMetadata = {
        ...imageMetadata,
        [id]: newMeta
      };
      setImageMetadata(updatedImageMetadata);
      
      // Determine the Firestore field to update based on active instance
      let firestoreInstance = activeInstance === "facebook" ? "fbig" : activeInstance;
      
      // Create the direct update to Firestore
      const projectDocRef = doc(db, "projects", selectedProjectId);
      const updateData = {
        [`imageMetadata.${firestoreInstance}.${id}`]: newMeta
      };
      
      // Use merge option to preserve other fields
      await setDoc(projectDocRef, updateData, { merge: true });
      
      createSnack("Content uploaded successfully.", "success");
      setUploadModalOpen(false);
      setDroppedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      logActivity(`${user?.displayName} uploaded a new content: ${title}`);
    } catch (error) {
      console.error("Error during upload:", error);
      createSnack("An error occurred while uploading content.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Update handleCarouselArrangementSave to ensure it uses the correct CarouselPhoto type
  const handleCarouselArrangementSave = async (arrangement: (CarouselPhoto | null)[]) => {
    if (!currentDetailsId) return; // Ensure a card is selected
    setIsLoading(true);
    try {
      // Filter out nulls for storage
      const validArrangement = arrangement.filter((item): item is CarouselPhoto => item !== null);
      
      // Process each image: if the URL is a blob, upload it to Firebase Storage.
      const processedArrangement = await Promise.all(validArrangement.map(async (img) => {
        if (img.url.startsWith("blob:")) {
          // Fetch the blob from the blob URL
          const response = await fetch(img.url);
          const blobData = await response.blob();
          // Create a File from the blob data; adjust filename as needed.
          const file = new File([blobData], `${Date.now()}_carousel.jpg`, { type: blobData.type });
          // Upload the file using your existing uploadFile function
          const downloadURL = await uploadFile(file);
          return { 
            id: img.id, 
            url: downloadURL,
            position: img.position
          };
        }
        return img;
      }));
      
      // Get the project document reference.
      const projectDocRef = doc(db, "projects", selectedProjectId);
      // Fetch the current project data.
      const currentDoc = await getDoc(projectDocRef);
      const projectData = currentDoc.exists() ? currentDoc.data() : {};
      const currentImageMetadata = projectData.imageMetadata || { fbig: {}, tiktok: {} };
      // Update only the carouselArrangement field of the selected card.
      const updatedCard = {
        ...imageMetadata[currentDetailsId],
        carouselArrangement: processedArrangement,
      };
      const updatedInstance = { ...imageMetadata, [currentDetailsId]: updatedCard };
      const newAllMeta = { ...currentImageMetadata, [activeInstance]: updatedInstance };
      // Save the updated metadata back to Firestore.
      await setDoc(projectDocRef, { imageMetadata: newAllMeta }, { merge: true });
      setImageMetadata(updatedInstance);
    } catch (error) {
      console.error("Error saving carousel arrangement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function after the other handler functions
  const handleDeleteContent = async (imageId: string): Promise<void> => {
    if (!selectedProjectId || !imageId) {
      createSnack("Cannot delete: missing project ID or image ID", "error");
      return;
    }
    
    setIsLoading(true);
    try {
      // Get reference to the project document
      const projectDocRef = doc(db, "projects", selectedProjectId);
      
      // Store the title for logging purposes before deletion
      const imageTitle = imageMetadata[imageId]?.title || "Untitled content";
      
      // Determine the Firestore field to update based on active instance
      let firestoreInstance: string = activeInstance;
      
      // For Facebook, we need to save to the 'fbig' field to maintain compatibility
      if (activeInstance === "facebook") {
        firestoreInstance = "fbig";
      }
      
      // Create the update path for the specific field to delete
      // This uses the nested field path syntax: 'imageMetadata.fbig.IMAGE_ID'
      const fieldPath = `imageMetadata.${firestoreInstance}.${imageId}`;
      
      // Create an update object that sets this specific field to be deleted
      const updateData = {
        [fieldPath]: deleteField()
      };
      
      // Use updateDoc with deleteField() - most explicit way to remove a field in Firestore
      await updateDoc(projectDocRef, updateData);
      
      // Update local state by creating a new object without the deleted image
      const updatedImageMetadata = { ...imageMetadata };
      delete updatedImageMetadata[imageId];
      setImageMetadata(updatedImageMetadata);
      
      // Close the modal
      setDetailsModalOpen(false);
      setCurrentDetailsId("");
      
      // Log the activity
      createSnack(`"${imageTitle}" has been deleted`, "success");
      logActivity(`${user?.displayName} deleted content: ${imageTitle}`);
      
      console.log(`Successfully deleted image with ID: ${imageId}`);
    } catch (error) {
      console.error("Error deleting content:", error);
      createSnack("Failed to delete content", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Clean up any invalid entries in the metadata
  useEffect(() => {
    if (Object.keys(imageMetadata).length === 0) return;
    
    let hasInvalidEntries = false;
    const cleanedMetadata = { ...imageMetadata };
    const newInvalidIds: string[] = [];
    
    // Look for entries with empty URLs or other invalid properties
    Object.entries(cleanedMetadata).forEach(([id, meta]) => {
      // Check for empty/invalid URL or missing required fields
      if (!meta.url || meta.url.trim() === '' || 
          !meta.title || typeof meta.location !== 'string') {
        // Skip if we've already tried to clean this ID recently
        if (cleanedInvalidIdsRef.current.has(id)) return;
        
        console.error(`Found invalid entry with ID ${id}:`, meta);
        delete cleanedMetadata[id];
        newInvalidIds.push(id);
        hasInvalidEntries = true;
      }
    });
    
    // If we found and removed any invalid entries, update the state and Firestore
    if (hasInvalidEntries && selectedProjectId) {
      console.log(`Cleaning up ${newInvalidIds.length} invalid entries in imageMetadata`, newInvalidIds);
      
      // Mark these IDs as cleaned
      newInvalidIds.forEach(id => cleanedInvalidIdsRef.current.add(id));
      
      // Update local state immediately to prevent UI issues
      setImageMetadata(cleanedMetadata);
      
      // Use a direct Firebase call to minimize chances of race conditions
      (async () => {
        try {
          const batch = writeBatch(db);
          const projectDocRef = doc(db, "projects", selectedProjectId);
          
          for (const id of newInvalidIds) {
            // Determine the Firestore field to update based on active instance
            let firestoreInstance: string = activeInstance;
            
            // For Facebook, we need to save to the 'fbig' field to maintain compatibility
            if (activeInstance === "facebook") {
              firestoreInstance = "fbig";
            }
          
            // Use deleteField() to specifically remove these entries
            const fieldPath = `imageMetadata.${firestoreInstance}.${id}`;
            batch.update(projectDocRef, {
              [fieldPath]: deleteField()
            });
          }
          
          await batch.commit();
          console.log("Successfully cleaned up invalid entries in Firestore");
        } catch (error) {
          console.error("Error cleaning up invalid entries:", error);
        }
      })();
    }
  }, [imageMetadata, selectedProjectId, activeInstance]);

  // Add useEffect to clear imageMetadata when switching instances
  useEffect(() => {
    // Clear the imageMetadata when changing instances
    console.log(`Switching to ${activeInstance} instance - clearing current data`);
    
    // Immediately clear the current state to prevent showing stale data
    setImageMetadata({});
    
    // Set loading state to show the loader while data is being fetched
    setIsLoading(true);
    
    // Reload data from Firestore will happen due to activeInstance dependency in the Firestore listener
    // The listener in the other useEffect will handle fetching the new data
    
    // Create a timeout to ensure loader is shown even if data loads very quickly
    const minLoadingTime = setTimeout(() => {
      // This will only run if the Firestore listener hasn't already set isLoading to false
      console.log(`Ensuring minimum loading time for instance switch to ${activeInstance}`);
    }, 500);
    
    // Add a safety timeout that will hide the spinner after a maximum duration
    // to prevent the spinner from being shown indefinitely if data loading fails
    const maxLoadingTime = setTimeout(() => {
      setIsLoading(false);
      console.log(`Force-hiding loading spinner after timeout for ${activeInstance}`);
    }, 5000); // 5 seconds maximum loading time
    
    return () => {
      clearTimeout(minLoadingTime);
      clearTimeout(maxLoadingTime);
    };
  }, [activeInstance]);

  // Add notification to handleComment function (if it exists)
  const handleComment = async (imageId: string, comment: string) => {
    if (!projectId || !user) return;
    
    try {
      // Existing comment logic...
      
      // Add notification after successful comment
      await createCommentNotification(
        projectId,
        imageId,
        user.displayName || user.email || 'A user',
        comment
      );
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  // Add notification to status change function (if it exists)
  const handleStatusChange = async (imageId: string, newStatus: string) => {
    if (!projectId || !user) return;
    
    try {
      const imageRef = doc(db, `projects/${projectId}/content/${imageId}`);
      const imageDoc = await getDoc(imageRef);
      
      if (imageDoc.exists()) {
        const oldStatus = imageDoc.data().label || '';
        
        // Existing status change logic...
        await updateDoc(imageRef, { label: newStatus });
        
        // Add notification after successful status change
        await createStatusChangeNotification(
          projectId,
          imageId,
          user.displayName || user.email || 'A user',
          oldStatus,
          newStatus
        );
      }
    } catch (error) {
      console.error("Error changing status:", error);
    }
  };

  // Add event listener for notification clicks
  useEffect(() => {
    console.log('Setting up openContentDetails event listener');
    
    const handleOpenContent = (event: Event) => {
      console.log('=== openContentDetails event received ===');
      
      try {
        const customEvent = event as CustomEvent<{ contentId: string, projectId: string }>;
        console.log('Event details:', customEvent.detail);
        const { contentId, projectId } = customEvent.detail;
        
        if (!contentId || !projectId) {
          console.error('Invalid event data:', customEvent.detail);
          createSnack("Invalid notification data", "error");
          return;
        }
        
        (async () => {
          try {
            setIsLoading(true);
            
            // Get the project document to check all instances
            const projectDocRef = doc(db, "projects", projectId);
            const projectSnap = await getDoc(projectDocRef);
            
            if (!projectSnap.exists()) {
              console.error('Project document not found:', projectId);
              createSnack("Project not found", "error");
              return;
            }

            const projectData = projectSnap.data();
            const allMetadata = projectData.imageMetadata || {};
            console.log('Available instances:', Object.keys(allMetadata));
            
            // Check all instances for the content
            const instances = ['instagram', 'fbig', 'tiktok'] as const;
            let foundInstance = null;
            
            for (const instance of instances) {
              console.log('Checking instance:', instance);
              if (allMetadata[instance]?.[contentId]) {
                console.log('Found content in instance:', instance);
                foundInstance = instance;
                const newInstance = instance === 'fbig' ? 'facebook' : instance;
                console.log('Switching to instance:', newInstance);
                
                try {
                  // Force update imageMetadata with the found content
                  const foundContent = allMetadata[instance][contentId];
                  
                  // Validate the content data
                  if (!foundContent.url || !foundContent.title) {
                    throw new Error('Invalid content data');
                  }
                  
                  setActiveInstance(newInstance as SocialMediaInstance);
                  setImageMetadata(prev => ({
                    ...prev,
                    [contentId]: foundContent
                  }));
                  
                  // Wait a bit for the state updates
                  await new Promise(resolve => setTimeout(resolve, 100));
                  
                  setCurrentDetailsId(contentId);
                  setDetailsModalOpen(true);
                  createSnack("Opening content details...", "info");
                  break;
                } catch (error) {
                  console.error('Error processing content:', error);
                  createSnack("Error processing content data", "error");
                  return;
                }
              }
            }

            if (!foundInstance) {
              console.error('Content not found in any instance:', contentId);
              createSnack("Content not found. It may have been deleted.", "error");
            }
          } catch (error) {
            console.error('Error finding content:', error);
            createSnack("Error loading content details", "error");
          } finally {
            setIsLoading(false);
          }
        })();
      } catch (error) {
        console.error('Error processing event:', error);
        createSnack("An unexpected error occurred", "error");
      }
    };

    window.addEventListener('openContentDetails', handleOpenContent);
    
    return () => {
      window.removeEventListener('openContentDetails', handleOpenContent);
    };
  }, [setActiveInstance, setImageMetadata, setCurrentDetailsId, setDetailsModalOpen, createSnack, setIsLoading]);

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <HashLoader color="white" loading={isLoading} size={150} />
        </div>
      )}
      <div className="flex flex-1 flex-col">
        <div className="px-5 pt-4 sm:px-8 sm:pt-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">
                Content Calendar {projectName ? `- ${projectName}` : ""}
              </h2>
            </div>
            {/* Social media switcher moved into the calendar component */}
          </div>
        </div>
        <div className="flex flex-row w-full h-full gap-4 relative">
          <div className={`relative h-full overflow-auto mt-4 flex-1 ml-4 transition-all duration-300`} 
               style={{ maxWidth: contentPoolVisible ? "calc(100% - 288px)" : "100%" }}>
            <ContinuousCalendar
              onClick={(day, month, year) => {
                const msg = `Clicked on ${monthNames[month]} ${day}, ${year}`;
                createSnack(msg, "success");
              }}
              onImageDrop={(day, month, year, imageId) => handleDayDrop(day, month, year, imageId)}
              droppedImages={groupedDroppedImages}
              imageMetadata={imageMetadata}
              onSeeDetails={openEditModal}
              onApprove={handleApprove}
              activeInstance={activeInstance}
              onInstanceChange={setActiveInstance}
              cardsInTransit={cardsInTransit}
              expandedView={!contentPoolVisible}
              projectId={projectId}
              projectName={projectName}
            />
          </div>
          
          {/* Toggle button for content pool */}
          <button 
            onClick={() => setContentPoolVisible(!contentPoolVisible)}
            className="absolute z-50 bg-white rounded-l-md p-2 shadow-md border border-gray-300 border-r-0 hover:bg-gray-50 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ 
              right: contentPoolVisible ? "280px" : "0",
              top: "50%", 
              transform: "translateY(-50%)",
              transition: "right 0.3s ease-in-out",
              width: "32px",
              height: "80px"
            }}
            aria-label={contentPoolVisible ? "Hide content pool" : "Show content pool"}
            title={contentPoolVisible ? "Hide content pool" : "Show content pool"}
          >
            {contentPoolVisible ? 
              <ChevronRightIcon className="h-5 w-5 text-gray-600" /> : 
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            }
          </button>
          
          {/* Content Pool with transition */}
          <div className={`transition-all duration-300 ease-in-out ${contentPoolVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
               style={{ width: contentPoolVisible ? "280px" : "0", overflow: "hidden" }}>
            <ContentPool
              poolViewMode={poolViewMode}
              setPoolViewMode={setPoolViewMode}
              onUpload={() => setUploadModalOpen(true)}
              renderPoolImages={() =>
                poolViewMode === "full"
                  ? poolImages.map(({ id, url }) => (
                      <ContentPoolImage
                        key={id}
                        id={id}
                        src={url}
                        alt={imageMetadata[id]?.title || "Pool Content"}
                        label={imageMetadata[id]?.label}
                        title={imageMetadata[id]?.title}
                        onEdit={() => openEditModal(id)}
                        isListView={false}
                        inTransit={cardsInTransit.has(id)}
                      />
                    ))
                  : poolImages.map(({ id, url }) => (
                      <ContentPoolImage
                        key={id}
                        id={id}
                        src={url}
                        alt={imageMetadata[id]?.title || "Pool Content"}
                        label={imageMetadata[id]?.label}
                        title={imageMetadata[id]?.title}
                        onEdit={() => openEditModal(id)}
                        isListView={true}
                        inTransit={cardsInTransit.has(id)}
                      />
                    ))
              }
              onDragOver={(e) => e.preventDefault()}
              onDrop={handlePoolDrop}
              className="w-[280px] min-w-[280px]"
            />
          </div>
        </div>
        <UploadModal
          visible={uploadModalOpen}
          droppedFile={droppedFile}
          onClose={() => setUploadModalOpen(false)}
          onFileSelect={(file) => setDroppedFile(file)}
          onUpload={handleUploadContent}
        />
        <DetailsModal
          visible={detailsModalOpen}
          image={currentDetailsId ? (() => {
            console.log('=== DetailsModal Props ===');
            console.log('currentDetailsId:', currentDetailsId);
            console.log('imageMetadata for ID:', imageMetadata[currentDetailsId]);
            console.log('activeInstance:', activeInstance);
            const modalImage = {
            ...imageMetadata[currentDetailsId],
            id: currentDetailsId,
            instance: activeInstance
            } as ExtendedImageMeta;
            console.log('Final image prop:', modalImage);
            return modalImage;
          })() : undefined}
          onClose={() => {
            console.log('DetailsModal onClose called');
            setDetailsModalOpen(false);
            setCurrentDetailsId("");
          }}
          onSave={async (newMeta) => {
            setIsLoading(true);
            try {
              // Validate the incoming data first
              if (!newMeta || !newMeta.id) {
                throw new Error("Invalid image data provided");
              }

              // Convert ExtendedImageMeta back to ImageMeta for storage
              const { id, ...metaWithoutId } = newMeta;
              
              // Apply our safety functions to ensure all fields have proper values
              const safeMetaWithoutId = ensureRequiredFields(metaWithoutId);
              
              // Sanitize to remove any undefined values before saving to Firestore
              const sanitizedMeta = sanitizeForFirestore(safeMetaWithoutId);
              
              // Use a transaction to ensure data consistency
              await runTransaction(db, async (transaction) => {
                // Get the current project document within the transaction
                const projectDocRef = doc(db, "projects", selectedProjectId);
                const projectSnap = await transaction.get(projectDocRef);
                
                if (!projectSnap.exists()) {
                  throw new Error("Project document does not exist");
                }
                
                const projectData = projectSnap.data();
                const currentImageMetadata = projectData.imageMetadata || {};
                
                // Get the current image data to compare
                const firestoreInstance = activeInstance === "facebook" ? "fbig" : activeInstance;
                const currentImage = currentImageMetadata[firestoreInstance]?.[currentDetailsId];
                
                // Add to the collection of images
                const updatedInstance = { 
                  ...imageMetadata, 
                  [currentDetailsId]: sanitizedMeta as ImageMeta 
                };
                
                // Process the entire collection for safety
                const safeInstance = ensureRequiredFields(updatedInstance);
                
                // Create the final data structure
                const newAllMeta = { ...currentImageMetadata, [firestoreInstance]: safeInstance };
                
                // Final safety check on the entire object before saving
                const finalSafeData = { imageMetadata: ensureRequiredFields(newAllMeta) };
                
                // Update within the transaction
                transaction.set(projectDocRef, finalSafeData, { merge: true });
                
                // Return the safe instance data to use after transaction completes
                return {
                  safeInstance,
                  isNewComment: currentImage && 
                    sanitizedMeta.comments?.length > (currentImage.comments?.length || 0)
                };
              }).then(({ safeInstance, isNewComment }) => {
                // Update local state after successful transaction
                setImageMetadata(safeInstance);
                logActivity(`${user?.displayName} updated '${imageMetadata[currentDetailsId]?.title || "Untitled"}'`);

                // Create appropriate notification based on the type of update
                if (user && selectedProjectId && currentDetailsId) {
                  if (isNewComment) {
                    // Get the latest comment
                    const latestComment = sanitizedMeta.comments?.[sanitizedMeta.comments.length - 1];
                    if (latestComment) {
                      createCommentNotification(
                        selectedProjectId,
                        currentDetailsId,
                        user.displayName || user.email || 'A user',
                        latestComment.text
                      ).catch(error => {
                        console.error('Error creating notification for comment:', error);
                      });
                    }
                  } else {
                    createEditNotification(
                      selectedProjectId,
                      currentDetailsId,
                      user.displayName || user.email || 'A user',
                      ['content details']
                    ).catch(error => {
                      console.error('Error creating notification for content update:', error);
                    });
                  }
                }
              });
              
              createSnack("Changes saved successfully", "success");
            } catch (error) {
              console.error("Error saving image:", error);
              createSnack("Failed to save changes", "error");
            } finally {
              setIsLoading(false);
            }
          }}
          onDelete={handleDeleteContent}
          projectId={selectedProjectId}
          logActivity={logActivity}
        />
      </div>
    </div>
  );
}

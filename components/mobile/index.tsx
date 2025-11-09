"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSnack } from "@/components/common/feedback/Snackbar";
import { db } from "@/components/services/firebaseService";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "@/components/services/AuthProvider";
import { type SocialMediaInstance } from "@/components/ui/social-media-switch";
import { useLocalStorage } from "@/components/hooks/useLocalStorage";
import { isSocialMediaInstance, isString } from "@/components/hooks/stateValidators";
import { debounce } from "@/utils/debounce";
import { ImageMeta } from "@/components/pages/DemoWrapper";
import { ExtendedImageMeta } from "@/components/modals/DetailsModal";

// Mobile Components
import MobileTopBar from "./navigation/MobileTopBar";
import MobileProjectsSidebar from "./navigation/MobileProjectsSidebar";
import MobileCalendar from "./calendar/MobileCalendar";
import MobileUploadModal from "./modals/MobileUploadModal";
import MobileDetailsModal from "./modals/MobileDetailsModal";
import MobileDraftModal from "./modals/MobileDraftModal";
import HashLoader from "react-spinners/HashLoader";
import Image from "next/image";

interface MobileWrapperProps {
  projectId: string;
  projectName?: string;
  projects: Array<{ id: string; name: string }>;
  onProjectSelect: (projectId: string) => void;
}

const DEFAULT_DRAFT_THUMBNAIL = "https://files.catbox.moe/lr6l09.png";

// Helper function to safely convert to Date
function safelyConvertToDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === "function") return value.toDate();
  if (typeof value === "string" || typeof value === "number") {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) return date;
    } catch (e) {
      console.warn("Error converting to Date:", e);
    }
  }
  return new Date();
}

// Helper function to sanitize objects for Firestore
function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item));
  }
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value);
    } else if (key === "caption") {
      sanitized[key] = "";
    }
  }
  return sanitized;
}

// Upload file to Firebase Storage
async function uploadFile(file: File): Promise<string> {
  const storage = getStorage();
  const fileRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
  const uploadTask = uploadBytesResumable(fileRef, file);
  
  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      () => {},
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
}

export default function MobileWrapper({
  projectId,
  projectName,
  projects,
  onProjectSelect,
}: MobileWrapperProps) {
  const { createSnack } = useSnack();
  const { user } = useAuth();

  // State
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [activeInstance, setActiveInstance] = useLocalStorage<SocialMediaInstance>({
    key: "activeInstance",
    defaultValue: "instagram",
    validator: isSocialMediaInstance,
  });
  const [imageMetadata, setImageMetadata] = useState<{ [id: string]: ImageMeta }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [cardsInTransit, setCardsInTransit] = useState<Set<string>>(new Set());

  // UI State
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [currentDetailsId, setCurrentDetailsId] = useState<string>("");

  // Touch drag and drop state
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null);
  const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Refs for touch tracking (avoid re-renders on every touchmove)
  const touchStartPosRef = useRef<{ x: number; y: number; id: string } | null>(null);
  const hasMovedRef = useRef(false);
  const touchPositionRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Update selectedProjectId when prop changes
  useEffect(() => {
    if (projectId && projectId !== selectedProjectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId, selectedProjectId]);

  // Firestore listener
  useEffect(() => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    const docRef = doc(db, "projects", selectedProjectId);

    const unsub = onSnapshot(
      docRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const firestoreField = activeInstance === "facebook" ? "fbig" : activeInstance;
          const instanceData = data.imageMetadata?.[firestoreField] || {};

          console.log("📥 Firestore update - instance:", firestoreField, "entries:", Object.keys(instanceData).length);

          const normalizedData: { [id: string]: ImageMeta } = {};
          Object.entries(instanceData).forEach(([id, metaData]) => {
            const meta = metaData as Record<string, any>;
            if (!meta.url || !meta.title) {
              console.warn("⚠️ Skipping invalid entry:", id);
              return;
            }

            const lastMoved = safelyConvertToDate(meta.lastMoved);
            // Use firestoreField (fbig/instagram/tiktok) for instance to match Firestore format
            normalizedData[id] = {
              url: meta.url,
              title: meta.title || "",
              description: meta.description || "",
              caption: meta.caption ?? "",
              label: meta.label || "",
              comment: meta.comment || "",
              videoEmbed: meta.videoEmbed ?? "",
              contentType: meta.contentType || "",
              location: meta.location || "pool",
              lastMoved,
              comments: Array.isArray(meta.comments) ? meta.comments : [],
              carouselArrangement: Array.isArray(meta.carouselArrangement)
                ? meta.carouselArrangement
                : [],
              attachments: Array.isArray(meta.attachments) ? meta.attachments : [],
              script: typeof meta.script === "string" ? meta.script : "",
              samples: Array.isArray(meta.samples) ? meta.samples : [],
              instance: meta.instance || firestoreField, // Use firestoreField (fbig/instagram/tiktok)
              id,
            };
          });

          console.log("✅ Normalized", Object.keys(normalizedData).length, "images");
          setImageMetadata(normalizedData);
          setIsLoading(false);
        } else {
          setImageMetadata({});
          setIsLoading(false);
        }
      },
      (error) => {
        console.error("Error in Firestore listener:", error);
        setIsLoading(false);
        createSnack("Failed to load data. Please try again.", "error");
      }
    );

    return () => unsub();
  }, [selectedProjectId, activeInstance, createSnack]);

  // Update image metadata in Firestore
  const updateImageMetadata = async (updatedInstanceData: { [id: string]: ImageMeta }) => {
    if (!selectedProjectId) {
      createSnack("Project ID is missing", "error");
      return;
    }

    const sanitizedInstanceData = sanitizeForFirestore(updatedInstanceData);
    const firestoreInstance = activeInstance === "facebook" ? "fbig" : activeInstance;

    try {
      const projectDocRef = doc(db, "projects", selectedProjectId);
      const docSnap = await getDoc(projectDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const imageMetadataData = data.imageMetadata || {};
        const updatedData = {
          ...imageMetadataData,
          [firestoreInstance]: sanitizedInstanceData,
        };
        await updateDoc(projectDocRef, {
          imageMetadata: updatedData,
        });
      } else {
        await setDoc(projectDocRef, {
          imageMetadata: {
            [firestoreInstance]: sanitizedInstanceData,
          },
          createdAt: serverTimestamp(),
        });
      }

      setImageMetadata(sanitizedInstanceData);
    } catch (error) {
      console.error("Error updating image metadata:", error);
      createSnack("Failed to update data", "error");
      throw error;
    }
  };

  // Group dropped images by location
  // Note: imageMetadata is already filtered by activeInstance from Firestore,
  // so we don't need to filter again here
  const groupedDroppedImages = useMemo(() => {
    const obj: { [date: string]: Array<{ id: string; url: string }> } = {};
    
    Object.entries(imageMetadata).forEach(([id, meta]) => {
      // Only include cards that are on the calendar (not in pool)
      if (meta.location && meta.location !== "pool") {
        if (!obj[meta.location]) {
          obj[meta.location] = [];
        }
        obj[meta.location].push({ id, url: meta.url });
      }
    });
    
    return obj;
  }, [imageMetadata]);

  // Store latest performCardDrop function in a ref so debounced function can access it
  const performCardDropRef = useRef<(day: number, month: number, year: number, imageId: string) => Promise<void>>();
  
  // Card drop handler - with access to latest imageMetadata
  const performCardDrop = useCallback(async (
    day: number,
    month: number,
    year: number,
    imageId: string
  ) => {
    console.log("🔵 performCardDrop called:", { imageId, day, month, year });
    console.log("🔵 Available image IDs:", Object.keys(imageMetadata));
    console.log("🔵 Image metadata exists:", !!imageMetadata[imageId]);
    
    if (!selectedProjectId) {
      createSnack("Project not selected.", "error");
      setCardsInTransit((prev) => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
      return;
    }

    const targetKey = `${year}-${month}-${day}`;

    // Access latest imageMetadata from state (useCallback ensures we have latest)
    if (!imageMetadata[imageId]) {
      console.error("❌ Image not found in metadata:", imageId);
      console.error("❌ Available IDs:", Object.keys(imageMetadata));
      createSnack("Image not found in metadata.", "error");
      setCardsInTransit((prev) => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
      return;
    }

    if (imageMetadata[imageId].location === targetKey) {
      setCardsInTransit((prev) => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
      return;
    }

    const now = new Date();
    const updatedImageMetadata = {
      ...imageMetadata,
      [imageId]: {
        ...imageMetadata[imageId],
        location: targetKey,
        lastMoved: now,
        caption: imageMetadata[imageId].caption || "",
      },
    };

    try {
      await updateImageMetadata(updatedImageMetadata);
      createSnack("Card moved successfully", "success");
    } catch (error) {
      console.error("Error moving card:", error);
      createSnack("Failed to move card", "error");
    } finally {
      setCardsInTransit((prev) => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  }, [selectedProjectId, imageMetadata, updateImageMetadata, createSnack]);

  // Update ref whenever performCardDrop changes
  useEffect(() => {
    performCardDropRef.current = performCardDrop;
  }, [performCardDrop]);

  // Debounced version - calls latest performCardDrop via ref
  const debouncedCardDrop = useRef(
    debounce((day: number, month: number, year: number, imageId: string) => {
      if (performCardDropRef.current) {
        performCardDropRef.current(day, month, year, imageId);
      }
    }, 300)
  ).current;

  const handleCardDrop = async (
    day: number,
    month: number,
    year: number,
    imageId: string
  ) => {
    console.log("🟢 handleCardDrop called:", { imageId, day, month, year });
    console.log("🟢 Current imageMetadata keys:", Object.keys(imageMetadata));
    console.log("🟢 Image exists in metadata:", !!imageMetadata[imageId]);
    
    // Validate imageId exists in metadata BEFORE proceeding
    if (!imageId || !imageMetadata[imageId]) {
      console.error("❌ Invalid imageId or not found in metadata:", imageId);
      console.error("❌ Available image IDs:", Object.keys(imageMetadata));
      createSnack("Image not found. Please try again.", "error");
      return;
    }

    // Check if target row is full (strict 3-card limit)
    const targetKey = `${year}-${month}-${day}`;
    const existingCards = groupedDroppedImages[targetKey] || [];
    
    // Don't count the card being moved if it's already in this row
    const cardsExcludingCurrent = existingCards.filter(card => card.id !== imageId);
    
    if (cardsExcludingCurrent.length >= 3) {
      createSnack("This day already has 3 cards. Maximum reached.", "error");
      return;
    }

    // Show loading spinner immediately
    setCardsInTransit((prev) => {
      const newSet = new Set(prev);
      newSet.add(imageId);
      return newSet;
    });

    // Call debounced handler - it will access latest imageMetadata via performCardDrop callback
    debouncedCardDrop(day, month, year, imageId);
  };

  // Touch drag and drop handlers
  const handleTouchStart = useCallback((id: string, touch: Touch) => {
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY, id };
    hasMovedRef.current = false;
    setDraggedCardId(id);
    // Don't set touch position yet - wait for drag threshold
    touchPositionRef.current = null;
    setTouchPosition(null);
  }, []);

  const handleTouchMove = useCallback((touch: Touch) => {
    if (!touchStartPosRef.current) return;

    // Check if touch has moved beyond threshold (10px)
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
    
    if (deltaX > 10 || deltaY > 10) {
      hasMovedRef.current = true;
      
      // Update touch position for floating card (only after threshold)
      // Always update ref immediately for latest position
      touchPositionRef.current = { x: touch.clientX, y: touch.clientY };
      
      // Update state via RAF for smooth rendering (throttle to 60fps)
      // Only schedule if not already scheduled (prevents multiple RAF calls)
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          // Use latest ref value (may have changed during RAF wait)
          setTouchPosition(touchPositionRef.current);
          rafIdRef.current = null;
        });
      }
    }

    // Find row element under touch point
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!elementUnderTouch) {
      setHoveredRowKey(null);
      return;
    }

    // Traverse up DOM tree to find row with data-row-key attribute
    let currentElement: Element | null = elementUnderTouch;
    while (currentElement) {
      const rowKey = currentElement.getAttribute("data-row-key");
      if (rowKey) {
        setHoveredRowKey(rowKey);
        return;
      }
      currentElement = currentElement.parentElement;
    }

    setHoveredRowKey(null);
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Cancel any pending RAF
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (!touchStartPosRef.current || !draggedCardId) {
      // Reset state
      touchStartPosRef.current = null;
      hasMovedRef.current = false;
      setDraggedCardId(null);
      setHoveredRowKey(null);
      setTouchPosition(null);
      touchPositionRef.current = null;
      return;
    }

    // If it was a drag (moved > 10px) and ended over a valid row
    if (hasMovedRef.current && hoveredRowKey) {
      // Parse row key: format is "year-month-day"
      const parts = hoveredRowKey.split("-");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        
        // Check if row is full
        const targetKey = `${year}-${month}-${day}`;
        const existingCards = groupedDroppedImages[targetKey] || [];
        const cardsExcludingCurrent = existingCards.filter(card => card.id !== draggedCardId);
        
        if (cardsExcludingCurrent.length < 3) {
          // Valid drop - call handleCardDrop
          handleCardDrop(day, month, year, draggedCardId);
        }
      }
    }

    // Reset all touch state
    touchStartPosRef.current = null;
    hasMovedRef.current = false;
    setDraggedCardId(null);
    setHoveredRowKey(null);
    setTouchPosition(null);
    touchPositionRef.current = null;
  }, [draggedCardId, hoveredRowKey, groupedDroppedImages, handleCardDrop]);

  // Global touch event listeners
  useEffect(() => {
    if (!draggedCardId) {
      return;
    }

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleTouchMove(e.touches[0]);
        e.preventDefault(); // Prevent scrolling during drag
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      handleTouchEnd();
      e.preventDefault();
    };

    // Add listeners with passive: false to allow preventDefault
    document.addEventListener("touchmove", handleGlobalTouchMove, { passive: false });
    document.addEventListener("touchend", handleGlobalTouchEnd, { passive: false });
    document.addEventListener("touchcancel", handleGlobalTouchEnd, { passive: false });

    return () => {
      document.removeEventListener("touchmove", handleGlobalTouchMove);
      document.removeEventListener("touchend", handleGlobalTouchEnd);
      document.removeEventListener("touchcancel", handleGlobalTouchEnd);
    };
  }, [draggedCardId, handleTouchMove, handleTouchEnd]);

  // Handle upload with date
  const handleUpload = async (formData: FormData, file: File, selectedDate: Date) => {
    if (!selectedProjectId) {
      createSnack("Project not selected.", "error");
      return;
    }

    try {
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const label = formData.get("label") as string;
      const contentType = formData.get("contentType") as string;
      const videoEmbed = (formData.get("videoEmbed") as string) || "";

      if (!title.trim() || !label || !contentType || !file) {
        createSnack("Please fill in all required fields.", "error");
        return;
      }

      // Validate videoEmbed for Reel and Video content types
      if ((contentType === "reel" || contentType === "video") && !videoEmbed.trim()) {
        createSnack(`Please enter a ${contentType === "reel" ? "Reel" : "Video"} URL.`, "error");
        return;
      }

      createSnack("Uploading content...", "info");
      const downloadURL = await uploadFile(file);
      const id = crypto.randomUUID();
      const now = new Date();

      // Create location key from selected date
      // getMonth() returns 0-indexed month, which matches our date key format
      const locationKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;

      const newMeta: ImageMeta = {
        url: downloadURL,
        title,
        description,
        label,
        comment: "",
        caption: "",
        contentType,
        location: locationKey, // Set location directly to selected date
        lastMoved: now,
        attachments: [],
        comments: [],
        carouselArrangement: [],
        instance: activeInstance === "facebook" ? "fbig" : activeInstance,
        id,
        // Include videoEmbed if it exists (for Reel and Video content types)
        ...(videoEmbed.trim() && { videoEmbed: videoEmbed.trim() }),
      };

      const updatedImageMetadata = {
        ...imageMetadata,
        [id]: newMeta,
      };

      await updateImageMetadata(updatedImageMetadata);
      createSnack("Content uploaded successfully.", "success");
      setUploadModalOpen(false);
    } catch (error) {
      console.error("Error during upload:", error);
      createSnack("An error occurred while uploading content.", "error");
    }
  };

  // Handle draft creation
  const handleCreateDraft = async (formData: FormData, script: string, selectedDate: Date) => {
    if (!selectedProjectId) {
      createSnack("Project not selected.", "error");
      return;
    }

    try {
      const title = (formData.get("title") as string) || "";
      const description = (formData.get("description") as string) || "";
      const contentType = (formData.get("contentType") as string) || "";

      if (!title.trim() || !contentType) {
        createSnack("Please complete all required fields.", "error");
        return;
      }

      createSnack("Creating draft...", "info");
      const id = crypto.randomUUID();

      // Calculate location from selected date (format: "year-month-day")
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth(); // 0-indexed
      const day = selectedDate.getDate();
      const location = `${year}-${month}-${day}`;

      const newMeta: ImageMeta = {
        url: DEFAULT_DRAFT_THUMBNAIL,
        title,
        description,
        label: "Draft",
        comment: "",
        caption: "",
        contentType,
        location: location, // Set to calendar date location (not "pool")
        lastMoved: selectedDate, // Use selected date instead of now
        attachments: [],
        comments: [],
        carouselArrangement: [],
        script,
        samples: [],
        instance: activeInstance === "facebook" ? "fbig" : activeInstance,
        id,
      };

      const updatedImageMetadata = {
        ...imageMetadata,
        [id]: newMeta,
      };

      await updateImageMetadata(updatedImageMetadata);
      createSnack("Draft created successfully.", "success");
      setDraftModalOpen(false);
    } catch (error) {
      console.error("Error creating draft:", error);
      createSnack("An error occurred while creating draft.", "error");
    }
  };

  // Handle details save
  const handleDetailsSave = async (updatedData: Partial<ImageMeta>) => {
    if (!selectedProjectId || !currentDetailsId) {
      createSnack("Missing project or content ID", "error");
      return;
    }

    try {
      const updatedImageMetadata = {
        ...imageMetadata,
        [currentDetailsId]: {
          ...imageMetadata[currentDetailsId],
          ...updatedData,
        },
      };

      await updateImageMetadata(updatedImageMetadata);
    } catch (error) {
      console.error("Error saving details:", error);
      throw error;
    }
  };

  // Handle card click
  const handleCardClick = (id: string) => {
    setCurrentDetailsId(id);
    setDetailsModalOpen(true);
  };

  // Get current image for details modal
  const currentImage = useMemo(() => {
    if (!currentDetailsId || !imageMetadata[currentDetailsId]) return null;
    return {
      ...imageMetadata[currentDetailsId],
      id: currentDetailsId,
    } as ExtendedImageMeta;
  }, [currentDetailsId, imageMetadata]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <HashLoader color="#3b82f6" size={50} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top Bar */}
      <MobileTopBar
        currentMonth={currentMonth}
        currentYear={currentYear}
        onMonthChange={(month, year) => {
          setCurrentMonth(month);
          setCurrentYear(year);
        }}
        onUploadClick={() => setUploadModalOpen(true)}
        onWriteClick={() => setDraftModalOpen(true)}
        onBurgerClick={() => setSidebarVisible(true)}
      />

      {/* Projects Sidebar */}
      <MobileProjectsSidebar
        visible={sidebarVisible}
        projects={projects}
        activeProjectId={selectedProjectId}
        onProjectSelect={(id) => {
          onProjectSelect(id);
          setSidebarVisible(false);
        }}
        onClose={() => setSidebarVisible(false)}
      />

      {/* Calendar */}
      <div className="flex-1 overflow-y-auto">
        <MobileCalendar
          month={currentMonth}
          year={currentYear}
          droppedImages={groupedDroppedImages}
          imageMetadata={imageMetadata}
          onCardClick={handleCardClick}
          onCardDrop={handleCardDrop}
          activeInstance={activeInstance}
          cardsInTransit={cardsInTransit}
          draggedCardId={draggedCardId}
          hoveredRowKey={hoveredRowKey}
          onTouchStart={handleTouchStart}
        />
      </div>

      {/* Modals */}
      <MobileUploadModal
        visible={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
        projectId={selectedProjectId}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />

      <MobileDraftModal
        visible={draftModalOpen}
        onClose={() => setDraftModalOpen(false)}
        onCreateDraft={handleCreateDraft}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />

      {currentImage && (
        <MobileDetailsModal
          visible={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setCurrentDetailsId("");
          }}
          image={currentImage}
          onSave={handleDetailsSave}
          projectId={selectedProjectId}
          activeInstance={activeInstance}
        />
      )}

      {/* Floating Dragged Card */}
      {draggedCardId && touchPosition && imageMetadata[draggedCardId] && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${touchPosition.x}px`,
            top: `${touchPosition.y}px`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 opacity-60 scale-110 shadow-2xl border-2 border-blue-400">
            {/* Status Indicator */}
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 z-10">
              <div
                className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                  !imageMetadata[draggedCardId].label
                    ? "bg-gray-400"
                    : imageMetadata[draggedCardId].label.toLowerCase() === "approved"
                    ? "bg-green-500"
                    : imageMetadata[draggedCardId].label.toLowerCase() === "draft"
                    ? "bg-amber-500"
                    : imageMetadata[draggedCardId].label.toLowerCase() === "needs revision"
                    ? "bg-red-500"
                    : imageMetadata[draggedCardId].label.toLowerCase() === "ready for approval"
                    ? "bg-blue-500"
                    : imageMetadata[draggedCardId].label.toLowerCase() === "scheduled"
                    ? "bg-purple-500"
                    : "bg-gray-400"
                }`}
              />
            </div>
            {/* Image */}
            <Image
              src={imageMetadata[draggedCardId].url}
              alt={imageMetadata[draggedCardId].title || "Content"}
              fill
              className="object-cover"
              sizes="96px"
              draggable={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}


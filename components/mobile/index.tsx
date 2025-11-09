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
    </div>
  );
}


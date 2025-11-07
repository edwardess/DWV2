'use client';

// Put the components/DetailsModalParts/RenderSecondColumn.tsx code here
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
    VideoCameraIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    CheckIcon,
  } from "@heroicons/react/24/outline";
  import { TrashIcon } from "@heroicons/react/24/solid";
  import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
  } from "firebase/storage";
  import HashLoader from "react-spinners/HashLoader";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import JSZip from 'jszip';
import FileSaver from 'file-saver';
  // Extend the CarouselPhoto interface to include a position field.
  export interface CarouselPhoto {
    id: string;
    url: string;
    position: string; // "pool" or "slot X" (e.g., "slot 1")
  }
  
  // --- Carousel Arrangement Modal Component ---
  interface CarouselArrangementModalProps {
    visible: boolean;
    onClose: () => void;
    // onSave returns the full slots array (including nulls)
    onSave: (arranged: (CarouselPhoto | null)[]) => void;
    initialPool?: CarouselPhoto[];
    initialSlots?: (CarouselPhoto | null)[];
  }
  
  const CarouselArrangementModal: React.FC<CarouselArrangementModalProps> = ({
    visible,
    onClose,
    onSave,
    initialPool = [],
    initialSlots = Array(20).fill(null),
  }) => {
    // Desired slot dimensions (target 4:5 ratio)
    const slotWidth = 200; // in pixels
    const slotHeight = 250; // in pixels
  
    const [uploadedPhotos, setUploadedPhotos] = useState<CarouselPhoto[]>(
      initialPool.map((photo) => ({ ...photo, position: "pool" }))
    );
    const [slots, setSlots] = useState<(CarouselPhoto | null)[]>(initialSlots);
    const [draggedPhoto, setDraggedPhoto] = useState<{
      photo: CarouselPhoto;
      source: "pool" | number;
    } | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
    const [showDeletePhotoModal, setShowDeletePhotoModal] = useState<{ id: string; type: 'pool' | 'slot'; index?: number } | null>(null);
  
    // Modified file drop handler: immediately upload and store with position "pool"
    // Modified file drop handler with proper loading state
    // File validation constants
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  
    // File validation function
    const validateFile = (file: File): { valid: boolean; error?: string } => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return { valid: false, error: `Unsupported file type: ${file.type}` };
      }
  
      if (file.size > MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `File too large (${(file.size / 1024 / 1024).toFixed(
            1
          )}MB). Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        };
      }
  
      // Check for duplicate files
      const isDuplicate = uploadedPhotos.some((photo) =>
        photo.id.includes(file.name)
      );
      if (isDuplicate) {
        return {
          valid: false,
          error: `File "${file.name}" has already been uploaded`,
        };
      }
  
      return { valid: true };
    };
  
    // Updated file drop handler
    const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        setIsUploadingPhoto(true);
  
        try {
          const filesToProcess = Array.from(files);
          const validationResults = filesToProcess.map(validateFile);
  
          // Show validation errors
          const errors = validationResults
            .filter((result) => !result.valid)
            .map((result) => result.error);
  
          if (errors.length > 0) {
            setUploadErrors((prev) => ({
              ...prev,
              validation: errors.join(", "),
            }));
          }
  
          // Process valid files
          const validFileIndexes = validationResults
            .map((result, index) => (result.valid ? index : -1))
            .filter((index) => index !== -1);
  
          const validFiles = validFileIndexes.map(
            (index) => filesToProcess[index]
          );
  
          await Promise.all(
            validFiles.map(async (file) => {
              try {
                const downloadURL = await uploadFile(file);
                const id = `${Date.now()}-${file.name}`;
                setUploadedPhotos((prev) => [
                  ...prev,
                  { id, url: downloadURL, position: "pool" },
                ]);
                setHasChanges(true);
              } catch (error) {
                console.error("Upload error:", error);
              }
            })
          );
        } finally {
          setIsUploadingPhoto(false);
        }
      }
    };
  
    // Modified file select handler with proper loading state
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        setIsUploadingPhoto(true);
        try {
          const files = Array.from(e.target.files).filter((file) =>
            file.type.startsWith("image/")
          );
          // Process uploads in parallel with Promise.all
          await Promise.all(
            files.map(async (file) => {
              try {
                const downloadURL = await uploadFile(file);
                const id = `${Date.now()}-${file.name}`;
                setUploadedPhotos((prev) => [
                  ...prev,
                  { id, url: downloadURL, position: "pool" },
                ]);
                setHasChanges(true);
              } catch (error) {
                console.error("Upload error:", error);
                // TODO: Add user-visible error notification
              }
            })
          );
        } finally {
          setIsUploadingPhoto(false);
        }
      }
    };
  
    // Utility upload function
    // Track uploads for cleanup
    const activeUploads = useRef<{ [key: string]: any }>({});
    const [uploadErrors, setUploadErrors] = useState<{ [key: string]: string }>(
      {}
    );
  
    async function uploadFile(file: File): Promise<string> {
      const storage = getStorage();
      const fileId = `${Date.now()}_${file.name}`;
      const fileRef = ref(storage, `uploads/${fileId}`);
      const uploadTask = uploadBytesResumable(fileRef, file);
  
      // Store upload task for potential cleanup
      activeUploads.current[fileId] = uploadTask;
  
      return new Promise((resolve, reject) => {
        let lastProgress = 0;
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            // Track progress
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (progress - lastProgress > 10) {
              lastProgress = progress;
              console.log(`Upload progress: ${progress.toFixed(1)}%`);
            }
          },
          (error) => {
            // Handle errors with specific messages
            let errorMessage = "Upload failed";
            switch (error.code) {
              case "storage/unauthorized":
                errorMessage = "You don't have permission to upload files";
                break;
              case "storage/canceled":
                errorMessage = "Upload was canceled";
                break;
              case "storage/quota-exceeded":
                errorMessage = "Storage quota exceeded";
                break;
              default:
                errorMessage = `Upload error: ${error.message}`;
            }
            setUploadErrors((prev) => ({ ...prev, [fileId]: errorMessage }));
            delete activeUploads.current[fileId];
            reject(error);
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref)
              .then((downloadURL) => {
                delete activeUploads.current[fileId];
                resolve(downloadURL);
              })
              .catch((err) => {
                setUploadErrors((prev) => ({
                  ...prev,
                  [fileId]: "Failed to get download URL",
                }));
                delete activeUploads.current[fileId];
                reject(err);
              });
          }
        );
      });
    }
  
    // Cleanup function for component unmount
    useEffect(() => {
      return () => {
        // Cancel any ongoing uploads
        Object.values(activeUploads.current).forEach((task: any) => {
          if (task && typeof task.cancel === "function") {
            task.cancel();
          }
        });
      };
    }, []);
  
    // Drag handlers for pool items.
    // Use ref to avoid race conditions with drag operations
    const draggedPhotoRef = useRef<{
      photo: CarouselPhoto;
      source: "pool" | number;
    } | null>(null);
  
    // Drag handlers for pool items.
    const handlePoolDragStart =
      (photo: CarouselPhoto) => (e: React.DragEvent<HTMLDivElement>) => {
        const dragData = { photo, source: "pool" as const };
        draggedPhotoRef.current = dragData;
        setDraggedPhoto(dragData);
  
        // Set drag image and data
        if (e.dataTransfer) {
          e.dataTransfer.setData(
            "text/plain",
            JSON.stringify({ id: photo.id, source: "pool" })
          );
          e.dataTransfer.effectAllowed = "move";
        }
      };
  
    // Drag handlers for slots.
    const handleSlotDragStart =
      (index: number, photo: CarouselPhoto) =>
      (e: React.DragEvent<HTMLDivElement>) => {
        const dragData = { photo, source: index };
        draggedPhotoRef.current = dragData;
        setDraggedPhoto(dragData);
  
        // Set drag image and data
        if (e.dataTransfer) {
          e.dataTransfer.setData(
            "text/plain",
            JSON.stringify({ id: photo.id, source: index })
          );
          e.dataTransfer.effectAllowed = "move";
        }
      };
  
    // When a photo is dropped on a slot.
    // When a photo is dropped on a slot.
    const handleDropOnSlot =
      (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!draggedPhoto) return;
        const dragData = draggedPhotoRef.current;
        if (!dragData) return;
        setSlots((prev) => {
          const newSlots = [...prev];
          if (draggedPhoto.source === "pool") {
            // Coming from pool to slot
            if (!newSlots[index]) {
              // Empty slot
              newSlots[index] = {
                ...draggedPhoto.photo,
                position: `slot ${index + 1}`,
              };
              setUploadedPhotos((prevPool) =>
                prevPool.filter((p) => p.id !== draggedPhoto.photo.id)
              );
            } else {
              // Swap with existing slot
              const existing = newSlots[index];
              newSlots[index] = {
                ...draggedPhoto.photo,
                position: `slot ${index + 1}`,
              };
              setUploadedPhotos((prevPool) => [
                ...prevPool.filter((p) => p.id !== draggedPhoto.photo.id),
                { ...existing!, position: "pool" },
              ]);
            }
          } else {
            // Swapping between slots
            const sourceIndex = draggedPhoto.source as number;
            if (sourceIndex === index) return prev;
  
            // Update position metadata for both slots
            const temp = newSlots[index];
            newSlots[index] = {
              ...draggedPhoto.photo,
              position: `slot ${index + 1}`,
            };
  
            // Ensure the swapped item has correct position metadata
            if (temp) {
              newSlots[sourceIndex] = {
                ...temp,
                position: `slot ${sourceIndex + 1}`,
              };
            } else {
              newSlots[sourceIndex] = null;
            }
          }
          setHasChanges(true);
          return newSlots;
        });
        setDraggedPhoto(null);
      };
  
    // Delete photo from pool.
    const handleDeleteFromPool = (id: string) => {
      setShowDeletePhotoModal({ id, type: 'pool' });
    };
  
    // Delete photo from slot.
    const handleDeleteFromSlot = (index: number) => {
      const slot = slots[index];
      if (slot) {
        setShowDeletePhotoModal({ id: slot.id, type: 'slot', index });
      }
    };
  
    // Confirm deletion handlers
    const confirmDelete = () => {
      if (!showDeletePhotoModal) return;
      
      if (showDeletePhotoModal.type === 'pool') {
        setUploadedPhotos((prev) => prev.filter((p) => p.id !== showDeletePhotoModal.id));
        setHasChanges(true);
      } else if (showDeletePhotoModal.type === 'slot' && showDeletePhotoModal.index !== undefined) {
        setSlots((prev) => {
          const newSlots = [...prev];
          newSlots[showDeletePhotoModal.index!] = null;
          return newSlots;
        });
        setHasChanges(true);
      }
      
      setShowDeletePhotoModal(null);
    };
  
    // When "Save Arrangement" is clicked, pass the entire slots array.
    const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
      // Prevent any event propagation that might trigger parent form submission
      e.preventDefault();
      e.stopPropagation();
      // Stop the event from bubbling up the DOM tree
      if (e.nativeEvent) {
        e.nativeEvent.stopImmediatePropagation();
        e.nativeEvent.preventDefault();
      }
      console.log("Save Arrangement clicked - preventing default and propagation");
      
      // Prevent form submission by delaying the save operation
      setTimeout(async () => {
        setIsSaving(true);
        try {
          await onSave(slots);
          setHasChanges(false);
          onClose();
        } catch (error) {
          console.error("Error saving arrangement:", error);
        } finally {
          setIsSaving(false);
        }
      }, 0);
      
      // Return false to ensure the event doesn't propagate further
      return false;
    };
  
    // Warn user if unsaved changes exist on cancel.
    const handleCancel = () => {
      if (hasChanges) {
        setShowUnsavedChangesModal(true);
      } else {
        onClose();
      }
    };
  
    const confirmCancel = () => {
      onClose();
      setShowUnsavedChangesModal(false);
    };
  
    if (!visible) return null;
  
    return (
      <div 
        className="fixed inset-0 z-[800] flex flex-col items-center justify-center bg-black bg-opacity-50 p-4 overflow-auto"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Unsaved Changes Confirmation Modal */}
        <ConfirmationModal
          isOpen={showUnsavedChangesModal}
          onClose={() => setShowUnsavedChangesModal(false)}
          onConfirm={confirmCancel}
          title="Unsaved Changes"
          description="You have unsaved changes. Are you sure you want to discard your changes?"
          confirmText="Discard Changes"
          cancelText="Keep Editing"
          type="warning"
        />
        
        {/* Delete Photo Confirmation Modal */}
        <ConfirmationModal
          isOpen={!!showDeletePhotoModal}
          onClose={() => setShowDeletePhotoModal(null)}
          onConfirm={confirmDelete}
          title="Delete Photo"
          description={showDeletePhotoModal?.type === 'pool' 
            ? "Are you sure you want to remove this photo from the pool?" 
            : `Are you sure you want to remove this photo from slot ${showDeletePhotoModal?.index !== undefined ? showDeletePhotoModal.index + 1 : ''}?`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {isUploadingPhoto && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <HashLoader color="white" loading={isUploadingPhoto} size={150} />
          </div>
        )}
        <div
          className="bg-white rounded-xl p-6 w-full max-w-[95vw] max-h-[95vh] overflow-auto"
        >
          <h2 className="text-2xl font-bold mb-4 select-none">
            Carousel Arrangement
          </h2>
          {/* Dropzone for uploading */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() =>
              document.getElementById("carousel-file-input")?.click()
            }
            className="w-full p-6 border-2 border-dashed border-gray-400 rounded-xl mb-4 text-center cursor-pointer select-none"
          >
            Drag & drop photos here or click to upload (photos only)
            <input
              id="carousel-file-input"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          {/* Uploaded Photos Pool */}
          {uploadedPhotos.length > 0 && (
            <div className="w-full mb-6">
              <h3 className="text-lg font-semibold mb-2 select-none">
                Uploaded Photos Pool
              </h3>
              <div className="flex flex-wrap gap-4">
                {uploadedPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative"
                    draggable
                    onDragStart={handlePoolDragStart(photo)}
                  >
                    <div className="w-full max-w-[200px] aspect-[4/5] border-2 border-dashed rounded-xl p-2 overflow-hidden">
                      <img
                        src={photo.url}
                        alt="Carousel pool"
                        className="w-full h-full object-contain rounded-sm p-1"
                        loading="lazy" 
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteFromPool(photo.id)}
                      className="absolute top-2 right-2 bg-white rounded-full p-1"
                      type="button"
                    >
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Grid for Slots */}
          <div className="w-full mb-6">
            <h3 className="text-lg font-semibold mb-2 select-none">
              Arrange Carousel Slots
            </h3>
            <div className="w-full max-h-[50vh] overflow-auto border-2 border-dashed p-4 rounded-xl">
              <div
                className="grid gap-4 justify-items-center"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                }}
              >
                {slots.map((slot, index) => (
                  <div
                    key={index}
                    className="relative w-full max-w-[200px] aspect-[4/5] cursor-pointer select-none"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropOnSlot(index)}
                  >
                    {slot ? (
                      <div
                        draggable
                        onDragStart={handleSlotDragStart(index, slot)}
                        className="w-full h-full border-2 border-dashed rounded-xl p-2 overflow-hidden transform transition-transform hover:scale-105"
                      >
                        <img
                          src={slot.url}
                          alt={`Slot ${index + 1}`}
                          className="w-full h-full object-contain rounded-sm p-1"
                          loading="lazy" 
                          onError={(e) => {
                            e.currentTarget.onerror = null; // Prevent infinite loop
                            e.currentTarget.src = "/path/to/fallback-image.jpg"; // Fallback image
                            e.currentTarget.classList.add("error-image");
                            console.error(
                              `Failed to load image for slot ${index + 1}`
                            );
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full border-2 border-dashed rounded-xl flex items-center justify-center text-gray-500 bg-gray-200 p-2">
                        <span className="text-sm font-semibold select-none">
                          Slot {index + 1}
                        </span>
                      </div>
                    )}
  
                    {slot && (
                      <div className="absolute top-2 left-2 bg-gray-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs select-none">
                        {index + 1}
                      </div>
                    )}
                    {slot && (
                      <button
                        onClick={() => handleDeleteFromSlot(index)}
                        className="absolute top-2 right-2 bg-white rounded-full p-1"
                        type="button"
                      >
                        <TrashIcon className="h-4 w-4 text-red-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border rounded-xl select-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-700 text-white rounded-xl select-none flex items-center justify-center gap-2 transform transition duration-200 ease-in hover:scale-105 disabled:opacity-50 carousel-save-action"
            >
              <CheckIcon className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save Arrangement"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // --- Carousel Display Component ---
  // Now accepts an array of CarouselPhoto or null to render all 20 slots in order.
  interface CarouselDisplayProps {
    images: (CarouselPhoto | null)[];
  }
  const CarouselDisplay: React.FC<CarouselDisplayProps> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isImageLoading, setIsImageLoading] = useState(false);
    
    // Filter out null slots and get valid images
    const validImages = images.filter((img): img is CarouselPhoto => img !== null);
    
    // If no valid images, show empty state
    if (validImages.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-gray-500">
            No carousel images available
          </div>
        </div>
      );
    }
    
    const nextSlide = () => {
      setIsImageLoading(true);
      setCurrentIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
    };
    
    const prevSlide = () => {
      setIsImageLoading(true);
      setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
    };
    
    // Find the actual slot number this image represents
    const getCurrentSlotNumber = () => {
      const currentImage = validImages[currentIndex];
      if (currentImage?.position?.startsWith('slot ')) {
        return parseInt(currentImage.position.split(' ')[1], 10);
      }
      return currentIndex + 1;
    };
    
    return (
      <div className="w-full h-full flex flex-col">
        <div className="relative w-full bg-white rounded-lg shadow-md overflow-hidden flex-1">
          <div className="w-full h-full flex items-center justify-center">
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <HashLoader color="#374151" size={50} />
              </div>
            )}
            <img 
              src={validImages[currentIndex].url} 
              alt={`Image ${getCurrentSlotNumber()}`}
              className="w-full h-auto object-contain"
              style={{ maxHeight: "calc(90vh - 200px)" }}
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
            />
          </div>
          
          {/* Navigation Arrows */}
          {validImages.length > 1 && (
            <>
              <button 
                onClick={prevSlide}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 shadow-md flex items-center justify-center hover:bg-white transition-colors z-10"
                aria-label="Previous image"
              >
                <ChevronLeftIcon className="h-5 w-5 text-gray-800" />
              </button>
              
              <button 
                onClick={nextSlide}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 shadow-md flex items-center justify-center hover:bg-white transition-colors z-10"
                aria-label="Next image"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-800" />
              </button>
            </>
          )}
          
          {/* Slot indicator */}
          <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10">
            Slot {getCurrentSlotNumber()}
          </div>
        </div>
        
        {/* Pagination Dots */}
        {validImages.length > 1 && (
          <div className="flex justify-center mt-2 gap-1.5">
            {validImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsImageLoading(true);
                  setCurrentIndex(idx);
                }}
                className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-gray-800' : 'bg-gray-300'}`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };
  
  // --- Modified RenderSecondColumn Component ---
  interface RenderSecondColumnProps {
    currentType: string;
    image?: {
      videoEmbed?: string;
      carouselArrangement?: CarouselPhoto[];
      url?: string;
      title?: string;
      label?: string;
      script?: string;
    } | null;
    projectId?: string;
    // onCarouselArrangementSave receives the full slots array (with positions).
    onCarouselArrangementSave: (arrangement: (CarouselPhoto | null)[]) => void;
    editing: boolean;
  }
  
  // Google Drive Embed Component with error handling and fallback
  interface GoogleDriveEmbedProps {
    embedUrl: string;
    originalUrl: string;
    isReel: boolean;
  }

  const GoogleDriveEmbed: React.FC<GoogleDriveEmbedProps> = ({ embedUrl, originalUrl, isReel }) => {
    const [embedFailed, setEmbedFailed] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const isGoogleDrive = embedUrl.includes("drive.google.com");

    // Handle iframe load error (CSP violations)
    useEffect(() => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const handleError = () => {
        setEmbedFailed(true);
      };

      // Try to detect CSP violations by checking if iframe loads
      const timeout = setTimeout(() => {
        try {
          // If we can't access iframe content, it might be blocked
          if (iframe.contentWindow === null) {
            setEmbedFailed(true);
          }
        } catch (e) {
          // Cross-origin error means iframe loaded but we can't access it (normal)
          // Only set failed if we get a specific error
        }
      }, 2000);

      iframe.addEventListener("error", handleError);

      return () => {
        clearTimeout(timeout);
        iframe.removeEventListener("error", handleError);
      };
    }, [embedUrl]);

    // If embed failed, show fallback UI
    if (embedFailed && isGoogleDrive) {
      return (
        <div className="absolute inset-0 w-full h-full rounded-xl bg-gray-100 flex items-center justify-center">
          <div className="text-center p-4 max-w-md">
            <p className="font-medium mb-2 text-gray-800">Unable to embed Google Drive video</p>
            <p className="text-xs text-gray-600 mb-4">
              This video cannot be embedded due to Google Drive's security policy. 
              Please ensure the file is shared with "Anyone with the link can view" permission.
            </p>
            <button
              type="button"
              onClick={() => window.open(originalUrl, '_blank', 'noopener,noreferrer')}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
            >
              Open in Google Drive
            </button>
          </div>
        </div>
      );
    }

    // Render iframe - remove sandbox for Google Drive to avoid CSP issues
    return (
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="absolute inset-0 w-full h-full rounded-xl"
        frameBorder="0"
        allowFullScreen
        loading="lazy"
        sandbox={isGoogleDrive ? undefined : "allow-scripts allow-same-origin allow-presentation"}
        referrerPolicy="no-referrer"
        width={isReel ? 1080 : undefined}
        height={isReel ? 1920 : undefined}
        onError={() => setEmbedFailed(true)}
      />
    );
  };

  // Validate embed URL for video/reel content
  const validateEmbedUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Google Drive
      if (hostname.includes('drive.google.com')) {
        return url.includes('/file/d/') || url.includes('/preview');
      }
      
      // YouTube
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return true;
      }
      
      // Vimeo
      if (hostname.includes('vimeo.com')) {
        return true;
      }
      
      // Other common video hosting platforms
      if (hostname.includes('dailymotion.com') || 
          hostname.includes('twitch.tv')) {
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  };

  const RenderSecondColumn: React.FC<RenderSecondColumnProps> = ({
    currentType,
    image,
    projectId,
    onCarouselArrangementSave,
    editing,
  }) => {
    const isDraft = image?.label === "Draft";
    const [draftScript, setDraftScript] = useState(image?.script || "");
    const draftQuillModules = useMemo(() => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote", "code-block"],
        [{ indent: "-1" }, { indent: "+1" }],
        [{ align: [] }],
        ["link"],
        ["clean"],
      ],
    }), []);

    useEffect(() => {
      if (!editing && image?.script !== undefined) {
        setDraftScript(image.script || "");
      }
    }, [editing, image?.script]);

    const [showCarouselModal, setShowCarouselModal] = useState(false);
    const [editingVideoUrl, setEditingVideoUrl] = useState(image?.videoEmbed || "");
    const [embeddedVideo, setEmbeddedVideo] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(Boolean(editing));
    const [showArrangementModal, setShowArrangementModal] = useState(false);
    const [arrangementSaving, setArrangementSaving] = useState(false);
    const [isDownloadingCarousel, setIsDownloadingCarousel] = useState(false);
    const carouselArrangement = useMemo(() => {
      return (
        image?.carouselArrangement?.filter(
          (item): item is CarouselPhoto => {
            return item !== null && typeof item.url === 'string' && item.url.length > 0;
          }
        ) || []
      );
    }, [image?.carouselArrangement]);
  
    // Update editingVideoUrl when image changes
    useEffect(() => {
      setEditingVideoUrl(image?.videoEmbed || "");
    }, [image?.videoEmbed]);
  
    // Use useMemo to convert the saved carouselArrangement into a 20-slot array.
    const initialSlots = useMemo<(CarouselPhoto | null)[]>(() => {
      const slots = Array(20).fill(null) as (CarouselPhoto | null)[];
      if (image?.carouselArrangement) {
        image.carouselArrangement.forEach((photo) => {
          if (photo && photo.position && photo.position.startsWith("slot ")) {
            const slotNum = parseInt(photo.position.split(" ")[1], 10) - 1;
            if (slotNum >= 0 && slotNum < 20) {
              slots[slotNum] = photo;
            }
          }
        });
      }
      return slots;
    }, [image?.carouselArrangement]);
  
    // Initialize local state from the computed initialSlots.
    const [carouselImages, setCarouselImages] =
      useState<(CarouselPhoto | null)[]>(initialSlots);
  
    // Update local state if initialSlots changes (e.g. when Firestore updates)
    useEffect(() => {
      // Deep comparison to prevent unnecessary re-renders
      const hasChanged =
        JSON.stringify(initialSlots) !== JSON.stringify(carouselImages);
      if (hasChanged) {
        setCarouselImages(initialSlots);
      }
    }, [initialSlots, carouselImages]);
  
    useEffect(() => {
      const preventDefault = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };
  
      // Add passive: false to ensure preventDefault works correctly
      document.addEventListener("dragover", preventDefault, { passive: false });
      document.addEventListener("drop", preventDefault, { passive: false });
  
      return () => {
        document.removeEventListener("dragover", preventDefault);
        document.removeEventListener("drop", preventDefault);
      };
    }, []);


    if (isDraft) {
      if (editing) {
        return (
          <div className="flex flex-col h-full">
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-gray-800">Content Idea | Script</h4>
              <p className="text-xs text-gray-500">
                Update the draft content below. The script will be saved when you click "Save".
              </p>
            </div>

            <input type="hidden" name="script" value={draftScript} />

            <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <ReactQuill
                value={draftScript}
                onChange={setDraftScript}
                modules={draftQuillModules}
                theme="snow"
                className="h-full"
              />
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col h-full border border-gray-200 rounded-lg shadow-sm bg-white">
          <div className="px-4 py-3 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-800">Content Idea | Script</h4>
          </div>
          <div className="flex-1 px-4 py-4 overflow-y-auto">
            { (image?.script ?? draftScript) ? (
              <article
                className="space-y-3 text-sm leading-6 text-gray-700"
                dangerouslySetInnerHTML={{ __html: image?.script ?? draftScript }}
              />
            ) : (
              <p className="text-sm text-gray-500 italic">
                This draft does not have script content yet.
              </p>
            )}
          </div>
        </div>
      );
    }

    if (currentType === "carousel") {
      return (
        <div className="flex flex-col h-full">
          {editing && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCarouselModal(true);
              }}
              type="button"
              className="w-full mb-4 rounded-lg bg-gray-700 px-4 py-2 text-xs text-white select-none flex items-center justify-center gap-2 transform transition duration-200 ease-in hover:scale-105"
            >
              <ArrowUpTrayIcon className="h-4 w-4" />
              <span>Upload carousel images</span>
            </button>
          )}
          <CarouselDisplay images={carouselImages} />
          {showCarouselModal && (
            <div 
              className="absolute inset-0 z-[1000]" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <CarouselArrangementModal
                visible={showCarouselModal}
                onClose={() => {
                  // Prevent any side effects when closing
                  setTimeout(() => {
                    setShowCarouselModal(false);
                  }, 0);
                }}
                initialSlots={carouselImages}
                onSave={(arranged) => {
                  // First update local state
                  setCarouselImages(arranged);
                  
                  // Then close the modal
                  setShowCarouselModal(false);
                  
                  // Finally save the changes in a separate event loop cycle
                  setTimeout(() => {
                    onCarouselArrangementSave(arranged);
                  }, 0);
                }}
              />
            </div>
          )}
        </div>
      );
    } else if (currentType === "photo") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          {image?.url ? (
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={image.url}
                alt={image.title || "Image"}
                className="w-full h-auto object-contain rounded-md"
                style={{ maxHeight: "calc(90vh - 200px)" }}
              />
            </div>
          ) : (
            <div className="text-center text-gray-500 select-none">No image available</div>
          )}
        </div>
      );
    } else {
      // Set specific dimensions for reels (1080x1920)
      const aspectRatio = currentType === "reel" ? "aspect-[9/16]" : "aspect-[16/9]";
      
      // Improved URL transformation for Google Drive links
      let embedUrl = "";
      const urlToProcess = editing ? editingVideoUrl : (image?.videoEmbed || "");
      
      if (urlToProcess) {
        // Extract the file ID for Google Drive links
        if (urlToProcess.includes("drive.google.com")) {
          const fileIdMatch = urlToProcess.match(/\/file\/d\/([^\/]+)/);
          if (fileIdMatch && fileIdMatch[1]) {
            // Construct a clean preview URL with the file ID
            const fileId = fileIdMatch[1];
            embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
          } else {
            // Fallback if pattern doesn't match
            embedUrl = urlToProcess.replace("/view", "/preview").split("?")[0];
          }
        } else {
          // For non-Google Drive URLs
          embedUrl = urlToProcess;
        }
      }
      
      // Calculate styles for reel - maintain 1080x1920 ratio but scale to fit container
      const reelStyles = currentType === "reel" 
        ? { 
            maxWidth: "min(100%, 540px)", // Half of 1080 to fit most screens while maintaining ratio
            margin: "0 auto",
          } 
        : {};
      
      return (
        <div className="flex flex-col border-r pr-2 h-full">
          <input
            name="videoEmbed"
            disabled={!editing}
            value={editingVideoUrl}
            onChange={(e) => setEditingVideoUrl(e.target.value)}
            className="mt-1 w-full rounded-xl border px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none select-none"
            placeholder="Enter video URL (Google Drive, YouTube, Vimeo)"
          />
          {(editing ? editingVideoUrl : image?.videoEmbed) && (
            <div
              className={`relative w-full mt-2 ${aspectRatio} shadow-sm overflow-hidden rounded-xl`}
              style={{
                ...reelStyles,
                maxHeight: currentType === "reel" ? "calc(90vh - 200px)" : "calc(100vh-250px)"
              }}
            >
              {validateEmbedUrl(embedUrl) ? (
                <GoogleDriveEmbed
                  embedUrl={embedUrl}
                  originalUrl={urlToProcess}
                  isReel={currentType === "reel"}
                />
              ) : (
                <div className="absolute inset-0 w-full h-full rounded-xl bg-gray-100 flex items-center justify-center text-red-500">
                  <div className="text-center p-4">
                    <p className="font-medium mb-2">Invalid or unsupported video URL</p>
                    <p className="text-xs text-gray-600">
                      For Google Drive videos, use a link in this format:<br/>
                      https://drive.google.com/file/d/FILE_ID/view
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
  };
  
  export default RenderSecondColumn;
  
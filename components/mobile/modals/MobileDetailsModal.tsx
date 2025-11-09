"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import Modal from "@/components/common/modals/Modal";
import { ExtendedImageMeta } from "@/components/modals/DetailsModal";
import { Comment as CommentType } from "@/components/modals/DetailsModalParts/CommentsSection";
import { CarouselPhoto } from "@/components/modals/DetailsModalParts/RenderSecondColumn";
import { ImageMeta } from "@/components/pages/DemoWrapper";
import { type SocialMediaInstance } from "@/components/ui/social-media-switch";
import { useSnack } from "@/components/common/feedback/Snackbar";
import {
  EyeIcon,
  PencilIcon,
  ChatBubbleLeftEllipsisIcon,
  HeartIcon,
  PaperAirplaneIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { HeartIcon as SolidHeartIcon, TrashIcon } from "@heroicons/react/24/solid";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Image from "next/image";
import HashLoader from "react-spinners/HashLoader";
import { useAuth } from "@/components/services/AuthProvider";
import { getRelativeTime } from "@/components/modals/DetailsModalParts/RelativeTime";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/components/services/firebaseService";

interface MobileDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  image: ExtendedImageMeta;
  onSave: (updatedData: Partial<ImageMeta>) => Promise<void>;
  projectId: string;
  activeInstance: SocialMediaInstance;
}

// Nested modal for View/Edit Description or Caption
interface ViewEditModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: string;
  mode: "view" | "edit";
  onUpdate?: (value: string) => void;
}

const ViewEditModal: React.FC<ViewEditModalProps> = ({
  visible,
  onClose,
  title,
  value,
  mode,
  onUpdate,
}) => {
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    setEditValue(value);
  }, [value, visible]);

  const handleUpdate = () => {
    if (onUpdate && mode === "edit") {
      onUpdate(editValue);
    }
    onClose();
  };

  const handleCancel = () => {
    setEditValue(value); // Reset to original value
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible}>
      <div className="bg-white rounded-lg p-4 w-[90vw] max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b mb-4">
          <h3 className="text-lg font-bold">
            {mode === "view" ? `View ${title}` : `Edit ${title}`}
          </h3>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        {mode === "view" ? (
          <div className="py-4">
            <div className="min-h-[100px] p-3 bg-gray-50 rounded border border-gray-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                {value || "No content"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{title}</label>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={8}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${title.toLowerCase()}`}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default function MobileDetailsModal({
  visible,
  onClose,
  image,
  onSave,
  projectId,
  activeInstance,
}: MobileDetailsModalProps) {
  const { createSnack } = useSnack();
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<any>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  // Main form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [caption, setCaption] = useState("");
  const [label, setLabel] = useState("");
  const [contentType, setContentType] = useState("");
  const [localImageUrl, setLocalImageUrl] = useState("");
  const [localVideoEmbed, setLocalVideoEmbed] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Modal state for Description/Caption
  const [showDescViewModal, setShowDescViewModal] = useState(false);
  const [showDescEditModal, setShowDescEditModal] = useState(false);
  const [showCaptionViewModal, setShowCaptionViewModal] = useState(false);
  const [showCaptionEditModal, setShowCaptionEditModal] = useState(false);

  // Modal state for Video URL editing
  const [showVideoUrlModal, setShowVideoUrlModal] = useState(false);
  const [tempVideoUrl, setTempVideoUrl] = useState("");

  // Comment state
  const [comments, setComments] = useState<CommentType[]>(image?.comments || []);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  
  // Comment constants
  const COMMENT_MAX_LENGTH = 5000;

  // Initialize form fields when modal opens or image changes
  useEffect(() => {
    if (visible && image) {
      setTitle(image.title || "");
      setDescription(image.description || "");
      setCaption(image.caption || "");
      setLabel(image.label || "");
      setContentType(image.contentType || "Photo");
      setLocalImageUrl(image.url || "");
      setLocalVideoEmbed(image.videoEmbed || "");
      setComments(image.comments || []);
      // Reset image loading state when image changes
      if (image.url) {
        setIsImageLoading(true);
      }
    }
  }, [visible, image]);

  // Auto-resize title textarea when title changes
  useEffect(() => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = "auto";
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  }, [title]);

  // Check if content type is editable (photo, reel, or carousel)
  // Note: Carousel has limited editing (Description, Caption, Status only)
  const isEditable = image?.contentType === "Photo" || image?.contentType === "reel" || image?.contentType === "carousel";
  
  // Check if content type is Carousel
  const isCarousel = contentType.toLowerCase() === "carousel" || image?.contentType?.toLowerCase() === "carousel";

  // Handle Description update (local state only)
  const handleDescriptionUpdate = (newValue: string) => {
    setDescription(newValue);
  };

  // Handle Caption update (local state only)
  const handleCaptionUpdate = (newValue: string) => {
    setCaption(newValue);
  };

  // Validate embed URL for video/reel content
  const validateEmbedUrl = (url: string): boolean => {
    if (!url || typeof url !== "string" || url.trim() === "") {
      return false;
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Google Drive
      if (hostname.includes("drive.google.com")) {
        return url.includes("/file/d/") || url.includes("/preview");
      }

      // YouTube
      if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
        return true;
      }

      // Vimeo
      if (hostname.includes("vimeo.com")) {
        return true;
      }

      // Other common video hosting platforms
      if (hostname.includes("dailymotion.com") || hostname.includes("twitch.tv")) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  // Handle Video URL update (local state only)
  const handleVideoUrlUpdate = () => {
    if (tempVideoUrl.trim() && !validateEmbedUrl(tempVideoUrl.trim())) {
      createSnack("Invalid video URL. Please check the URL and try again.", "error");
      return;
    }
    setLocalVideoEmbed(tempVideoUrl.trim());
    setShowVideoUrlModal(false);
  };

  // Open video URL modal
  const handleOpenVideoUrlModal = () => {
    setTempVideoUrl(localVideoEmbed);
    setShowVideoUrlModal(true);
  };

  // Process video embed URL (similar to desktop version)
  const getProcessedVideoUrl = (url: string): string => {
    if (!url || typeof url !== "string" || url.trim() === "") {
      return "";
    }

    try {
      // Handle Google Drive links
      if (url.includes("drive.google.com")) {
        const fileIdMatch = url.match(/\/file\/d\/([^\/]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          const fileId = fileIdMatch[1];
          return `https://drive.google.com/file/d/${fileId}/preview`;
        } else {
          // Fallback if pattern doesn't match
          return url.replace("/view", "/preview").split("?")[0];
        }
      }

      // For non-Google Drive URLs, return as-is
      return url;
    } catch {
      return url;
    }
  };

  // Check if content type is Reel
  const isReel = contentType.toLowerCase() === "reel";
  
  // Check if status is Draft (from local state or original image)
  const isDraft = label.toLowerCase() === "draft" || image?.label?.toLowerCase() === "draft";

  // Carousel state
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  
  // Get carousel images (filter out null/invalid)
  const carouselImages = React.useMemo(() => {
    if (!image?.carouselArrangement || !Array.isArray(image.carouselArrangement)) {
      return [];
    }
    return image.carouselArrangement.filter(
      (item): item is CarouselPhoto => item !== null && typeof item === "object" && typeof item.url === "string" && item.url.length > 0
    );
  }, [image?.carouselArrangement]);

  // Reset carousel index when carousel images change
  useEffect(() => {
    if (isCarousel && carouselImages.length > 0) {
      setCurrentCarouselIndex(0);
    }
  }, [isCarousel, carouselImages.length]);

  // Carousel navigation functions
  const goToPrevious = () => {
    setCurrentCarouselIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const goToNext = () => {
    setCurrentCarouselIndex((prev) => (prev < carouselImages.length - 1 ? prev + 1 : prev));
  };

  // Post comment handler
  const handlePostComment = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!user || !image || !newComment.trim() || isPostingComment) return;

    setIsPostingComment(true);

    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date();
    const newCommentObj: CommentType = {
      id: commentId,
      userPhoto: user.photoURL || `/default-avatar.png`,
      userName: user.displayName || user.email || "Anonymous User",
      text: newComment.trim(),
      likes: [],
      userId: user.uid,
      timestamp,
    };

    // Create new activity for activity log
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newActivity = {
      id: activityId,
      userId: user.uid,
      userName: user.displayName || user.email || "Anonymous User",
      userPhoto: user.photoURL || undefined,
      action: "added a comment",
      details: newComment.trim(),
      timestamp: new Date(),
    };

    // Capture previous state for error handling
    const previousComments = [...comments];
    const previousNewComment = newComment;

    // Optimistic update
    const updatedComments = [...comments, newCommentObj];
    setComments(updatedComments);
    setNewComment("");

    try {
      if (!image.id) {
        throw new Error("Cannot save comment: missing image ID");
      }

      // Save activity to Firestore subcollection
      try {
        const activityDocRef = doc(db, "images", image.id, "activities", activityId);
        const firestoreActivity = {
          ...newActivity,
          imageId: image.id,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
        };
        await setDoc(activityDocRef, firestoreActivity);
      } catch (activityError) {
        // Activity logging is optional, don't fail if it errors
        console.warn("Failed to save activity:", activityError);
      }

      // Save comments to image metadata via onSave
      const updatedImage: Partial<ImageMeta> = {
        ...image,
        comments: updatedComments,
      };

      await onSave(updatedImage);

      // Scroll to bottom of comments
      setTimeout(() => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
        }
      }, 100);

      createSnack("Comment posted successfully", "success");
    } catch (error) {
      console.error("Error posting comment:", error);
      // Revert optimistic update
      setComments(previousComments);
      setNewComment(previousNewComment);
      createSnack("Failed to post comment", "error");
    } finally {
      setIsPostingComment(false);
    }
  };

  // Toggle like handler
  const toggleLike = async (commentId: string) => {
    if (!user) {
      createSnack("You must be logged in to like comments", "error");
      return;
    }

    const previousComments = [...comments];
    const updatedComments = comments.map((comment) => {
      if (comment.id === commentId) {
        const index = comment.likes.findIndex((like) => like.uid === user.uid);
        const newLikes =
          index !== -1
            ? comment.likes.filter((like) => like.uid !== user.uid)
            : [
                ...comment.likes,
                {
                  uid: user.uid,
                  displayName: user.displayName || user.email || "Anonymous User",
                },
              ];
        return { ...comment, likes: newLikes };
      }
      return comment;
    });

    setComments(updatedComments);

    try {
      if (image) {
        const updatedImage: Partial<ImageMeta> = {
          ...image,
          comments: updatedComments,
        };
        await onSave(updatedImage);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update
      setComments(previousComments);
      createSnack("Failed to update like", "error");
    }
  };

  // Delete comment handler
  const deleteComment = async (commentId: string) => {
    if (!user) return;

    const comment = comments.find((c) => c.id === commentId);
    if (!comment || comment.userId !== user.uid) {
      createSnack("You can only delete your own comments", "error");
      return;
    }

    const previousComments = [...comments];
    const updatedComments = comments.filter((comment) => comment.id !== commentId);

    setComments(updatedComments);

    try {
      if (image) {
        const updatedImage: Partial<ImageMeta> = {
          ...image,
          comments: updatedComments,
        };
        await onSave(updatedImage);
        createSnack("Comment deleted successfully", "success");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      // Revert optimistic update
      setComments(previousComments);
      createSnack("Failed to delete comment", "error");
    }
  };

  // Handle photo change (uploads to Firebase Storage but only updates local state)
  const handlePhotoChange = async (file: File) => {
    if (!file || !image) return;

    // File validation
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      createSnack("Please select a valid image file (JPEG, PNG, GIF, WebP)", "error");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      createSnack("File size exceeds 5MB limit", "error");
      return;
    }

    setIsUploadingPhoto(true);
    setUploadProgress(0);

    const maxRetries = 3;
    let retryCount = 0;
    let success = false;

    while (retryCount <= maxRetries && !success) {
      try {
        const storage = getStorage();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const fileRef = ref(storage, `uploads/${fileName}`);
        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTaskRef.current = uploadTask;

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              );
              setUploadProgress(progress);
            },
            (error) => {
              reject(error);
            },
            () => resolve()
          );
        });

        uploadTaskRef.current = null;
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

        if (!downloadURL) {
          throw new Error("Failed to get download URL");
        }

        // Update local state only (not Firestore yet)
        setLocalImageUrl(downloadURL);
        setIsImageLoading(true); // Set loading state for new image
        success = true;
        createSnack("Photo uploaded. Click 'Save Changes' to save.", "success");
      } catch (error: unknown) {
        retryCount++;
        console.error(`Error uploading photo (attempt ${retryCount}/${maxRetries}):`, error);

        if (error instanceof Error && "code" in error && error.code === "storage/canceled") {
          success = true;
        } else if (retryCount <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        } else {
          createSnack(
            `Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`,
            "error"
          );
        }
      }
    }

    setIsUploadingPhoto(false);
    setUploadProgress(0);
    uploadTaskRef.current = null;
  };

  // Trigger file input
  const handleChangePhotoClick = () => {
    photoInputRef.current?.click();
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoChange(file);
    }
    // Reset input so same file can be selected again
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  };

  // Handle form submit (saves everything to Firestore)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isEditable) {
      createSnack("Only Photo, Reel, and Carousel content can be edited on mobile", "error");
      return;
    }

    setIsSaving(true);
    try {
      const updatedData: Partial<ImageMeta> = {
        title,
        description,
        caption,
        label,
        contentType,
        // Only include URL if it's different from original (photo was changed) and not Draft and not Carousel
        ...(!isDraft && !isCarousel && localImageUrl !== (image.url || "") && { url: localImageUrl }),
        // Include videoEmbed if it's different from original and not Draft and not Carousel
        ...(!isDraft && !isCarousel && localVideoEmbed !== (image.videoEmbed || "") && { videoEmbed: localVideoEmbed }),
        // Preserve script field (important for Draft status)
        ...(image.script !== undefined && { script: image.script }),
        // Preserve carouselArrangement (carousels cannot be edited on mobile)
        ...(isCarousel && image.carouselArrangement && { carouselArrangement: image.carouselArrangement }),
        // Preserve comments (they are managed separately via comment handlers)
        comments: comments,
      };

      await onSave(updatedData);
      createSnack("Changes saved successfully", "success");
      onClose();
    } catch (error) {
      console.error("Error saving changes:", error);
      createSnack("An error occurred while saving", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (isSaving) return;
    // Reset form to original values
    setTitle(image.title || "");
    setDescription(image.description || "");
    setCaption(image.caption || "");
    setLabel(image.label || "");
    setContentType(image.contentType || "Photo");
    setLocalImageUrl(image.url || "");
    setLocalVideoEmbed(image.videoEmbed || "");
    onClose();
  };

  if (!visible || !image) return null;

  return (
    <>
      <Modal visible={visible}>
        <div className="bg-white rounded-lg p-4 w-[90vw] max-w-md max-h-[90vh] overflow-y-auto">
          <style jsx global>{`
            @keyframes shimmer {
              0% {
                background-position: -200% 0;
              }
              100% {
                background-position: 200% 0;
              }
            }
            .shimmer-animation {
              animation: shimmer 1.5s infinite;
            }
          `}</style>
          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b mb-4">
            <h3 className="text-lg font-bold">Edit Content</h3>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>

          {!isEditable && !isCarousel && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Only Photo, Reel, and Carousel content can be edited on mobile. Video editing is not available.
              </p>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <textarea
                ref={titleTextareaRef}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  // Auto-resize textarea
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onInput={(e) => {
                  // Auto-resize on input
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${target.scrollHeight}px`;
                }}
                required
                disabled={!isEditable || isSaving}
                placeholder="This is the title of this content"
                rows={1}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none overflow-hidden"
                style={{ minHeight: "2.5rem" }}
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Description</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDescViewModal(true)}
                    disabled={isSaving}
                    className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <EyeIcon className="h-3 w-3" />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDescEditModal(true)}
                    disabled={!isEditable || isSaving}
                    className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <PencilIcon className="h-3 w-3" />
                    Edit
                  </button>
                </div>
              </div>
            </div>

            {/* Caption */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Caption</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCaptionViewModal(true)}
                    disabled={isSaving}
                    className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <EyeIcon className="h-3 w-3" />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCaptionEditModal(true)}
                    disabled={!isEditable || isSaving}
                    className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <PencilIcon className="h-3 w-3" />
                    Edit
                  </button>
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                disabled={!isEditable || isSaving}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="Approved">Approved</option>
                <option value="Needs Revision">Needs Revision</option>
                <option value="Ready for Approval">Ready for Approval</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            {/* Content Type */}
            {isEditable && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Content Type <span className="text-red-500">*</span>
                </label>
                {isCarousel ? (
                  // Read-only display for Carousel
                  <div>
                    <div className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-gray-100 text-gray-700">
                      Carousel
                    </div>
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                      <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-800">
                        Carousels can only be edited on desktop view
                      </p>
                    </div>
                  </div>
                ) : (
                  // Editable dropdown for Photo and Reel
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    required
                    disabled={isSaving}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="Photo">Photo</option>
                    <option value="reel">Reel</option>
                  </select>
                )}
              </div>
            )}

            {/* Read-only fields for non-editable content */}
            {!isEditable && (
              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Content Type:</span> {image.contentType}
                </div>
                {image.videoEmbed && (
                  <div>
                    <span className="font-medium">Video Embed:</span>{" "}
                    {image.videoEmbed.substring(0, 50)}...
                  </div>
                )}
              </div>
            )}

            {/* Draft Status: Show Script HTML Content */}
            {isEditable && isDraft && (
              <div className="w-[calc(100%+2rem)] -mx-4">
                <div className="w-full min-h-[200px] max-h-[400px] rounded border border-gray-300 bg-white overflow-hidden">
                  <div className="p-4 overflow-y-auto max-h-[400px]">
                    {image?.script ? (
                      <div
                        className="w-full"
                        dangerouslySetInnerHTML={{ __html: image.script }}
                        style={{
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          lineHeight: "1.6",
                          fontSize: "14px",
                        }}
                      />
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-500">No script content available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Carousel Display - Only show when Carousel */}
            {isEditable && isCarousel && (
              <div className="w-[calc(100%+2rem)] -mx-4">
                <div className="w-full min-h-[200px] rounded border border-gray-300 bg-white overflow-hidden relative">
                  {carouselImages.length === 0 ? (
                    <div className="py-8 w-full text-center">
                      <p className="text-sm text-gray-500">No carousel images available</p>
                    </div>
                  ) : (
                    <div className="relative w-full">
                      {/* Carousel Image */}
                      <div className="relative w-full min-h-[300px] max-h-[500px] flex items-center justify-center bg-gray-50">
                        <Image
                          src={carouselImages[currentCarouselIndex]?.url || ""}
                          alt={`Carousel image ${currentCarouselIndex + 1}`}
                          width={0}
                          height={0}
                          sizes="100vw"
                          className="w-full h-auto max-h-[500px] object-contain"
                          onError={(e) => {
                            console.error("Error loading carousel image:", carouselImages[currentCarouselIndex]?.url);
                          }}
                        />
                      </div>

                      {/* Navigation Arrows */}
                      {carouselImages.length > 1 && (
                        <>
                          {/* Left Arrow */}
                          <button
                            type="button"
                            onClick={goToPrevious}
                            disabled={currentCarouselIndex === 0}
                            className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-opacity ${
                              currentCarouselIndex === 0 ? "opacity-30 cursor-not-allowed" : "opacity-100"
                            }`}
                          >
                            <ChevronLeftIcon className="h-6 w-6" />
                          </button>

                          {/* Right Arrow */}
                          <button
                            type="button"
                            onClick={goToNext}
                            disabled={currentCarouselIndex === carouselImages.length - 1}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-opacity ${
                              currentCarouselIndex === carouselImages.length - 1 ? "opacity-30 cursor-not-allowed" : "opacity-100"
                            }`}
                          >
                            <ChevronRightIcon className="h-6 w-6" />
                          </button>
                        </>
                      )}

                      {/* Image Counter */}
                      {carouselImages.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs">
                          {currentCarouselIndex + 1} / {carouselImages.length}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reel Video Player Section - Only show when NOT Draft and NOT Carousel */}
            {isEditable && isReel && !isDraft && !isCarousel && (
              <div className="space-y-4">
                {/* Update Video link Button */}
                <button
                  type="button"
                  onClick={handleOpenVideoUrlModal}
                  disabled={isSaving}
                  className="w-full rounded bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update Video link
                </button>

                {/* Video Player */}
                {localVideoEmbed && (
                  <div className="w-[calc(100%+2rem)] -mx-4 px-4">
                    <div className="w-full rounded border border-gray-300 bg-white overflow-hidden p-2">
                      <div className="relative w-full" style={{ aspectRatio: "9/16" }}>
                        {validateEmbedUrl(localVideoEmbed) ? (
                          <iframe
                            src={getProcessedVideoUrl(localVideoEmbed)}
                            className="absolute inset-0 w-full h-full rounded"
                            frameBorder="0"
                            allowFullScreen
                            allow="autoplay; fullscreen"
                            loading="lazy"
                            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox allow-forms"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full rounded bg-gray-100 flex items-center justify-center text-red-500 p-4">
                            <div className="text-center">
                              <p className="font-medium mb-2 text-sm">Invalid or unsupported video URL</p>
                              <p className="text-xs text-gray-600">
                                For Google Drive videos, use a link in this format:
                                <br />
                                https://drive.google.com/file/d/FILE_ID/view
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Change Photo or Thumbnail Button - Only show when NOT Draft and NOT Carousel */}
            {isEditable && !isDraft && !isCarousel && (
              <div>
                <button
                  type="button"
                  onClick={handleChangePhotoClick}
                  disabled={isUploadingPhoto || isSaving}
                  className="w-full rounded bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingPhoto ? `Uploading... ${uploadProgress}%` : "Change Photo or Thumbnail"}
                </button>
              </div>
            )}

            {/* Photo Display Area - Only show when NOT Draft and NOT Carousel */}
            {isEditable && !isDraft && !isCarousel && (
              <div className="w-[calc(100%+2rem)] -mx-4">
                <div className="w-full min-h-[200px] rounded border border-gray-300 bg-white flex items-center justify-center overflow-hidden relative">
                  {isUploadingPhoto ? (
                    <div className="flex flex-col items-center gap-2 py-8 w-full">
                      <HashLoader color="#3b82f6" size={40} />
                      <p className="text-sm text-gray-600">{uploadProgress}%</p>
                    </div>
                  ) : localImageUrl ? (
                    <>
                      {/* Animated gradient placeholder - shows while image is loading */}
                      {isImageLoading && (
                        <div 
                          className="absolute inset-0 w-full h-full min-h-[200px] shimmer-animation rounded flex flex-col items-center justify-center z-10"
                          style={{
                            background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                            backgroundSize: "200% 100%",
                          }}
                        >
                          <HashLoader color="#3b82f6" size={40} />
                          <p className="mt-3 text-sm text-gray-600 font-medium">Loading photo...</p>
                        </div>
                      )}
                      {/* Image */}
                      <div className="relative w-full min-h-[200px] flex items-center justify-center p-2">
                        <Image
                          src={localImageUrl}
                          alt={title || "Content thumbnail"}
                          width={0}
                          height={0}
                          sizes="100vw"
                          className="w-full h-auto max-h-[400px] object-contain"
                          onLoad={() => setIsImageLoading(false)}
                          onError={() => setIsImageLoading(false)}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="py-8 w-full">
                      <p className="text-sm text-gray-500">Photo</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comment Section Button */}
            {isEditable && (
              <button
                type="button"
                onClick={() => setShowCommentModal(true)}
                disabled={isSaving}
                className="w-full rounded border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                Comment section
                {comments.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-semibold text-gray-600 bg-gray-200 rounded-full">
                    {comments.length}
                  </span>
                )}
              </button>
            )}

            {/* Save Changes Button */}
            {isEditable && (
              <button
                type="submit"
                disabled={isSaving || isUploadingPhoto}
                className="w-full rounded bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </form>

          {/* Hidden file input */}
          <input
            type="file"
            ref={photoInputRef}
            onChange={handleFileInputChange}
            className="hidden"
            accept="image/*"
          />
        </div>
      </Modal>

      {/* View/Edit Modals for Description */}
      <ViewEditModal
        visible={showDescViewModal}
        onClose={() => setShowDescViewModal(false)}
        title="Description"
        value={description}
        mode="view"
      />
      <ViewEditModal
        visible={showDescEditModal}
        onClose={() => setShowDescEditModal(false)}
        title="Description"
        value={description}
        mode="edit"
        onUpdate={handleDescriptionUpdate}
      />

      {/* View/Edit Modals for Caption */}
      <ViewEditModal
        visible={showCaptionViewModal}
        onClose={() => setShowCaptionViewModal(false)}
        title="Caption"
        value={caption}
        mode="view"
      />
      <ViewEditModal
        visible={showCaptionEditModal}
        onClose={() => setShowCaptionEditModal(false)}
        title="Caption"
        value={caption}
        mode="edit"
        onUpdate={handleCaptionUpdate}
      />

      {/* Video URL Edit Modal */}
      <Modal visible={showVideoUrlModal}>
        <div className="bg-white rounded-lg p-4 w-[90vw] max-w-md max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center pb-3 border-b mb-4">
            <h3 className="text-lg font-bold">Update Video link</h3>
            <button
              type="button"
              onClick={() => {
                setTempVideoUrl(localVideoEmbed); // Reset to current value
                setShowVideoUrlModal(false);
              }}
              className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Video URL</label>
              <input
                type="text"
                value={tempVideoUrl}
                onChange={(e) => setTempVideoUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/FILE_ID/view"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-xs text-gray-600">
                Supported: Google Drive, YouTube, Vimeo, DailyMotion, Twitch
              </p>
              {tempVideoUrl.trim() && !validateEmbedUrl(tempVideoUrl.trim()) && (
                <p className="mt-1 text-xs text-red-500">
                  Invalid URL format. Please check the URL and try again.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setTempVideoUrl(localVideoEmbed); // Reset to current value
                  setShowVideoUrlModal(false);
                }}
                className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVideoUrlUpdate}
                className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Comment Section Modal */}
      <Modal visible={showCommentModal}>
        <div className="bg-white rounded-lg p-4 w-[90vw] max-w-md max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b mb-4 flex-shrink-0">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />
              Comments
            </h3>
            <button
              type="button"
              onClick={() => setShowCommentModal(false)}
              className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          {/* Comments List - Scrollable */}
          <div className="flex-1 overflow-y-auto mb-4 min-h-0">
            <div
              ref={commentsContainerRef}
              className="space-y-3 pr-2"
              style={{ maxHeight: "60vh" }}
            >
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No comments yet.
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={comment.userPhoto}
                        alt="Profile"
                        className="h-8 w-8 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/default-avatar.png";
                        }}
                      />
                      <span className="font-semibold text-sm text-gray-900">
                        {comment.userName}
                      </span>
                    </div>

                    {/* Comment Text */}
                    <div className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-2">
                      {comment.text}
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                      {/* Like Section */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleLike(comment.id);
                          }}
                          className="focus:outline-none hover:scale-110 transition-transform"
                          disabled={!user}
                        >
                          {user && comment.likes.find((like) => like.uid === user.uid) ? (
                            <SolidHeartIcon className="h-5 w-5 text-red-600" />
                          ) : (
                            <HeartIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </button>
                        {comment.likes.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-600 font-medium">
                              {comment.likes.length}
                            </span>
                            {comment.likes.length === 1 && (
                              <span className="text-xs text-gray-500">
                                · {comment.likes[0].displayName}
                              </span>
                            )}
                            {comment.likes.length === 2 && (
                              <span className="text-xs text-gray-500">
                                · {comment.likes[0].displayName} and {comment.likes[1].displayName}
                              </span>
                            )}
                            {comment.likes.length > 2 && (
                              <span className="text-xs text-gray-500">
                                · {comment.likes[0].displayName}, {comment.likes[1].displayName}, and{" "}
                                {comment.likes.length - 2} other{comment.likes.length - 2 > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Time and Delete */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {getRelativeTime(comment.timestamp)}
                        </span>
                        {user && comment.userId === user.uid && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteComment(comment.id);
                            }}
                            className="hover:bg-gray-200 p-1 rounded transition-colors"
                          >
                            <TrashIcon className="h-4 w-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Comment Section - Fixed at bottom */}
          <div className="border-t border-gray-200 pt-4 flex-shrink-0">
            <div className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={`Comment as ${user?.displayName || user?.email || "User"}`}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm resize-none break-words min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={COMMENT_MAX_LENGTH}
                disabled={isPostingComment || !user}
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  {newComment.length}/{COMMENT_MAX_LENGTH} characters
                </div>
                <button
                  type="button"
                  onClick={handlePostComment}
                  disabled={!newComment.trim() || isPostingComment || !user}
                  className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white transition-colors ${
                    newComment.trim() && !isPostingComment && user
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  {isPostingComment ? (
                    <>
                      <HashLoader color="#ffffff" size={16} />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-4 w-4" />
                      <span>Post</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

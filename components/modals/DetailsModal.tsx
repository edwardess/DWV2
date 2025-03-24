// DetailsModal.tsx
import React, {
    useRef,
    FormEvent,
    useState,
    useEffect,
    useCallback,
  } from "react";
  import { motion, AnimatePresence } from "framer-motion";
  import { ImageMeta } from "@/components/pages/DemoWrapper";
  import { Attachment } from "@/components/common/media/AttachmentDropZone";
  import {
    ArrowDownTrayIcon,
    ChatBubbleLeftEllipsisIcon,
    DocumentTextIcon,
    TagIcon,
    ViewColumnsIcon,
    VideoCameraIcon,
    PhotoIcon,
  XMarkIcon,
  PencilIcon,
  ChevronDownIcon,
  CheckIcon,
  } from "@heroicons/react/24/outline";
  import HashLoader from "react-spinners/HashLoader";
  import { useAuth } from "@/components/services/AuthProvider";
  import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
  import debounce from "lodash-es/debounce";
  import ApproveSwitch from "@/components/common/feedback/ApproveSwitch";
  import { doc, updateDoc } from "firebase/firestore";
  import { db } from "@/components/services/firebaseService";
  import { useSnack } from "@/components/common/feedback/Snackbar";

// Import shadcn UI components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ConfirmationModal from "@/components/ui/confirmation-modal";
  
  // Import separated parts from DetailsModalParts folder
  import { getRelativeTime } from "./DetailsModalParts/RelativeTime";
  import ExpandableText from "./DetailsModalParts/ExpandableText";
  import AttachmentsList from "./DetailsModalParts/AttachmentsList";
  import CommentsSection from "./DetailsModalParts/CommentsSection";
import RenderSecondColumn, { CarouselPhoto } from "./DetailsModalParts/RenderSecondColumn";
  import RenderThirdColumn from "./DetailsModalParts/RenderThirdColumn";
import RenderFirstColumn from "./DetailsModalParts/RenderFirstColumn";
  // Import updated AttachmentDropZone (without the attachments list)
  import AttachmentDropZone from "@/components/common/media/AttachmentDropZone";
  
  // Constants
  const DESCRIPTION_THRESHOLD = 1000;
  const CAPTION_THRESHOLD = 1000;
  const COMMENT_MAX_LENGTH = 5000;
  
  // Types
  interface Like {
    uid: string;
    displayName: string;
  }
  
  export interface Comment {
    id: string;
    userPhoto: string;
    userName: string;
    text: string;
    likes: Like[];
    userId: string;
    timestamp?: Date | string;
  }
  
// Define interface extending ImageMeta without contentType
export interface ExtendedImageMeta extends Omit<ImageMeta, 'contentType' | 'videoEmbed'> {
  id: string;
  contentType: string;
  videoEmbed?: string; // Make this optional to match usage throughout component
  comments?: Comment[];
  caption?: string;
  attachments?: Attachment[];
  carouselArrangement?: CarouselPhoto[];
  projectId?: string; // Add optional projectId that might be present in the image metadata
  [key: string]: any; // Allow indexed access for dynamic properties
}
  
  interface DetailsModalProps {
    visible: boolean;
    onClose: () => void;
    image?: ExtendedImageMeta;
    onSave: (updatedImage: ExtendedImageMeta) => Promise<void>;
    projectId?: string; // Make projectId optional in props
  }

// ScrollHintIndicator Component
const ScrollHintIndicator: React.FC = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.7 }}
    className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none flex flex-col justify-end items-center pb-2"
  >
    <div className="text-xs text-muted-foreground mb-1">Scroll for more</div>
    <ChevronDownIcon className="h-5 w-5 animate-bounce opacity-70" />
  </motion.div>
);
  
  const DetailsModal: React.FC<DetailsModalProps> = ({
    visible,
    onClose,
    image,
    onSave,
    projectId,
  }) => {
  const { user } = useAuth();
  const { createSnack } = useSnack();
  
    // Refs
    const formRef = useRef<HTMLFormElement>(null);
  const firstColumnRef = useRef<HTMLDivElement>(null);
  const uploadTaskRef = useRef<any>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const attachmentInputLocalRef = useRef<HTMLInputElement>(null);
    const commentsContainerRef = useRef<HTMLDivElement>(null);
  
    // State
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
    const [descText, setDescText] = useState(image?.description || "");
    const [captionText, setCaptionText] = useState(image?.caption || "");
    const [descExpanded, setDescExpanded] = useState(false);
    const [captionExpanded, setCaptionExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>(image?.comments || []);
    const [newComment, setNewComment] = useState("");
    const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>(image?.attachments || []);
  const [editContentType, setEditContentType] = useState(image?.contentType || "Photo");
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);
  const [localApprovalState, setLocalApprovalState] = useState<boolean | null>(null);
  
    useEffect(() => {
    if (visible && image) {
      // Ensure the image has an ID property - if not, try to derive one
      if (!image.id && Object.keys(image).some(key => key.startsWith('img_') || key.includes('_id'))) {
        // Look for a property that might be an ID
        const possibleIdKey = Object.keys(image).find(key => 
          key.startsWith('img_') || key.includes('_id')
        );
        
        if (possibleIdKey) {
          console.log(`Found possible ID key: ${possibleIdKey} with value: ${image[possibleIdKey]}`);
          
          // Create a new image object with the ID
          const imageWithId = {
            ...image,
            id: image[possibleIdKey]
          };
          
          // Update local state
          if (onSave) {
            console.log("Updating image with derived ID");
            onSave(imageWithId).catch(error => {
              console.error("Error updating image with derived ID:", error);
            });
          }
        }
      }
      
      setDescText(image.description || "");
      setCaptionText(image.caption || "");
      setComments(image.comments || []);
      setAttachments(image.attachments || []);
      setEditContentType(image.contentType || "Photo");
      setLocalApprovalState(image.label === "Approved");
      setEditing(false);
    }
  }, [visible, image, onSave]);

  // Scroll management effect
    useEffect(() => {
      const checkOverflow = () => {
        const container = firstColumnRef.current;
        if (container) {
          const hasOverflow = container.scrollHeight > container.clientHeight;
          setShowScrollIndicator(hasOverflow);
        }
      };
  
      checkOverflow();
      const observer = new ResizeObserver(checkOverflow);
      if (firstColumnRef.current) {
        observer.observe(firstColumnRef.current);
      }
    
      return () => {
        observer.disconnect();
    };
  }, []);

  // Toggle edit mode
  const onToggleEdit = (value: boolean) => {
    // If exiting edit mode and there are unsaved changes, show confirmation
    if (editing && !value && 
        (descText !== (image?.description || "") || 
         captionText !== (image?.caption || "") ||
         editContentType !== (image?.contentType || "Photo"))) {
      setShowUnsavedChangesModal(true);
      return;
    }
    
    setEditing(value);
    if (!value) {
      // Reset form when canceling edit
      setDescText(image?.description || "");
      setCaptionText(image?.caption || "");
      setEditContentType(image?.contentType || "Photo");
    }
  };

  // Description and caption change handlers
  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescText(e.target.value);
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCaptionText(e.target.value);
  };

  // Process attachment files for edit mode
  const processAttachmentFilesForEdit = async (
    files: File[],
    setAttachmentFn: (files: Attachment[]) => void
  ) => {
    if (!files.length) return;
    
      const storage = getStorage();
    const currentAttachments = [...attachments];
    
    for (const file of files) {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const storagePath = `attachments/${fileName}`;
      const fileRef = ref(storage, storagePath);
      
      try {
      const uploadTask = uploadBytesResumable(fileRef, file);
        await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
            () => {},
          (error) => reject(error),
            () => resolve()
        );
      });
        
        const downloadURL = await getDownloadURL(fileRef);
        currentAttachments.push({
          url: downloadURL,
          name: file.name,
        });
        } catch (error) {
        console.error("Error uploading attachment:", error);
      }
    }
    
    setAttachmentFn(currentAttachments);
  };

  // Form submission handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Check if a carousel save action button triggered this
    // Look for any element with carousel-save-action class in the event path
    const target = e.target as HTMLElement;
    let isFromButton = false;
    
    // Check if the event comes from a carousel-save-action button
    if ((e as any).nativeEvent?.submitter?.classList?.contains('carousel-save-action')) {
      isFromButton = true;
    }
    
    // Don't proceed with form submission if it's a carousel save action
    if (isFromButton) {
      console.log("Carousel save action detected - preventing form submission");
        return;
      }
    
    if (!image || !formRef.current) return;
    
    const formData = new FormData(formRef.current);
    const title = formData.get("title") as string;
    const label = formData.get("label") as string;
    const contentType = formData.get("contentType") as string;
    // Get videoEmbed input value - this is crucial for saving the embed URL
    const videoEmbed = formData.get("videoEmbed") as string;
    
    setIsSaving(true);
    
    try {
      const updatedImage: ExtendedImageMeta = {
        ...image,
        title,
        description: descText,
        label,
        contentType,
        caption: captionText,
        attachments: attachments,
        // Include the videoEmbed in the updated image data
        videoEmbed: contentType.toLowerCase() === "video" || contentType.toLowerCase() === "reel" 
          ? videoEmbed 
          : image.videoEmbed,
      };
      
      await onSave(updatedImage);
      setEditing(false);
    } catch (error: unknown) {
      console.error("Error saving changes:", error);
      alert(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setIsSaving(false);
      }
  };
  
  // Comment posting handler
    const handlePostComment = useCallback(async () => {
    if (!user || !image || !newComment.trim() || isPostingComment) return;
    
      setIsPostingComment(true);
    setCommentError("");
    
    const commentId = `comment_${Date.now()}`;
    const timestamp = new Date();
    const previousComments = [...comments];
    
    const newCommentObj: Comment = {
      id: commentId,
      userPhoto: user.photoURL || `/default-avatar.png`,
        userName: user.displayName || user.email || "Anonymous User",
      text: newComment.trim(),
        likes: [],
        userId: user.uid,
      timestamp,
      };
    
    setComments([...comments, newCommentObj]);
        setNewComment("");
    
      try {
        const updatedImage: ExtendedImageMeta = {
          ...image,
        comments: [...comments, newCommentObj],
        };
      
        await onSave(updatedImage);
      
      // Scroll to bottom of comments after a short delay
      setTimeout(() => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
        }
      }, 100);
      } catch (error) {
        console.error("Error posting comment:", error);
        setComments(previousComments);
        setCommentError("Failed to post comment. Please try again.");
      } finally {
        setIsPostingComment(false);
      }
    }, [newComment, image, user, comments, onSave, isPostingComment]);
  
  // Download thumbnail handler
    const handleThumbnailDownload = useCallback(async () => {
      if (!image?.url) return;
    
      setIsDownloading(true);
    
    try {
      const downloadLink = document.createElement('a');
      downloadLink.href = image.url;
      downloadLink.download = image.title || 'image';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (error) {
      console.error('Error downloading image:', error);
      } finally {
        setIsDownloading(false);
      }
    }, [image]);
  
  // Comment like toggle handler
    const toggleLike = useCallback(async (commentId: string) => {
      if (!user) {
        alert("You must be logged in to like comments.");
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
                  { uid: user.uid, displayName: user.displayName || user.email || "Anonymous User" },
                ];
          return { ...comment, likes: newLikes };
        }
        return comment;
      });
    
      setComments(updatedComments);
    
      try {
        if (image) {
          const updatedImage: ExtendedImageMeta = { ...image, comments: updatedComments };
          await onSave(updatedImage);
        }
      } catch (error) {
        console.error("Error toggling like:", error);
        setComments(previousComments);
      }
    }, [comments, user, image, onSave]);
  
  // Comment delete handler with confirmation
    const deleteComment = useCallback(async (commentId: string) => {
    setCommentToDelete(commentId);
  }, []);
  
  const confirmDeleteComment = useCallback(async () => {
    if (!commentToDelete) return;
    
      const updatedComments = comments.filter(
      (comment) => comment.id !== commentToDelete
      );
    
      setComments(updatedComments);
    
      try {
        if (image) {
          const updatedImage: ExtendedImageMeta = { ...image, comments: updatedComments };
          await onSave(updatedImage);
        }
      } catch (error) {
        console.error("Error deleting comment:", error);
        setComments(comments);
    } finally {
      setCommentToDelete(null);
      }
  }, [commentToDelete, comments, image, onSave]);
  
  // Photo change handler
    const handlePhotoChange = useCallback(async (file: File) => {
      if (!file || !image) return;
    
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        alert("Please select a valid image file (JPEG, PNG, GIF, WebP)");
        return;
      }
    
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert("File size exceeds 5MB limit");
        return;
      }
    
      setIsUploadingPhoto(true);
      setUploadProgress(0);
    
      try {
        const storage = getStorage();
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
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
        const updatedImage: ExtendedImageMeta = { ...image, url: downloadURL };
        await onSave(updatedImage);
    } catch (error: unknown) {
        console.error("Error uploading photo:", error);
      if (error instanceof Error && 'code' in error && error.code === "storage/canceled") {
        // Upload was canceled
        } else {
        alert(`Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      } finally {
        setIsUploadingPhoto(false);
        setUploadProgress(0);
        uploadTaskRef.current = null;
      }
    }, [image, onSave]);
  
    const triggerPhotoUpload = useCallback(() => {
      photoInputRef.current?.click();
    }, []);
  
  // Handle carousel arrangement save
  const handleCarouselArrangementSave = async (arrangement: (CarouselPhoto | null)[]) => {
      if (!image) return;
    
    // Use setTimeout to break out of the current event cycle
    setTimeout(async () => {
      try {
        // Filter out null values for Firebase storage
        const validArrangement = arrangement
          .filter((item): item is CarouselPhoto => item !== null);
        
        // Update the image with the new arrangement
        await onSave({
          ...image,
          carouselArrangement: validArrangement,
        });
      } catch (error) {
        console.error("Error saving carousel arrangement:", error);
        alert("Failed to save carousel arrangement. Please try again.");
      }
    }, 0);
  };

  // Function to convert Google Drive view URL to direct download URL
  const getDirectDownloadLink = (url: string): string => {
    // Match both /view and /preview endings for Google Drive links
    const match = url.match(/\/file\/d\/([^\/]+)\/(view|preview)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
    return url;
    };
  
    // Compute current type for rendering
    const currentContentType = editing
      ? editContentType.toLowerCase()
      : (image?.contentType || "photo").toLowerCase();
  
  // Get badge style based on label
  const getLabelBadgeVariant = (label: string = '') => {
    switch(label) {
      case 'Approved': return 'success';
      case 'Needs Revision': return 'destructive';
      case 'Ready for Approval': return 'warning';
      case 'Scheduled': return 'default';
      default: return 'secondary';
    }
  };

  // Handle window close when editing
  const handleCloseWithCheck = () => {
    if (editing && 
        (descText !== (image?.description || "") || 
         captionText !== (image?.caption || "") ||
         editContentType !== (image?.contentType || "Photo"))) {
      setShowUnsavedChangesModal(true);
      return;
    }
    onClose();
  };

  // Confirm discarding changes
  const confirmDiscardChanges = () => {
    setShowUnsavedChangesModal(false);
    setEditing(false);
    setDescText(image?.description || "");
    setCaptionText(image?.caption || "");
    setEditContentType(image?.contentType || "Photo");
  };

  // Handle image quick approval status change
  const handleApprovalChange = async (approved: boolean) => {
    console.log("⚡ handleApprovalChange called with:", approved);
    if (!image) {
      console.error("Image missing");
      createSnack('Cannot update: image data missing', 'error');
      return;
    }
    
    console.log("Image object:", image);
    
    // Check for onSave callback first
    if (!onSave) {
      console.error("onSave callback is missing");
      createSnack('Cannot update: save function missing', 'error');
      return;
    }
    
    // Update local state immediately for responsive UI
    console.log("Setting localApprovalState to:", approved);
    setLocalApprovalState(approved);
    setIsApprovalLoading(true);
    
    try {
      // Create updated image with new status
      const newStatus = approved ? "Approved" : "Ready for Approval";
      console.log("Setting new status to:", newStatus);
      
      // Create a copy with the label updated
      const updatedImage = {
        ...image,
        label: newStatus
      };
      
      // Let the parent component handle the saving
      await onSave(updatedImage);
      console.log("Image status updated successfully");
      
      // Show success message
      createSnack(
        `Image ${approved ? 'approved' : 'set to Ready for Approval'}`, 
        'success'
      );
    } catch (error) {
      // Revert local state on error
      console.error("❌ Error updating approval status:", error);
      setLocalApprovalState(!approved);
      createSnack('Failed to update approval status', 'error');
    } finally {
      setIsApprovalLoading(false);
    }
  };

  // Use effect to log approval state changes
  useEffect(() => {
    if (visible && image) {
      console.log("Image loaded in modal:", {
        id: image.id,
        label: image.label,
        isApproved: image.label === "Approved",
        localApprovalState
      });
    }
  }, [visible, image, localApprovalState]);

  // Debug effect to log image properties
  useEffect(() => {
    if (image) {
      console.log("Image object:", {
        id: image.id,
        hasProjectId: 'projectId' in image,
        properties: Object.keys(image)
      });
    }
  }, [image]);

  // If not visible, render nothing
  if (!visible) return null;
  
    return (
    <Dialog open={visible} onOpenChange={(open) => !open && handleCloseWithCheck()}>
      <DialogContent className="max-w-[98vw] max-h-[90vh] w-[1600px] p-0 overflow-hidden">
        <style jsx>{`
          /* Force override any table display in first column */
          :global([data-radix-scroll-area-viewport]) {
            display: block !important;
            min-width: auto !important;
            width: 100% !important;
          }
          
          /* Hide the default close button */
          :global(.DialogContent button[data-state]) {
            display: none !important;
          }
          
          :global(.DialogContent > button) {
            display: none !important;
          }
          
          :global([role="dialog"] > button) {
            display: none !important;
          }
        `}</style>
        
        {/* Unsaved Changes Confirmation */}
        <ConfirmationModal
          isOpen={showUnsavedChangesModal}
          onClose={() => setShowUnsavedChangesModal(false)}
          onConfirm={confirmDiscardChanges}
          title="Unsaved Changes"
          description="You have unsaved changes. Are you sure you want to discard your changes?"
          confirmText="Discard Changes"
          cancelText="Keep Editing"
          type="warning"
        />
        
        {/* Delete Comment Confirmation */}
        <ConfirmationModal
          isOpen={!!commentToDelete}
          onClose={() => setCommentToDelete(null)}
          onConfirm={confirmDeleteComment}
          title="Delete Comment"
          description="Are you sure you want to delete this comment? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
        
        <DialogHeader className="px-6 py-3 border-b bg-muted/40">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-xl font-semibold">Image Details</DialogTitle>
              {!editing && image && (
                <div onClick={(e) => {
                  // Ensure click events on the switch don't propagate to parent elements
                  e.stopPropagation();
                }} className="z-10">
                  <ApproveSwitch 
                    isApproved={localApprovalState !== null ? localApprovalState : image.label === "Approved"}
                    onChange={(value) => {
                      console.log("ApproveSwitch onChange called with:", value);
                      handleApprovalChange(value);
                    }}
                    loading={isApprovalLoading}
                    disabled={isSaving}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {editing ? (
                <>
                  <Button
                    type="submit"
                    form="detailsForm"
                    variant="default"
                    size="sm"
                    className="rounded-full w-9 h-9 p-0 bg-green-600 hover:bg-green-700 text-white"
                    disabled={isSaving}
                  >
                    <CheckIcon className="h-4 w-4" />
                    <span className="sr-only">Save</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full w-9 h-9 p-0 border-muted-foreground/30"
                    onClick={() => onToggleEdit(false)}
                    disabled={isSaving}
                  >
                    <XMarkIcon className="h-4 w-4" />
                    <span className="sr-only">Cancel</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full w-9 h-9 p-0 border-muted-foreground/30"
                    onClick={() => onToggleEdit(true)}
                    disabled={isApprovalLoading || isSaving}
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <button
                    className="rounded-full w-9 h-9 inline-flex items-center justify-center border border-muted-foreground/30 hover:bg-accent hover:text-accent-foreground carousel-close-action"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={editing ? "editing" : "viewing"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
          {editing ? (
              <form id="detailsForm" ref={formRef} onSubmit={handleSubmit} className="flex flex-1 overflow-hidden h-[calc(90vh-100px)]">
                <div className="grid grid-cols-3 h-full divide-x">
                  {/* Left Column - Details */}
                  <div className="h-full overflow-hidden">
                    <RenderFirstColumn
                      image={image}
                      editing={editing}
                      descText={descText}
                      setDescText={setDescText}
                      captionText={captionText}
                      setCaptionText={setCaptionText}
                      descExpanded={descExpanded}
                      setDescExpanded={setDescExpanded}
                      captionExpanded={captionExpanded}
                      setCaptionExpanded={setCaptionExpanded}
                      comments={comments}
                      setComments={setComments}
                      newComment={newComment}
                      setNewComment={setNewComment}
                      handlePostComment={handlePostComment}
                      toggleLike={toggleLike}
                      deleteComment={deleteComment}
                      attachments={attachments}
                      setAttachments={setAttachments}
                      editContentType={editContentType}
                      setEditContentType={setEditContentType}
                      attachmentInputLocalRef={attachmentInputLocalRef}
                      processAttachmentFilesForEdit={processAttachmentFilesForEdit}
                      commentsContainerRef={commentsContainerRef}
                      firstColumnRef={firstColumnRef}
                      showScrollIndicator={showScrollIndicator}
                      user={user}
                    />
                  </div>

                  {/* Middle Column - Content Preview */}
                  <div className="h-full overflow-hidden bg-muted/5 border-r border-border/50">
                    <div className="p-4 h-full">
                      <Card className="h-full border-none overflow-hidden shadow-sm">
                        <CardHeader className="py-3 bg-muted/40 border-b">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center">
                              <ViewColumnsIcon className="h-5 w-5 mr-2 text-primary" />
                              Content Preview
                              <span className="ml-2 font-normal text-muted-foreground">|</span>
                              <span className="ml-2 capitalize flex items-center">
                                {currentContentType === 'photo' && <PhotoIcon className="h-4 w-4 text-blue-500 mr-1" />}
                                {currentContentType === 'video' && <VideoCameraIcon className="h-4 w-4 text-purple-500 mr-1" />}
                                {currentContentType === 'reel' && <VideoCameraIcon className="h-4 w-4 text-pink-500 mr-1" />}
                                {currentContentType === 'carousel' && <ViewColumnsIcon className="h-4 w-4 text-orange-500 mr-1" />}
                                {currentContentType}
                              </span>
                            </CardTitle>
                            
                            {/* Download button for videos/reels */}
                            {(currentContentType === 'video' || currentContentType === 'reel') && image?.videoEmbed && !editing && (
                              <a
                                href={
                                  image.videoEmbed.includes("drive.google.com")
                                    ? getDirectDownloadLink(image.videoEmbed)
                                    : image.videoEmbed
                                }
                                download=""
                                target="_self"
                                className="rounded-lg bg-gray-700 px-2 py-1 text-xs text-white hover:opacity-90 transition-opacity select-none flex justify-between items-center"
                              >
                                <span>Download</span>
                                <ArrowDownTrayIcon className="h-3 w-3 ml-2" />
                              </a>
                            )}
                </div>
                        </CardHeader>
                        <CardContent className="p-0 h-[calc(100%-48px)] flex items-center justify-center bg-background/60">
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="w-full h-full flex items-center justify-center overflow-auto p-5"
                          >
                            <div className="w-full h-full">
                <RenderSecondColumn
                  currentType={currentContentType}
                  image={image}
                  projectId=""
                  editing={editing}
                  onCarouselArrangementSave={handleCarouselArrangementSave}
                />
                            </div>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Right Column - Thumbnail */}
                  <div className="h-full overflow-hidden bg-muted/10">
                    <div className="p-4 h-full">
                      <Card className="h-full border-none overflow-hidden shadow-sm">
                        <CardHeader className="py-3 bg-muted/40 border-b">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center">
                              <PhotoIcon className="h-5 w-5 mr-2 text-primary" />
                              {editing ? "Change Thumbnail" : "Thumbnail"}
                            </CardTitle>
                            {image?.url && !editing && (
                              <button
                                onClick={handleThumbnailDownload}
                                className="rounded-lg bg-gray-700 px-2 py-1 text-xs text-white hover:opacity-90 transition-opacity select-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 focus:outline-none flex justify-between items-center"
                                disabled={isDownloading}
                                aria-busy={isDownloading}
                                aria-label={isDownloading ? "Downloading image..." : "Download image"}
                              >
                                {isDownloading ? "Downloading..." : <span>Download</span>}
                                <ArrowDownTrayIcon className="h-3 w-3 ml-2" />
                              </button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 h-[calc(100%-48px)]">
                <RenderThirdColumn
                  image={image}
                  editing={editing}
                  isUploadingPhoto={isUploadingPhoto}
                  triggerPhotoUpload={triggerPhotoUpload}
                  isDownloading={isDownloading}
                  handleThumbnailDownload={handleThumbnailDownload}
                />
                        </CardContent>
                      </Card>
              </div>
                  </div>
                  </div>

                <input
                  type="file"
                  ref={photoInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handlePhotoChange(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  accept="image/*"
                />
              </form>
            ) : (
              <div className="grid grid-cols-3 h-[calc(90vh-100px)] overflow-hidden divide-x">
                {/* Left Column - Details */}
                <div className="h-full overflow-hidden">
                  <RenderFirstColumn
                    image={image}
                    editing={editing}
                    descText={descText}
                    setDescText={setDescText}
                    captionText={captionText}
                    setCaptionText={setCaptionText}
                    descExpanded={descExpanded}
                    setDescExpanded={setDescExpanded}
                    captionExpanded={captionExpanded}
                    setCaptionExpanded={setCaptionExpanded}
                  comments={comments}
                    setComments={setComments}
                  newComment={newComment}
                  setNewComment={setNewComment}
                  handlePostComment={handlePostComment}
                  toggleLike={toggleLike}
                  deleteComment={deleteComment}
                    attachments={attachments}
                    setAttachments={setAttachments}
                    editContentType={editContentType}
                    setEditContentType={setEditContentType}
                    attachmentInputLocalRef={attachmentInputLocalRef}
                    processAttachmentFilesForEdit={processAttachmentFilesForEdit}
                  commentsContainerRef={commentsContainerRef}
                    firstColumnRef={firstColumnRef}
                    showScrollIndicator={showScrollIndicator}
                    user={user}
                />
              </div>

                {/* Middle Column - Content Preview */}
                <div className="h-full overflow-hidden bg-muted/5 border-r border-border/50">
                  <div className="p-4 h-full">
                    <Card className="h-full border-none overflow-hidden shadow-sm">
                      <CardHeader className="py-3 bg-muted/40 border-b">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center">
                            <ViewColumnsIcon className="h-5 w-5 mr-2 text-primary" />
                            Content Preview
                            <span className="ml-2 font-normal text-muted-foreground">|</span>
                            <span className="ml-2 capitalize flex items-center">
                              {currentContentType === 'photo' && <PhotoIcon className="h-4 w-4 text-blue-500 mr-1" />}
                              {currentContentType === 'video' && <VideoCameraIcon className="h-4 w-4 text-purple-500 mr-1" />}
                              {currentContentType === 'reel' && <VideoCameraIcon className="h-4 w-4 text-pink-500 mr-1" />}
                              {currentContentType === 'carousel' && <ViewColumnsIcon className="h-4 w-4 text-orange-500 mr-1" />}
                              {currentContentType}
                            </span>
                          </CardTitle>
                          
                          {/* Download button for videos/reels */}
                          {(currentContentType === 'video' || currentContentType === 'reel') && image?.videoEmbed && !editing && (
                            <a
                              href={
                                image.videoEmbed.includes("drive.google.com")
                                  ? getDirectDownloadLink(image.videoEmbed)
                                  : image.videoEmbed
                              }
                              download=""
                              target="_self"
                              className="rounded-lg bg-gray-700 px-2 py-1 text-xs text-white hover:opacity-90 transition-opacity select-none flex justify-between items-center"
                            >
                              <span>Download</span>
                              <ArrowDownTrayIcon className="h-3 w-3 ml-2" />
                            </a>
                          )}
              </div>
                      </CardHeader>
                      <CardContent className="p-0 h-[calc(100%-48px)] flex items-center justify-center bg-background/60">
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="w-full h-full flex items-center justify-center overflow-auto p-5"
                        >
                          <div className="w-full h-full">
                <RenderSecondColumn
                  currentType={currentContentType}
                  image={image}
                  projectId=""
                  editing={editing}
                  onCarouselArrangementSave={handleCarouselArrangementSave}
                />
                          </div>
                        </motion.div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Right Column - Thumbnail */}
                <div className="h-full overflow-hidden bg-muted/10">
                  <div className="p-4 h-full">
                    <Card className="h-full border-none overflow-hidden shadow-sm">
                      <CardHeader className="py-3 bg-muted/40 border-b">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center">
                            <PhotoIcon className="h-5 w-5 mr-2 text-primary" />
                            {editing ? "Change Thumbnail" : "Thumbnail"}
                          </CardTitle>
                          {image?.url && !editing && (
                            <button
                              onClick={handleThumbnailDownload}
                              className="rounded-lg bg-gray-700 px-2 py-1 text-xs text-white hover:opacity-90 transition-opacity select-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 focus:outline-none flex justify-between items-center"
                              disabled={isDownloading}
                              aria-busy={isDownloading}
                              aria-label={isDownloading ? "Downloading image..." : "Download image"}
                            >
                              {isDownloading ? "Downloading..." : <span>Download</span>}
                              <ArrowDownTrayIcon className="h-3 w-3 ml-2" />
                            </button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 h-[calc(100%-48px)]">
                <RenderThirdColumn
                  image={image}
                  editing={editing}
                  isUploadingPhoto={isUploadingPhoto}
                  triggerPhotoUpload={triggerPhotoUpload}
                  isDownloading={isDownloading}
                  handleThumbnailDownload={handleThumbnailDownload}
                />
                      </CardContent>
                    </Card>
                  </div>
              </div>
            </div>
          )}
          </motion.div>
        </AnimatePresence>
        
        {isDownloading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50"
          >
            <HashLoader color="white" loading={isDownloading} size={150} />
          </motion.div>
        )}

          <input
            type="file"
            ref={photoInputRef}
            onChange={(e) => {
            if (e.target.files?.[0]) {
                handlePhotoChange(e.target.files[0]);
              }
            }}
          className="hidden"
          accept="image/*"
          />
      </DialogContent>
    </Dialog>
    );
  };
  
  export default DetailsModal;
  
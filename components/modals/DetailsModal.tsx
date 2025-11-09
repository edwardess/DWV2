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
  ClipboardIcon,
  PlusIcon,
  } from "@heroicons/react/24/outline";
  import HashLoader from "react-spinners/HashLoader";
  import { useAuth } from "@/components/services/AuthProvider";
  import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
  import debounce from "lodash-es/debounce";
  import ApproveSwitch from "@/components/common/feedback/ApproveSwitch";
  import { 
    doc, 
    updateDoc, 
    getDoc, 
    setDoc, 
    serverTimestamp,
    collection,
    query,
    getDocs,
    orderBy,
    addDoc
  } from "firebase/firestore";
  import { db } from "@/components/services/firebaseService";
  import { useSnack } from "@/components/common/feedback/Snackbar";
  import { SocialMediaInstance, socialMediaConfig } from "@/components/ui/social-media-switch";
  import { runTransaction } from "firebase/firestore";
  // Import JSZip and FileSaver directly
  import JSZip from 'jszip';
  import FileSaver from 'file-saver';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  
  // Import ActivityLog component
  import ActivityLog, { Activity } from "./DetailsModalParts/ActivityLog";
  
  // Constants
  const DESCRIPTION_THRESHOLD = 1000;
  const CAPTION_THRESHOLD = 1000;
  const COMMENT_MAX_LENGTH = 5000;
  
  // Constants for month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  
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
  instance?: SocialMediaInstance; // Add optional instance to track which social media this belongs to
  activities?: Activity[] | any[]; // Allow both Activity[] and any[] for Firestore compatibility
  samples?: Array<{ url: string; type: 'image' | 'video' }>;
  [key: string]: any; // Allow indexed access for dynamic properties
}
  
  interface DetailsModalProps {
    visible: boolean;
    onClose: () => void;
    image?: ExtendedImageMeta;
    onSave: (updatedImage: ExtendedImageMeta) => Promise<void>;
    onDelete?: (imageId: string) => Promise<void>;
    projectId?: string;
    logActivity?: (message: string) => Promise<void>;
    onEditingChange?: (isEditing: boolean) => void;
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
  
  const DetailsModal = ({
    visible,
    onClose,
    image,
    onSave,
    onDelete,
    projectId,
    logActivity,
    onEditingChange,
  }: DetailsModalProps): JSX.Element | null => {
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
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentInstance, setCurrentInstance] = useState<SocialMediaInstance>("instagram"); // Default to instagram
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingCopyInstance, setLoadingCopyInstance] = useState<SocialMediaInstance | null>(null);
  const [successCopyInstance, setSuccessCopyInstance] = useState<SocialMediaInstance | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [samplesUploadProgress, setSamplesUploadProgress] = useState<{ [key: string]: number }>({});
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);
  const [localSamples, setLocalSamples] = useState<Array<{ url: string; type: 'image' | 'video' }>>(image?.samples || []);
  const [editLabel, setEditLabel] = useState(image?.label || "");
  const prevVisibleRef = useRef(false);
  
    useEffect(() => {
    const isOpening = visible && !prevVisibleRef.current;
    prevVisibleRef.current = visible;
    
    if (isOpening && image) {
      // Only reset when modal is first opened
      console.log('*** DETAILS MODAL OPENING ***');
      console.log('image:', image);
      console.log('projectId:', projectId);
      console.log('instance:', image.instance);
      
      // Initialize form fields from image data
      setDescText(image.description || "");
      setCaptionText(image.caption || "");
      setComments(image.comments || []);
      setAttachments(image.attachments || []);
      setEditContentType(image.contentType || "Photo");
      setLocalApprovalState(image.label === "Approved");
      setLocalSamples(image.samples || []);
      setEditLabel(image.label || "");
      
      // Load activities from separate Firestore collection
      fetchActivities(image.id);
      
      setEditing(false);
    }
  }, [visible, image, projectId]);

  useEffect(() => {
    // Extract the current instance from the image's data if available
    // This is assuming the instance information is passed along with the image
    const instance = image?.instance as SocialMediaInstance;
    if (instance && Object.keys(socialMediaConfig).includes(instance)) {
      setCurrentInstance(instance);
    }
  }, [image]);

  // Notify parent when editing state changes
  useEffect(() => {
    onEditingChange?.(editing);
  }, [editing, onEditingChange]);

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
    const newValue = e.target.value;
    setDescText(newValue);
    if (image?.description !== undefined && newValue !== image.description) {
      logActivityLocally('updated the description');
    }
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setCaptionText(newValue);
    if (image?.caption !== undefined && newValue !== image.caption) {
      logActivityLocally('updated the caption');
    }
  };

  // Process attachment files for edit mode
  const processAttachmentFilesForEdit = async (
    files: File[],
    setAttachmentFn: (files: Attachment[]) => void
  ) => {
    if (!files.length) return;
    
    const storage = getStorage();
    const currentAttachments = [...attachments];
    const maxRetries = 2;
    
    for (const file of files) {
      // Validate file size and type before uploading
      const maxSize = 15 * 1024 * 1024; // 15MB limit
      if (file.size > maxSize) {
        createSnack(`File ${file.name} exceeds 15MB limit`, "error");
        continue;
      }
      
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const storagePath = `attachments/${fileName}`;
      const fileRef = ref(storage, storagePath);
      
      try {
        let retryCount = 0;
        let success = false;
        
        while (retryCount <= maxRetries && !success) {
          try {
            const uploadTask = uploadBytesResumable(fileRef, file);
            await new Promise<void>((resolve, reject) => {
              uploadTask.on(
                "state_changed",
                (snapshot) => {
                  // Add progress tracking if needed
                  const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                  console.log(`Upload progress for ${file.name}: ${progress}%`);
                },
                (error) => reject(error),
                () => resolve()
              );
            });
            
            const downloadURL = await getDownloadURL(fileRef);
            currentAttachments.push({
              url: downloadURL,
              name: file.name,
            });
            
            success = true;
          } catch (error) {
            retryCount++;
            console.error(`Error uploading attachment (attempt ${retryCount}/${maxRetries}):`, error);
            
            if (retryCount <= maxRetries) {
              // Exponential backoff before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
              console.log(`Retrying upload for ${file.name}...`);
            } else {
              throw error; // Rethrow after all retries
            }
          }
        }
      } catch (error) {
        console.error("Error uploading attachment:", error);
        createSnack(`Failed to upload ${file.name}`, "error");
      }
    }
    
    setAttachmentFn(currentAttachments);
  };

  // Form submission handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Skip if submitter is a button (not submit button)
    const submitter = (e as any).nativeEvent?.submitter;
    if (submitter && submitter.type === "button") {
      return;
    }
    
    // Skip carousel save actions
    if (submitter?.classList?.contains('carousel-save-action')) {
      return;
    }
    
    if (!image || !formRef.current || !user) return;
    
    const formData = new FormData(formRef.current);
    const title = formData.get("title") as string;
    const label = formData.get("label") as string;
    const contentType = formData.get("contentType") as string;
    const videoEmbed = formData.get("videoEmbed") as string;
    const script = formData.get("script") as string | null;
    
    setIsSaving(true);
    
    try {
      // Validate title
      if (!title.trim()) {
        createSnack("Title is required", "error");
        setIsSaving(false);
        return;
      }
      
      // Create activity for edit save
      const activityId = `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newActivity = {
        id: activityId,
        userId: user.uid,
        userName: user.displayName || "Unknown User",
        userPhoto: user.photoURL || undefined,
        action: "saved changes to content",
        timestamp: new Date(),
      };
      
      // Update activities state optimistically
      const updatedActivities = [newActivity, ...activities];
      setActivities(updatedActivities);
      
      // Save the activity to the activities collection
      const activityDocRef = doc(db, "images", image.id, "activities", activityId);
      
      // Format activity for Firestore
      const firestoreActivity = {
        ...newActivity,
        imageId: image.id,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      
      // Save activity
      await setDoc(activityDocRef, firestoreActivity);
      
      // Create complete updated image (without activities)
      const updatedImage = {
        ...image,
        title,
        description: descText,
        label,
        contentType,
        caption: captionText,
        attachments,
        videoEmbed: contentType.toLowerCase() === "video" || contentType.toLowerCase() === "reel" 
          ? videoEmbed 
          : image.videoEmbed,
        lastUpdated: new Date(),
        script: script !== null ? script : image.script,
        samples: localSamples,
      };
      
      // Save to database via parent component's onSave handler
      await onSave(updatedImage);
      setEditing(false);
      createSnack("Changes saved successfully", "success");
    } catch (error) {
      console.error("Error saving changes:", error);
      createSnack("An error occurred while saving", "error");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Comment posting handler
  const handlePostComment = useCallback(async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!user || !image || !newComment.trim() || isPostingComment) return;
    
    setIsPostingComment(true);
    setCommentError("");
    
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date();
    const newCommentObj = {
      id: commentId,
      userPhoto: user.photoURL || `/default-avatar.png`,
      userName: user.displayName || user.email || "Anonymous User",
      text: newComment.trim(),
      likes: [],
      userId: user.uid,
      timestamp,
    };
    
    // Create new activity with a format compatible with Firestore
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
    
    // Update comments and activities state optimistically
    const updatedComments = [...comments, newCommentObj];
    const updatedActivities = [newActivity, ...activities];
    
    setComments(updatedComments);
    setActivities(updatedActivities);
    setNewComment("");
    
    try {
      if (!image.id) {
        throw new Error("Cannot save comment: missing image ID");
      }
      
      // Save the activity to the activities collection
      const activityDocRef = doc(db, "images", image.id, "activities", activityId);
      
      // Format activity for Firestore
      const firestoreActivity = {
        ...newActivity,
        imageId: image.id,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      
      // Save activity
      await setDoc(activityDocRef, firestoreActivity);
      
      // Create complete updated image with just the comments (no activities)
      const updatedImage = {
        ...image,
        comments: updatedComments
      };
      
      // Save to database through the main onSave handler
      await onSave(updatedImage);
      
      // Scroll to bottom of comments
      setTimeout(() => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
        }
      }, 100);
    } catch (error) {
      // Error handling with state reversion
      console.error("Error posting comment:", error);
      setComments(comments);
      setActivities(activities);
      setCommentError("Failed to post comment. Please try again.");
      createSnack("Failed to post comment", "error");
    } finally {
      setIsPostingComment(false);
    }
  }, [newComment, image, user, comments, activities, onSave, isPostingComment, createSnack]);
  
  // Download thumbnail handler
    const handleThumbnailDownload = useCallback(async () => {
      if (!image?.url) return;
    
      setIsDownloading(true);
    
    try {
      // Extract the filename from the URL or use the image title with appropriate extension
      const urlParts = image.url.split('/');
      const filename = image.title 
        ? `${image.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg` 
        : urlParts[urlParts.length - 1] || 'image.jpg';
      
      // Create an anchor element for the download
      const downloadLink = document.createElement('a');
      downloadLink.href = image.url;
      downloadLink.setAttribute('download', filename);
      downloadLink.setAttribute('target', '_blank');
      downloadLink.setAttribute('rel', 'noopener noreferrer');
      
      // For direct download, we need to fetch the image as a blob
      // This ensures the browser triggers a download instead of navigation
      fetch(image.url)
        .then(response => response.blob())
        .then(blob => {
          // Create a blob URL and set it as the href
          const blobUrl = URL.createObjectURL(blob);
          downloadLink.href = blobUrl;
          
          // Simulate a click to trigger the download
          document.body.appendChild(downloadLink);
          downloadLink.click();
          
          // Clean up
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(blobUrl);
          setIsDownloading(false);
        })
        .catch(error => {
          console.error('Error fetching image for download:', error);
          // Fallback to direct link if fetch fails
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          setIsDownloading(false);
        });
    } catch (error) {
      console.error('Error downloading image:', error);
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
    
      // Enhanced file validation
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        createSnack("Please select a valid image file (JPEG, PNG, GIF, WebP)", "error");
        return;
      }
    
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        createSnack("File size exceeds 5MB limit", "error");
        return;
      }
    
      setIsUploadingPhoto(true);
      setUploadProgress(0);
    
      // Maximum retries for network errors
      const maxRetries = 3;
      let retryCount = 0;
      let success = false;
      
      while (retryCount <= maxRetries && !success) {
        try {
          const storage = getStorage();
          // Generate a more unique filename with random component
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
          
          const updatedImage: ExtendedImageMeta = { 
            ...image, 
            url: downloadURL,
            lastUpdated: new Date() // Add timestamp for tracking
          };
          
          await onSave(updatedImage);
          success = true;
          createSnack("Image uploaded successfully", "success");
        } catch (error: unknown) {
          retryCount++;
          console.error(`Error uploading photo (attempt ${retryCount}/${maxRetries}):`, error);
          
          if (error instanceof Error && 'code' in error && error.code === "storage/canceled") {
            // Upload was canceled, no need for retry
            success = true;
          } else if (retryCount <= maxRetries) {
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
            console.log(`Retrying photo upload...`);
          } else {
            createSnack(`Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
          }
        }
      }
      
      setIsUploadingPhoto(false);
      setUploadProgress(0);
      uploadTaskRef.current = null;
    }, [image, onSave, createSnack]);
  
    const triggerPhotoUpload = useCallback(() => {
      photoInputRef.current?.click();
    }, []);
  
  // Handle samples upload for Draft cards
  const handleSamplesUpload = useCallback(async (files: File[]) => {
    if (!image || !projectId) return;

    const storage = getStorage();
    const startIndex = localSamples.length;
    
    // Create placeholder entries for uploading files
    const placeholders = Array.from(files).map((file, i) => ({
      url: '', // Empty URL indicates uploading
      type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
    }));
    
    // Add placeholders to show upload progress immediately
    setLocalSamples(prev => [...prev, ...placeholders]);
    
    // Initialize progress for all files
    const initialProgress: { [key: string]: number } = {};
    files.forEach((_, i) => {
      initialProgress[`sample-${startIndex + i}`] = 0;
    });
    setSamplesUploadProgress(initialProgress);
    
    const newSamples: Array<{ url: string; type: 'image' | 'video' }> = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = file.type.startsWith('video/') ? 'video' : 'image';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const fileRef = ref(storage, `projects/${projectId}/samples/${image.id}/${fileName}`);
        const uploadTask = uploadBytesResumable(fileRef, file);
        
        const uploadKey = `sample-${startIndex + i}`;
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = Math.round(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              );
              setSamplesUploadProgress(prev => ({ ...prev, [uploadKey]: progress }));
            },
            (error) => {
              console.error("Sample upload error:", error);
              reject(error);
            },
            () => resolve()
          );
        });
        
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        newSamples.push({ url: downloadURL, type: fileType });
        
        // Clear progress for this file
        setSamplesUploadProgress(prev => {
          const updated = { ...prev };
          delete updated[uploadKey];
          return updated;
        });
      }
      
      // Replace placeholders with actual uploaded samples
      setLocalSamples(prev => {
        const withoutPlaceholders = prev.slice(0, startIndex);
        return [...withoutPlaceholders, ...newSamples];
      });
      
      createSnack(`${newSamples.length} file(s) uploaded successfully`, "success");
    } catch (error) {
      console.error("Error uploading samples:", error);
      
      // Remove placeholders on error
      setLocalSamples(prev => prev.slice(0, startIndex));
      setSamplesUploadProgress({});
      
      createSnack("Failed to upload files. Please try again.", "error");
    }
  }, [image, projectId, localSamples.length, createSnack]);

  // Handle sample delete for Draft cards
  const handleSampleDelete = useCallback((index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!localSamples) return;
    
    try {
      // Update local state only - don't save until user clicks submit
      setLocalSamples(prev => prev.filter((_, i) => i !== index));
      createSnack("File deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting sample:", error);
      createSnack("Failed to delete file. Please try again.", "error");
    }
  }, [localSamples, createSnack]);
  
  // Handle carousel arrangement save
  const handleCarouselArrangementSave = async (arrangement: (CarouselPhoto | null)[]): Promise<void> => {
    // Skip if no image or arrangement is provided
    if (!image || !arrangement) {
      createSnack("Cannot save carousel arrangement: missing data", "error");
      return;
    }
    
    // Filter out null values from the arrangement
    const filteredArrangement = arrangement.filter(item => item !== null) as CarouselPhoto[];
    
    // Validate that arrangement has proper photo data
    if (!filteredArrangement.some(item => item.url && item.url.trim() !== '')) {
      createSnack("Cannot save: carousel must have at least one valid image", "error");
      return;
    }
    
    // Save original editing state to restore it later
    const originalEditingState = editing;
    
    // Set loading state
    setIsSaving(true);
    
    // Maximum retries if there's a network error
    const maxRetries = 2;
    let retryCount = 0;
    let success = false;
    
    while (retryCount <= maxRetries && !success) {
      try {
        // Make sure projectId is available
        if (!projectId || !image.id) {
          throw new Error("Missing project ID or image ID");
        }
        
        // Use a transaction for better data consistency
        await runTransaction(db, async (transaction) => {
          const projectDocRef = doc(db, "projects", projectId);
          const projectSnap = await transaction.get(projectDocRef);
          
          if (!projectSnap.exists()) {
            throw new Error("Project document does not exist");
          }
          
          // Determine instance name for storage
          const firestoreInstance = image.instance === 'facebook' ? 'fbig' : image.instance;
        
          // Create update path with proper nesting
          const updatePath = `imageMetadata.${firestoreInstance}.${image.id}.carouselArrangement`;
          
          // Create update object
          const updateData = {
            [updatePath]: filteredArrangement
          };
          
          // Update in Firestore via transaction
          transaction.set(projectDocRef, updateData, { merge: true });
        });
        
        // Mark as successful
        success = true;
        
        // Update local state to reflect the changes
        if (onSave && image.id) {
          // Create updated image object
          const updatedImage: ExtendedImageMeta = {
          ...image,
            carouselArrangement: filteredArrangement
          };
          
          // Call onSave to persist changes
          await onSave(updatedImage);
        }
        
        // Show success message
        createSnack("Carousel arrangement saved", "success");
        
        // If we were in edit mode, stay in edit mode
        setEditing(originalEditingState);
      } catch (error) {
        retryCount++;
        console.error(`Error saving carousel arrangement (attempt ${retryCount}/${maxRetries}):`, error);
        
        // Only show error to user if all retries have failed
        if (retryCount > maxRetries) {
          createSnack("Failed to save carousel arrangement", "error");
        } else {
          // Wait briefly before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
          console.log(`Retrying save operation (${retryCount}/${maxRetries})...`);
      }
      } finally {
        // Always reset loading state
        setIsSaving(false);
      }
    }
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
      case 'Draft': return 'secondary';
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
    if (!image || !user || isApprovalLoading) return;
    
    setIsApprovalLoading(true);
    setLocalApprovalState(approved);
    
    const oldActivities = [...activities];
    
    // Create new activity for approval change
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newActivity = {
      id: activityId,
      userId: user.uid,
      userName: user.displayName || "Unknown User",
      userPhoto: user.photoURL || undefined,
      action: approved ? "approved the content" : "marked content for revision",
      timestamp: new Date(),
    };
    
    // Update activities state optimistically
    const updatedActivities = [newActivity, ...activities];
    setActivities(updatedActivities);
    
    try {
      // Save the activity to the activities collection
      const activityDocRef = doc(db, "images", image.id, "activities", activityId);
      
      // Format activity for Firestore
      const firestoreActivity = {
        ...newActivity,
        imageId: image.id,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      
      // Save activity
      await setDoc(activityDocRef, firestoreActivity);
      
      // Create updated image with new approval state only (no activities)
      const updatedImage = {
        ...image,
        label: approved ? "Approved" : "Needs Revision"
      };
      
      // Save through the parent component's onSave handler
      await onSave(updatedImage);
      createSnack(approved ? "Content approved" : "Content marked for revision", "success");
    } catch (error) {
      console.error("Error updating approval status:", error);
      setLocalApprovalState(!approved);
      setActivities(oldActivities);
      createSnack("Failed to update approval status", "error");
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

  // Debug effect to log image properties including activities
  useEffect(() => {
    if (image) {
      console.log("Image object loaded:", {
        id: image.id,
        hasProjectId: 'projectId' in image,
        properties: Object.keys(image),
        activities: image.activities || [],
        activitiesCount: (image.activities || []).length
      });
    }
  }, [image]);

  // Add handler for delete confirmation
  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!image?.id || !onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(image.id);
      // Close the modal after successful deletion
      onClose();
      // Show success message
      createSnack('Content deleted successfully', 'success');
    } catch (error) {
      console.error("Error deleting content:", error);
      createSnack('Failed to delete content', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  // First, define the logActivityLocally function at the proper location
  const logActivityLocally = async (action: string, details?: string) => {
    if (!image?.id || !projectId) return;
    
    try {
      const activitiesCollection = collection(db, "projects", projectId, "activities", image.id, "logs");
      await addDoc(activitiesCollection, {
        action,
        details,
        userId: user?.uid,
        userName: user?.displayName || user?.email || 'Anonymous',
        timestamp: serverTimestamp(),
      });
      
      // Fetch the new activities list
      fetchActivities(image.id);

      // Also call the parent's logActivity function if it exists
      logActivity?.(`${user?.displayName || user?.email || 'Anonymous'} ${action}`);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Restore the handleCopyToInstance function with the instance property added
  const handleCopyToInstance = async (targetInstance: SocialMediaInstance): Promise<void> => {
    // Prevent multiple rapid copies
    if (loadingCopyInstance || successCopyInstance) {
      return;
    }
    
    if (!image || !projectId) {
      createSnack("Cannot copy: missing image data or project ID", "error");
      return;
    }
    
    // Set loading state for this specific instance
    setLoadingCopyInstance(targetInstance);
    
    // Maximum retries if there's a network error
    const maxRetries = 2;
    let retryCount = 0;
    let success = false;
    
    while (retryCount <= maxRetries && !success) {
      try {
        // Validate critical data before proceeding
        if (!image.url) {
          throw new Error("Cannot copy: missing image URL");
        }
        
        if (!image.title) {
          throw new Error("Cannot copy: missing content title");
        }
        
        // Show feedback to user
        createSnack(`Copying to ${socialMediaConfig[targetInstance].name}...`, "info");
        
        // Generate a new unique ID for the copied content
        const newId = crypto.randomUUID();
        
        // Create a copy of the image metadata, excluding the id and instance
        const { id: oldId, instance: oldInstance, ...metaWithoutIdAndInstance } = image;
        
        // Create a new metadata object with the new ID and target instance
        const newImageMeta: ImageMeta = {
          ...metaWithoutIdAndInstance,
          url: image.url,
          title: image.title,
          description: image.description || '',
          caption: image.caption || '',
          label: image.label,
          comment: image.comment || '',
          contentType: image.contentType,
          location: image.location, // Keep the original location (calendar date or pool)
          lastMoved: new Date(), // Update lastMoved to now
          copiedFrom: {
            id: oldId,
            instance: oldInstance || currentInstance,
            timestamp: new Date()
          },
          // Add the instance property for the target instance
          instance: targetInstance
        };
        
        // Determine the Firestore field to update based on target instance
        let firestoreInstance: string;
        switch (targetInstance) {
          case "facebook":
            firestoreInstance = "fbig"; // Legacy mapping for Facebook
            break;
          default:
            firestoreInstance = targetInstance;
        }
        
        // Update Firestore
        const projectRef = doc(db, "projects", projectId);
        await updateDoc(projectRef, {
          [`imageMetadata.${firestoreInstance}.${newId}`]: newImageMeta
        });
        
        // Log the activity with location information
        console.log(`Copied content from ${currentInstance} to ${targetInstance}`, {
          sourceId: oldId,
          targetId: newId,
          content: newImageMeta.title,
          location: newImageMeta.location
        });
        
        // Set success flag and update UI
        success = true;
        setSuccessCopyInstance(targetInstance);
        setTimeout(() => setSuccessCopyInstance(null), 3000);
        setLoadingCopyInstance(null);
        
        // Show success message
        createSnack(`Copied to ${socialMediaConfig[targetInstance].name}!`, "success");
        
        // Log the activity
        if (user) {
          const locationText = image.location === "pool" 
            ? "in pool" 
            : `on calendar (${image.location})`;
          await logActivityLocally(`copied '${newImageMeta.title}' from ${socialMediaConfig[currentInstance].name} to ${socialMediaConfig[targetInstance].name} ${locationText}`);
        }
        
        // Exit the retry loop
        break;
      } catch (error) {
        console.error(`Error copying to ${targetInstance}:`, error);
        // Increment retry count
        retryCount++;
        
        if (retryCount <= maxRetries) {
          console.log(`Retrying copy to ${targetInstance} (attempt ${retryCount} of ${maxRetries})...`);
          // Wait a moment before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // Show error message if all retries failed
          createSnack(`Failed to copy to ${socialMediaConfig[targetInstance].name}`, "error");
          setLoadingCopyInstance(null);
        }
      }
    }
    
    // Return void to satisfy the Promise<void> return type
    return;
  };

  // Add this formatter function near the top of the component (after state declarations)
  const formatDateString = (dateString: string | Date): string => {
    try {
      // Handle case where the location is a date string
      if (typeof dateString === 'string') {
        const parts = dateString.split('-').map(part => parseInt(part, 10));
        
        // First, check if it's a year-month-day format like "2025-0-5"
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          // Format is YYYY-MM-DD with 0-indexed month
          const year = parts[0];
          const month = parts[1]; // 0=January in JS
          const day = parts[2];
          
          if (month >= 0 && month < 12) {
            return `${monthNames[month]} ${day}, ${year}`;
          }
        }
        // Then check if it's a month-day format like "0-5"
        else if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const month = parts[0]; // 0=January
          const day = parts[1];
          const year = new Date().getFullYear();
          
          if (month >= 0 && month < 12) {
            return `${monthNames[month]} ${day}, ${year}`;
          }
        }
        
        // For other string formats, try standard JS Date parsing
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        }
      } 
      // Handle Date objects
      else if (dateString instanceof Date) {
        return `${monthNames[dateString.getMonth()]} ${dateString.getDate()}, ${dateString.getFullYear()}`;
      }
      
      // If we can't parse it as a date, return it as is
      return String(dateString);
    } catch (error) {
      console.error('Error formatting date:', error);
      return String(dateString);
    }
  };

  // Add a new downloadVideo function
  const handleVideoDownload = useCallback(async (videoUrl: string) => {
    if (!videoUrl) return;
    
    setIsDownloading(true);
    
    try {
      // Process Google Drive links if needed
      const processedUrl = videoUrl.includes("drive.google.com")
        ? getDirectDownloadLink(videoUrl)
        : videoUrl;
      
      // Extract filename from URL or use a default
      const urlParts = processedUrl.split('/');
      const filename = image?.title 
        ? `${image.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4` 
        : urlParts[urlParts.length - 1] || 'video.mp4';
      
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = processedUrl;
      downloadLink.setAttribute('download', filename);
      downloadLink.setAttribute('target', '_blank');
      downloadLink.setAttribute('rel', 'noopener noreferrer');
      
      // Append to document and click
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (error) {
      console.error('Error downloading video:', error);
      createSnack("Failed to download video", "error");
    } finally {
      setIsDownloading(false);
    }
  }, [image, createSnack]);

  // Add debug logging for activities
  useEffect(() => {
    console.log('Current activities:', activities);
  }, [activities]);

  // Function to fetch activities from Firestore
  const fetchActivities = async (imageId: string) => {
    if (!imageId) {
      console.error("Cannot fetch activities: No image ID provided");
      setActivities([]);
      return;
    }
    
    try {
      console.log(`Fetching activities for image: ${imageId}`);
      
      // Use the correct subcollection path pattern for Firestore
      // Format: /images/{imageId}/activities
      const activitiesCollectionRef = collection(db, "images", imageId, "activities");
      
      // Create a query to sort by timestamp (newest first)
      const q = query(
        activitiesCollectionRef,
        orderBy('timestamp', 'desc')
      );
      
      // Get the activities
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log("No activities found for this image");
        setActivities([]);
        return;
      }
      
      // Parse the activities
      const fetchedActivities: Activity[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore timestamp to JS Date
        const timestamp = data.timestamp ? 
          (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : 
          new Date();
          
        return {
          id: doc.id,
          userId: data.userId || '',
          userName: data.userName || 'Unknown User',
          userPhoto: data.userPhoto,
          action: data.action || '',
          details: data.details,
          timestamp
        };
      });
      
      console.log(`Fetched ${fetchedActivities.length} activities`);
      setActivities(fetchedActivities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      setActivities([]);
    }
  };

  // Helper function to handle carousel download
  const handleCarouselDownload = async () => {
    if (!image?.carouselArrangement || image.carouselArrangement.length === 0) {
      createSnack("No carousel images to download", "error");
      return;
    }

    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("carousel-images");
      
      if (!folder) {
        throw new Error("Failed to create zip folder");
      }
      
      // Create an array of promises for all image downloads
      const downloadPromises = image.carouselArrangement.map(async (photo, index) => {
        if (!photo || !photo.url) return false;
        
        try {
          const response = await fetch(photo.url);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          
          // Get content type from blob to determine extension
          const contentType = blob.type;
          let extension = 'jpg'; // Default extension
          
          // Map content type to appropriate extension
          if (contentType) {
            if (contentType.includes('png')) extension = 'png';
            else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';
            else if (contentType.includes('gif')) extension = 'gif';
            else if (contentType.includes('webp')) extension = 'webp';
            else if (contentType.includes('svg')) extension = 'svg';
          }
          
          // Create a clean filename with the proper extension
          const safeFileName = `image-${index + 1}.${extension}`;
          
          // Add the file to the zip
          folder.file(safeFileName, blob);
          
          return true;
        } catch (error) {
          console.error(`Error downloading image ${index}:`, error);
          return false;
        }
      });
      
      // Wait for all downloads to complete
      await Promise.all(downloadPromises);
      
      // Generate the zip file
      const content = await zip.generateAsync({ type: "blob" });
      
      // Create a safe filename using the content title if available
      const zipFileName = image.title 
        ? `${image.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-carousel.zip`
        : "carousel-images.zip";
      
      // Trigger download
      FileSaver.saveAs(content, zipFileName);
      createSnack("Carousel images downloaded successfully", "success");
    } catch (error) {
      console.error("Error creating zip file:", error);
      createSnack(`Failed to download images: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setIsDownloading(false);
    }
  };

  // If not visible, render nothing
  if (!visible) return null;
  
    return (
    <Dialog open={visible} onOpenChange={(open) => !open && handleCloseWithCheck()}>
      <DialogContent className="max-w-[99vw] max-h-[98vh] w-[1600px] p-0 overflow-hidden flex flex-col shadow-lg border-0 rounded-lg">
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

          /* More compact card headers */
          :global(.CardHeader) {
            padding: 8px 12px !important;
          }

          /* Tighter content padding */
          :global(.CardContent) {
            padding: 10px !important;
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
        
        {/* Delete Content Confirmation */}
        <ConfirmationModal
          isOpen={showDeleteConfirmation}
          onClose={() => setShowDeleteConfirmation(false)}
          onConfirm={confirmDelete}
          title="Delete Content"
          description="Are you sure you want to delete this content? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          isLoading={isDeleting}
        />
        
        <DialogHeader className="px-3 py-1.5 border-b bg-muted/40 flex-none">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                {currentInstance && (
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {socialMediaConfig[currentInstance]?.name || currentInstance}
                    </div>
                    {image?.timestamp && (
                      <div className="text-xs text-muted-foreground">
                        {formatDateString(image.timestamp)}
                      </div>
                    )}
                    {image?.location && !image?.timestamp && image.location !== 'pool' && (
                      <div className="text-xs text-muted-foreground">
                        {formatDateString(image.location)}
                      </div>
                    )}
                    {image?.location === 'pool' && !image?.timestamp && (
                      <div className="text-xs text-muted-foreground">
                        Content Pool
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!editing && image && (
                <div className="flex items-center space-x-2">
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
                      disabled={isSaving || isDeleting}
                    />
                  </div>
                  
                  {/* Add delete button with trash icon */}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full w-9 h-9 p-0 border-muted-foreground/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleDeleteClick}
                      disabled={isSaving || isApprovalLoading || isDeleting}
                      title="Delete content"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="sr-only">Delete</span>
                    </Button>
                  )}
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
                  <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full w-9 h-9 p-0 border-muted-foreground/30"
                        title="Copy to other platform"
                      >
                        <ClipboardIcon className="h-4 w-4" />
                        <span className="sr-only">Copy to</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                      {Object.entries(socialMediaConfig)
                        .filter(([instance]) => instance !== currentInstance) // Exclude current instance
                        .map(([instance, config]) => (
                          <DropdownMenuItem 
                            key={instance} 
                            className="flex justify-between items-center"
                            onSelect={(e) => e.preventDefault()} // Prevent automatic closing on selection
                          >
                            <div className="flex items-center">
                              <img 
                                src={config.icon} 
                                alt={config.name} 
                                className="w-4 h-4 mr-2" 
                              />
                              <span>{config.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 rounded-full hover:bg-muted"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyToInstance(instance as SocialMediaInstance);
                              }}
                              disabled={loadingCopyInstance !== null || successCopyInstance !== null}
                            >
                              {loadingCopyInstance === instance ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
                              ) : successCopyInstance === instance ? (
                                <CheckIcon className="h-4 w-4 text-green-500" />
                              ) : (
                                <PlusIcon className="h-4 w-4" />
                              )}
                              <span className="sr-only">Copy to {config.name}</span>
                            </Button>
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
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

        {/* Main content area with flex-grow-1 to take available space */}
        <div className="flex-grow overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={editing ? "editing" : "viewing"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {editing ? (
                <form id="detailsForm" ref={formRef} onSubmit={handleSubmit} className="flex flex-1 overflow-hidden h-[calc(98vh-180px)]">
                  <div className="grid grid-cols-[30%_40%_30%] w-full divide-x">
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
                        editLabel={editLabel}
                        setEditLabel={setEditLabel}
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
                      <div className="p-3 h-full">
                        <Card className="h-full border-none overflow-hidden shadow-sm">
                          {(editing ? editLabel : image?.label) !== "Draft" && (
                          <CardHeader className="py-2 bg-muted/40 border-b">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-xs font-medium flex items-center">
                                <ViewColumnsIcon className="h-4 w-4 mr-1.5 text-primary" />
                                Content Preview
                                <span className="ml-2 font-normal text-muted-foreground">|</span>
                                <span className="ml-1.5 capitalize flex items-center">
                                  {currentContentType === 'photo' && <PhotoIcon className="h-3.5 w-3.5 text-blue-500 mr-1" />}
                                  {currentContentType === 'video' && <VideoCameraIcon className="h-3.5 w-3.5 text-purple-500 mr-1" />}
                                  {currentContentType === 'reel' && <VideoCameraIcon className="h-3.5 w-3.5 text-pink-500 mr-1" />}
                                  {currentContentType === 'carousel' && <ViewColumnsIcon className="h-3.5 w-3.5 text-orange-500 mr-1" />}
                                  {currentContentType}
                                </span>
                              </CardTitle>
                              
                              <div className="flex items-center gap-2">
                                {/* Download button for videos/reels */}
                                {(currentContentType === 'video' || currentContentType === 'reel') && image?.videoEmbed && !editing && (
                                  <button
                                    onClick={() => handleVideoDownload(image.videoEmbed || '')}
                                    className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-white hover:opacity-90 transition-opacity select-none flex justify-between items-center"
                                    disabled={isDownloading}
                                  >
                                    <span>{isDownloading ? "..." : "Download"}</span>
                                    <ArrowDownTrayIcon className="h-2.5 w-2.5 ml-1.5" />
                                  </button>
                                )}
                                
                                {/* Download button for carousel */}
                                {currentContentType === 'carousel' && image?.carouselArrangement && image.carouselArrangement.length > 0 && !editing && (
                                  <button
                                    onClick={handleCarouselDownload}
                                    className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-white hover:opacity-90 transition-opacity select-none flex justify-between items-center"
                                    disabled={isDownloading}
                                  >
                                    <span>{isDownloading ? "..." : "Download All"}</span>
                                    <ArrowDownTrayIcon className="h-2.5 w-2.5 ml-1.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          )}
                          <CardContent className={`p-0 flex items-center justify-center bg-background/60 ${(editing ? editLabel : image?.label) === "Draft" ? "h-full" : "h-[calc(100%-48px)]"}`}>
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                              className="w-full h-full flex items-center justify-center overflow-auto p-5"
                            >
                              <div className="w-full h-full">
                                <RenderSecondColumn
                                  currentType={currentContentType}
                                  image={editing ? { ...image, label: editLabel } : image}
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
                          {(editing ? editLabel : image?.label) !== "Draft" && (
                          <CardHeader className="py-2 bg-muted/40 border-b">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-xs font-medium flex items-center">
                                <PhotoIcon className="h-4 w-4 mr-1.5 text-primary" />
                                {editing ? "Change Thumbnail" : "Thumbnail"}
                              </CardTitle>
                              {image?.url && !editing && (
                                <button
                                  onClick={handleThumbnailDownload}
                                  className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-white hover:opacity-90 transition-opacity select-none flex justify-between items-center"
                                  disabled={isDownloading}
                                >
                                  {isDownloading ? "..." : <span>Download</span>}
                                  <ArrowDownTrayIcon className="h-2.5 w-2.5 ml-1.5" />
                                </button>
                              )}
                            </div>
                          </CardHeader>
                          )}
                          <CardContent className={`p-4 ${(editing ? editLabel : image?.label) === "Draft" ? "h-full" : "h-[calc(100%-48px)]"}`}>
                            <RenderThirdColumn
                              image={editing ? { ...image, label: editLabel, samples: localSamples } : { ...image, samples: localSamples }}
                              editing={editing}
                              isUploadingPhoto={isUploadingPhoto}
                              triggerPhotoUpload={triggerPhotoUpload}
                              isDownloading={isDownloading}
                              handleThumbnailDownload={handleThumbnailDownload}
                              onSamplesUpload={handleSamplesUpload}
                              onSampleDelete={handleSampleDelete}
                              uploadProgress={samplesUploadProgress}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-[30%_40%_30%] divide-x h-[calc(98vh-180px)]">
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
                      editLabel={editLabel}
                      setEditLabel={setEditLabel}
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
                    <div className="p-3 h-full">
                      <Card className="h-full border-none overflow-hidden shadow-sm">
                        {(editing ? editLabel : image?.label) !== "Draft" && (
                        <CardHeader className="py-2 bg-muted/40 border-b">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-medium flex items-center">
                              <ViewColumnsIcon className="h-4 w-4 mr-1.5 text-primary" />
                              Content Preview
                              <span className="ml-2 font-normal text-muted-foreground">|</span>
                              <span className="ml-1.5 capitalize flex items-center">
                                {currentContentType === 'photo' && <PhotoIcon className="h-3.5 w-3.5 text-blue-500 mr-1" />}
                                {currentContentType === 'video' && <VideoCameraIcon className="h-3.5 w-3.5 text-purple-500 mr-1" />}
                                {currentContentType === 'reel' && <VideoCameraIcon className="h-3.5 w-3.5 text-pink-500 mr-1" />}
                                {currentContentType === 'carousel' && <ViewColumnsIcon className="h-3.5 w-3.5 text-orange-500 mr-1" />}
                                {currentContentType}
                              </span>
                            </CardTitle>
                            
                            <div className="flex items-center gap-2">
                              {/* Download button for videos/reels */}
                              {(currentContentType === 'video' || currentContentType === 'reel') && image?.videoEmbed && !editing && (
                                <button
                                  onClick={() => handleVideoDownload(image.videoEmbed || '')}
                                  className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-white hover:opacity-90 transition-opacity select-none flex justify-between items-center"
                                  disabled={isDownloading}
                                >
                                  <span>{isDownloading ? "..." : "Download"}</span>
                                  <ArrowDownTrayIcon className="h-2.5 w-2.5 ml-1.5" />
                                </button>
                              )}
                              
                              {/* Download button for carousel */}
                              {currentContentType === 'carousel' && image?.carouselArrangement && image.carouselArrangement.length > 0 && !editing && (
                                <button
                                  onClick={handleCarouselDownload}
                                  className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-white hover:opacity-90 transition-opacity select-none flex justify-between items-center"
                                  disabled={isDownloading}
                                >
                                  <span>{isDownloading ? "..." : "Download All"}</span>
                                  <ArrowDownTrayIcon className="h-2.5 w-2.5 ml-1.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        )}
                        <CardContent className={`p-0 flex items-center justify-center bg-background/60 ${(editing ? editLabel : image?.label) === "Draft" ? "h-full" : "h-[calc(100%-48px)]"}`}>
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="w-full h-full flex items-center justify-center overflow-auto p-5"
                          >
                            <div className="w-full h-full">
                              <RenderSecondColumn
                                currentType={currentContentType}
                                image={editing ? { ...image, label: editLabel } : image}
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
                        {(editing ? editLabel : image?.label) !== "Draft" && (
                        <CardHeader className="py-2 bg-muted/40 border-b">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-medium flex items-center">
                              <PhotoIcon className="h-4 w-4 mr-1.5 text-primary" />
                              {editing ? "Change Thumbnail" : "Thumbnail"}
                            </CardTitle>
                            {image?.url && !editing && (
                              <button
                                onClick={handleThumbnailDownload}
                                className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-white hover:opacity-90 transition-opacity select-none flex justify-between items-center"
                                disabled={isDownloading}
                              >
                                {isDownloading ? "..." : <span>Download</span>}
                                <ArrowDownTrayIcon className="h-2.5 w-2.5 ml-1.5" />
                              </button>
                            )}
                          </div>
                        </CardHeader>
                        )}
                        <CardContent className={`p-4 ${(editing ? editLabel : image?.label) === "Draft" ? "h-full" : "h-[calc(100%-48px)]"}`}>
                          <RenderThirdColumn
                            image={editing ? { ...image, label: editLabel, samples: localSamples } : { ...image, samples: localSamples }}
                            editing={editing}
                            isUploadingPhoto={isUploadingPhoto}
                            triggerPhotoUpload={triggerPhotoUpload}
                            isDownloading={isDownloading}
                            handleThumbnailDownload={handleThumbnailDownload}
                            onSamplesUpload={handleSamplesUpload}
                            onSampleDelete={handleSampleDelete}
                            uploadProgress={samplesUploadProgress}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
          
        {/* Activity Log - Make it stand out more with stronger styling */}
        <div className="flex-none w-full border-t border-primary/20 bg-primary/5">
          <ActivityLog
            activities={activities}
            isExpanded={isActivityExpanded}
            onToggle={() => setIsActivityExpanded(!isActivityExpanded)}
          />
        </div>

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
  
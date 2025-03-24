import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DocumentTextIcon,
  ChatBubbleLeftEllipsisIcon,
  TagIcon,
  ViewColumnsIcon,
  PhotoIcon,
  VideoCameraIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

// Import shadcn UI components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Import separated parts from DetailsModalParts folder
import ExpandableText from "./ExpandableText";
import AttachmentsList from "./AttachmentsList";
import CommentsSection from "./CommentsSection";
// Import from parent directory
import { Comment, ExtendedImageMeta } from "../DetailsModal";
import { Attachment } from "@/components/common/media/AttachmentDropZone";
import AttachmentDropZone from "@/components/common/media/AttachmentDropZone";

// Constants
const DESCRIPTION_THRESHOLD = 1000;
const CAPTION_THRESHOLD = 1000;
const COMMENT_MAX_LENGTH = 5000;

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

interface RenderFirstColumnProps {
  image?: ExtendedImageMeta;
  editing: boolean;
  descText: string;
  setDescText: (text: string) => void;
  captionText: string;
  setCaptionText: (text: string) => void;
  descExpanded: boolean;
  setDescExpanded: (expanded: boolean) => void;
  captionExpanded: boolean;
  setCaptionExpanded: (expanded: boolean) => void;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  newComment: string;
  setNewComment: (comment: string) => void;
  handlePostComment: () => Promise<void>;
  toggleLike: (commentId: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  editContentType: string;
  setEditContentType: (contentType: string) => void;
  attachmentInputLocalRef: React.RefObject<HTMLInputElement>;
  processAttachmentFilesForEdit: (files: File[], setAttachmentFn: (files: Attachment[]) => void) => Promise<void>;
  commentsContainerRef: React.RefObject<HTMLDivElement>;
  firstColumnRef: React.RefObject<HTMLDivElement>;
  showScrollIndicator: boolean;
  user: any;
}

const RenderFirstColumn: React.FC<RenderFirstColumnProps> = ({
  image,
  editing,
  descText,
  setDescText,
  captionText,
  setCaptionText,
  descExpanded,
  setDescExpanded,
  captionExpanded,
  setCaptionExpanded,
  comments,
  setComments,
  newComment,
  setNewComment,
  handlePostComment,
  toggleLike,
  deleteComment,
  attachments,
  setAttachments,
  editContentType,
  setEditContentType,
  attachmentInputLocalRef,
  processAttachmentFilesForEdit,
  commentsContainerRef,
  firstColumnRef,
  showScrollIndicator,
  user,
}) => {
  // Handle description and caption changes
  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescText(e.target.value);
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCaptionText(e.target.value);
  };

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

  // Get the current content type
  const currentContentType = editing
    ? editContentType.toLowerCase()
    : (image?.contentType || "photo").toLowerCase();

  // Force any Radix UI viewport elements to use block display
  useEffect(() => {
    const fixViewportStyles = () => {
      // Target the specific nested elements with display:table
      document.querySelectorAll('.h-full [data-radix-scroll-area-viewport]').forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.setProperty('display', 'block', 'important');
          el.style.setProperty('min-width', 'auto', 'important');
          el.style.setProperty('width', '100%', 'important');
          
          // Also target any direct children that might have display:table
          Array.from(el.children).forEach(child => {
            if (child instanceof HTMLElement) {
              child.style.setProperty('display', 'block', 'important');
              child.style.setProperty('min-width', 'auto', 'important');
              child.style.setProperty('width', '100%', 'important');
            }
          });
        }
      });

      // Also try to find any element with display:table and fix it
      document.querySelectorAll('#detailsForm *').forEach(el => {
        if (el instanceof HTMLElement) {
          const style = window.getComputedStyle(el);
          if (style.display === 'table') {
            el.style.setProperty('display', 'block', 'important');
            el.style.setProperty('min-width', 'auto', 'important');
            el.style.setProperty('width', '100%', 'important');
          }
        }
      });
    };

    // Run immediately and repeatedly for a short time to ensure it's applied
    fixViewportStyles();
    
    const intervalId = setInterval(fixViewportStyles, 50);
    const timeoutId = setTimeout(() => clearInterval(intervalId), 500);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  // Ensure the comments container ref is created if not provided
  useEffect(() => {
    // Make sure the comment container scrolls to bottom initially
    if (commentsContainerRef?.current && comments.length > 0) {
      setTimeout(() => {
        const scrollContainer = commentsContainerRef.current;
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }, 100); // Small delay to ensure container is fully rendered
    }
  }, [comments, commentsContainerRef]);

  return (
    <div className="h-full overflow-x-hidden" ref={firstColumnRef} style={{width: '100%'}}>
      <ScrollArea className="h-full overflow-x-hidden" style={{ display: 'block', width: '100%', minWidth: 'auto !important' }}>
        <div className="px-4 py-4 space-y-4 max-w-full" style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}>
          {editing ? (
            /* Edit Mode */
            <>
              <Card className="shadow-sm border-[1.5px] border-border/70 w-full overflow-hidden">
                <CardContent className="p-4 space-y-4 w-full">
                  <div className="space-y-3 w-full">
                    <Label htmlFor="title" className="text-sm font-medium flex items-center">
                      <DocumentTextIcon className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      Title
                    </Label>
                    <Input 
                      id="title" 
                      name="title" 
                      defaultValue={image?.title} 
                      className="w-full" 
                    />
                  </div>

                  <div className="space-y-3 w-full">
                    <Label htmlFor="description" className="text-sm font-medium flex items-center">
                      <DocumentTextIcon className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={descText}
                      onChange={handleDescChange}
                      className="min-h-[80px] resize-none w-full break-words"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {descText.length}/{DESCRIPTION_THRESHOLD} characters
                    </p>
                  </div>

                  <div className="space-y-3 w-full">
                    <Label htmlFor="caption" className="text-sm font-medium flex items-center">
                      <ChatBubbleLeftEllipsisIcon className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      Caption
                    </Label>
                    <Textarea
                      id="caption"
                      name="caption"
                      value={captionText}
                      onChange={handleCaptionChange}
                      className="min-h-[80px] resize-none w-full break-words"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {captionText.length}/{CAPTION_THRESHOLD} characters
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="label" className="text-sm font-medium flex items-center">
                        <TagIcon className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        Status Label
                      </Label>
                      <div>
                        <Select name="label" defaultValue={image?.label || "Approved"}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Approved">
                              <div className="flex items-center">
                                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                Approved
                              </div>
                            </SelectItem>
                            <SelectItem value="Needs Revision">
                              <div className="flex items-center">
                                <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                                Needs Revision
                              </div>
                            </SelectItem>
                            <SelectItem value="Ready for Approval">
                              <div className="flex items-center">
                                <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>
                                Ready for Approval
                              </div>
                            </SelectItem>
                            <SelectItem value="Scheduled">
                              <div className="flex items-center">
                                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                                Scheduled
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contentType" className="text-sm font-medium flex items-center">
                        <ViewColumnsIcon className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        Content Type
                      </Label>
                      <Select 
                        name="contentType" 
                        value={editContentType}
                        onValueChange={setEditContentType}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select content type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Photo">Photo</SelectItem>
                          <SelectItem value="reel">Reel</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="carousel">Carousel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-[1.5px] border-border/70 w-full overflow-hidden">
                <CardHeader className="py-3 bg-muted/30">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2 text-primary" />
                    Instructional Assets
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 w-full">
                  <div className="w-full">
                    <AttachmentDropZone
                      attachments={attachments}
                      setAttachments={setAttachments}
                      inputRef={attachmentInputLocalRef}
                      processFiles={processAttachmentFilesForEdit}
                    />
                  </div>
                  <div className="mt-4 w-full">
                    <AttachmentsList attachments={attachments} editing={editing} setAttachments={setAttachments} />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* View Mode */
            <>
              <Card className="shadow-sm border-[1.5px] border-border/70 w-full overflow-hidden">
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 items-start max-w-full overflow-hidden">
                    <div className="font-medium text-sm flex items-center">
                      <DocumentTextIcon className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      Title:
                    </div>
                    <div className="text-sm break-words w-full border-[1px] border-border/30 rounded-md p-2 bg-white/50 max-w-full overflow-hidden">
                      {image?.title || "N/A"}
                    </div>
                    
                    <div className="font-medium text-sm flex items-center">
                      <TagIcon className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      Status:
                    </div>
                    <div>
                      <Badge variant={getLabelBadgeVariant(image?.label) as any} className="font-normal px-2 py-0.5">
                        {image?.label || "N/A"}
                      </Badge>
                    </div>
                    
                    <div className="font-medium text-sm flex items-center">
                      <ViewColumnsIcon className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      Content Type:
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {currentContentType === 'photo' && <PhotoIcon className="h-4 w-4 text-blue-500" />}
                      {currentContentType === 'video' && <VideoCameraIcon className="h-4 w-4 text-purple-500" />}
                      {currentContentType === 'reel' && <VideoCameraIcon className="h-4 w-4 text-pink-500" />}
                      {currentContentType === 'carousel' && <ViewColumnsIcon className="h-4 w-4 text-orange-500" />}
                      <span className="capitalize">{currentContentType}</span>
                    </div>

                    <div className="font-medium text-sm flex items-start pt-1">
                      <DocumentTextIcon className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      Description:
                    </div>
                    <div className="text-sm relative max-w-full" style={{ width: '100%', overflow: 'hidden' }}>
                      <div className={`border-[1px] border-border/30 bg-white/50 rounded-md p-2 break-words w-full whitespace-pre-wrap ${descExpanded ? '' : 'max-h-[60px] overflow-hidden'}`} style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
                        {image?.description || "No description provided."}
                      </div>
                      {(image?.description?.length || 0) > 50 && (
                        <div className={`w-full flex justify-center border-t border-border/20 ${descExpanded ? 'bg-white/90' : 'bg-gradient-to-t from-white via-white/90 to-transparent'} py-1 rounded-b-md`}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs px-2"
                            onClick={() => setDescExpanded(!descExpanded)}
                          >
                            {descExpanded ? (
                              <span className="flex items-center">
                                <ChevronDownIcon className="h-3 w-3 rotate-180 mr-1" />
                                Hide
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <ChevronDownIcon className="h-3 w-3 mr-1" />
                                Expand
                              </span>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="font-medium text-sm flex items-start pt-1">
                      <ChatBubbleLeftEllipsisIcon className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      Caption:
                    </div>
                    <div className="text-sm relative max-w-full" style={{ width: '100%', overflow: 'hidden' }}>
                      <div className={`border-[1px] border-border/30 bg-white/50 rounded-md p-2 break-words w-full whitespace-pre-wrap ${captionExpanded ? '' : 'max-h-[60px] overflow-hidden'}`} style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
                        {image?.caption || "No caption provided."}
                      </div>
                      {(image?.caption?.length || 0) > 50 && (
                        <div className={`w-full flex justify-center border-t border-border/20 ${captionExpanded ? 'bg-white/90' : 'bg-gradient-to-t from-white via-white/90 to-transparent'} py-1 rounded-b-md`}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs px-2"
                            onClick={() => setCaptionExpanded(!captionExpanded)}
                          >
                            {captionExpanded ? (
                              <span className="flex items-center">
                                <ChevronDownIcon className="h-3 w-3 rotate-180 mr-1" />
                                Hide
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <ChevronDownIcon className="h-3 w-3 mr-1" />
                                Expand
                              </span>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-[1.5px] border-border/70 w-full overflow-hidden">
                <CardHeader className="py-3 bg-muted/30">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2 text-primary" />
                    Instructional Assets
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <AttachmentsList attachments={attachments} editing={false} setAttachments={setAttachments} />
                </CardContent>
              </Card>
            </>
          )}

          {/* Comments Card - Present in both view and edit modes */}
          <Card className="shadow-sm border-[1.5px] border-border/70 bg-muted/10 w-full overflow-hidden">
            <CardHeader className="py-3 bg-muted/30">
              <CardTitle className="text-sm font-medium flex items-center">
                <ChatBubbleLeftEllipsisIcon className="h-5 w-5 mr-2 text-primary" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <CommentsSection
                comments={comments}
                user={user}
                newComment={newComment}
                setNewComment={setNewComment}
                handlePostComment={handlePostComment}
                toggleLike={toggleLike}
                deleteComment={deleteComment}
                COMMENT_MAX_LENGTH={COMMENT_MAX_LENGTH}
                commentTextStyle={"whitespace-pre-wrap break-words text-sm"}
                commentsContainerRef={commentsContainerRef}
              />
            </CardContent>
          </Card>
        </div>
        {showScrollIndicator && <ScrollHintIndicator />}
      </ScrollArea>
    </div>
  );
};

export default RenderFirstColumn; 
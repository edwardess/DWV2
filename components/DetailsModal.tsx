// DetailsModal.tsx
import React, { useRef, FormEvent, useState } from "react";
import { ImageMeta } from "./DemoWrapper"; // adjust path as needed
import Modal from "./Modal";
import AttachmentDropZone, { Attachment } from "./AttachmentDropZone";
import {
  ArrowDownTrayIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  TagIcon,
  ViewColumnsIcon,
  VideoCameraIcon,
  PhotoIcon,
  PaperClipIcon,
  ChatBubbleOvalLeftEllipsisIcon,
} from "@heroicons/react/24/outline";

import HashLoader from "react-spinners/HashLoader";

interface DetailsModalProps {
  visible: boolean;
  image: ImageMeta | null;
  editing: boolean;
  onToggleEdit: (edit: boolean) => void;
  onClose: () => void;
  onSave: (newMeta: ImageMeta) => Promise<void>;
  processFiles: (files: File[], setAttachmentFn: (files: Attachment[]) => void) => Promise<void>;
  attachments: Attachment[];
  setAttachments: (files: Attachment[]) => void;
}

const convertDriveLink = (link: string): string => {
  const match = link.match(/\/d\/(.*?)\//);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return link;
};

const DetailsModal: React.FC<DetailsModalProps> = ({
  visible,
  image,
  editing,
  onToggleEdit,
  onClose,
  onSave,
  processFiles,
  attachments,
  setAttachments,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const attachmentInputLocalRef = useRef<HTMLInputElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Function to handle the form submit in edit mode.
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!image) return;
    const formData = new FormData(formRef.current!);
    const newMeta: ImageMeta = {
      ...image,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      label: formData.get("label") as string,
      videoEmbed: formData.get("videoEmbed") as string,
      contentType: formData.get("contentType") as string,
      comment: formData.get("comment") as string,
      lastMoved: image.lastMoved,
      attachments: attachments,
    };
    await onSave(newMeta);
    // Exit edit mode after saving.
    onToggleEdit(false);
  };

  // Function to handle direct download of the thumbnail from Firebase Storage.
  const handleThumbnailDownload = async () => {
    if (!image?.url) return;
    setIsDownloading(true)
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      // Use the image title if available; otherwise, default to 'download.jpg'
      a.download = image.title ? `${image.title}.jpg` : "download.jpg";
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading thumbnail:", err);
    } finally {
      setIsDownloading(false)
    }
  };


  const handleDownloadClick = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
    }, 1000);
  };

  if (!visible) return null;

  // For non-edit mode: compute a direct download URL for the reel (if it’s a Google Drive link).
  const directReelLink =
    image && image.videoEmbed && image.videoEmbed.includes("drive.google.com")
      ? convertDriveLink(image.videoEmbed)
      : image?.videoEmbed || "#";

  return (
    <Modal visible={visible}>
      <div className="bg-white rounded-lg p-4 w-[90vw] max-w-[1200px] max-h-[90vh] overflow-y-auto flex flex-col">
      {isDownloading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <HashLoader color="white" loading={isDownloading} size={150} />
        </div>
      )}
        <div className="sticky top-0 flex justify-between items-center bg-white pb-2 border-b">
          <h3 className="text-lg font-bold">Image Details</h3>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => onToggleEdit(false)}
                  className="rounded border px-3 py-1 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="detailsForm"
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onToggleEdit(true)}
                  className="rounded bg-gradient-to-r from-[#047AC0] to-[#8EC9FF] px-3 py-1 text-sm text-white"
                >
                  Edit Mode
                </button>
                <button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm">
                  Close
                </button>
              </>
            )}
          </div>
        </div>
        {editing ? (
          <form
            id="detailsForm"
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex flex-col h-full mt-4 overflow-y-auto"
          >
            <div className="grid grid-cols-3 gap-4 h-[70vh]">
              {/* First Column */}
              <div className="flex flex-col border-r pr-2">
                <label className="block text-xs">Title</label>
                <input name="title" defaultValue={image?.title} className="mt-1 w-full rounded border px-2 py-1 text-xs" />
                <label className="block text-xs mt-2">Description</label>
                <textarea name="description" defaultValue={image?.description} className="mt-1 w-full rounded border px-2 py-1 text-xs" />
                <label className="block text-xs mt-2">Label</label>
                <select name="label" defaultValue={image?.label || "Approved"} className="mt-1 w-full rounded border px-2 py-1 text-xs">
                  <option value="Approved">Approved</option>
                  <option value="Needs Revision">Needs Revision</option>
                  <option value="Ready for Approval">Ready for Approval</option>
                  <option value="Scheduled">Scheduled</option>
                </select>
                <label className="block text-xs mt-2">Content Type</label>
                <select name="contentType" defaultValue={image?.contentType || "Photo"} className="mt-1 w-full rounded border px-2 py-1 text-xs">
                  <option value="Photo">Photo</option>
                  <option value="reel">Reel</option>
                  <option value="video">Video</option>
                  <option value="carousel">Carousel</option>
                </select>
                <div className="mt-2">
                  <h4 className="text-sm font-bold mb-2">
                    Instructional Assets For Revision (Photo or Video)
                  </h4>
                  <AttachmentDropZone
                    attachments={attachments}
                    setAttachments={setAttachments}
                    inputRef={attachmentInputLocalRef}
                    processFiles={processFiles}
                  />
                </div>
                <label className="block text-xs mt-2">Comment</label>
                <textarea
                  name="comment"
                  defaultValue={image?.comment}
                  className="mt-1 w-full rounded border px-2 py-1 text-xs bg-gray-50 resize-y flex-grow min-h-[150px]"
                />
              </div>
              {/* Second Column */}
              <div className="flex flex-col border-r pr-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center">
                    <VideoCameraIcon className="h-5 w-5 text-gray-500 mr-1" /> Reel
                  </h4>
                  {image?.videoEmbed && (
                    <a
                      href={directReelLink}
                      download
                      className="rounded bg-gradient-to-r from-[#047AC0] to-[#8EC9FF] px-2 py-1 text-xs text-white"
                    >
                      Download
                    </a>
                  )}
                </div>
                <input name="videoEmbed" defaultValue={image?.videoEmbed} className="mt-1 w-full rounded border px-2 py-1 text-xs" />
                {image?.videoEmbed && (
                  <div className="relative w-full mt-2 aspect-[9/16]">
                    <iframe
                      src={image.videoEmbed}
                      className="absolute inset-0 w-full h-full rounded"
                      frameBorder="0"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}
              </div>
              {/* Third Column */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center">
                    <PhotoIcon className="h-5 w-5 text-gray-500 mr-1" /> Thumbnail
                  </h4>
                  {image?.url && (
                    <button
                      onClick={handleThumbnailDownload}
                      className="rounded bg-gradient-to-r from-[#047AC0] to-[#8EC9FF] px-2 py-1 text-xs text-white"
                    >
                      Download
                    </button>
                  )}
                </div>
                <img src={image?.url} alt="Thumbnail" className="w-full h-auto object-contain rounded" />
              </div>
            </div>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {/* First Column */}
              <div className="flex flex-col border-r pr-2">
                <h4 className="text-sm font-bold mb-1 flex items-center">
                  <InformationCircleIcon className="h-5 w-5 text-gray-500 mr-1" /> Details
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <DocumentTextIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-xs font-semibold text-gray-700 flex-shrink-0">Title:</span>
                    <span className="ml-2 text-xs text-gray-600 flex-1 break-all">
                      {image?.title || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <ChatBubbleOvalLeftEllipsisIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-xs font-semibold text-gray-700 flex-shrink-0">Description:</span>
                    <span className="ml-2 text-xs text-gray-600 flex-1 break-all">
                      {image?.description || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <TagIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-xs font-semibold text-gray-700 flex-shrink-0">Label:</span>
                    <span className="ml-2 text-xs text-gray-600 flex-1 break-all">
                      {image?.label || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <ViewColumnsIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-xs font-semibold text-gray-700 flex-shrink-0">Content Type:</span>
                    <span className="ml-2 text-xs text-gray-600 flex-1 break-all">
                      {image?.contentType || "Photo"}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <ChatBubbleLeftIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-xs font-semibold text-gray-700 flex-shrink-0">Comment:</span>
                    <span className="ml-2 text-xs text-gray-600 flex-1 break-all">
                      {image?.comment || "N/A"}
                    </span>
                  </div>
                  {image?.attachments && image.attachments.length > 0 ? (
                    <div className="mt-2">
                      <h4 className="text-sm font-bold mb-1 flex items-center">
                        <PaperClipIcon className="h-5 w-5 text-gray-500 mr-1" /> Instructional Assets For Revision (Photo or Video)
                      </h4>
                      <ul className="space-y-1">
                        {image.attachments.map((att, index) => (
                          <li key={index} className="flex items-center justify-between border p-1 rounded mb-1">
                            <span className="text-xs text-gray-700">{att.name}</span>
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 text-xs flex items-center"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4 mr-1" /> Download
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <h4 className="text-sm font-bold mb-1 flex items-center">
                        <PaperClipIcon className="h-5 w-5 text-gray-500 mr-1" /> Instructional Assets For Revision (Photo or Video)
                      </h4>
                      <span className="ml-2 text-xs text-gray-600 flex-1 break-all">
                        No Revision Instructions Provided.
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Second Column */}
              <div className="flex flex-col border-r pr-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center">
                    <VideoCameraIcon className="h-5 w-5 text-gray-500 mr-1" /> Reel
                  </h4>
                  {image?.videoEmbed && (
                    <a
                      href={
                        image.videoEmbed.includes("drive.google.com")
                          ? convertDriveLink(image.videoEmbed)
                          : image.videoEmbed
                      }
                      download
                      className="rounded bg-gradient-to-r from-[#047AC0] to-[#8EC9FF] px-2 py-1 text-xs text-white"
                      onClick={handleDownloadClick} // Triggers the loading state
                    >
                      Download
                    </a>
                  )}
                </div>
                {image?.videoEmbed ? (
                  <div className="relative w-full mt-2 aspect-[9/16]">
                    <iframe
                      src={image.videoEmbed}
                      className="absolute inset-0 w-full h-full rounded"
                      frameBorder="0"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No video provided.</p>
                )}
              </div>
              {/* Third Column */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold flex items-center ">
                    <PhotoIcon className="h-5 w-5 text-gray-500 mr-1 " /> Thumbnail
                  </h4>
                  {image?.url && (
                    <button
                      onClick={handleThumbnailDownload}
                      className="rounded bg-gradient-to-r from-[#047AC0] to-[#8EC9FF] px-2 py-1 text-xs text-white"
                    >
                      Download
                    </button>
                  )}
                </div>
                <img src={image?.url} alt="Thumbnail" className="w-full h-auto object-contain rounded" />
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>  
  );
};

export default DetailsModal;

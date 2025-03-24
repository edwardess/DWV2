// Put the components/EditImageModal.tsx code here 

// EditImageModal.tsx
import React, { useRef, FormEvent } from "react";
import { ImageMeta } from "@/components/pages/DemoWrapper"; // adjust path as needed
import Modal from "@/components/common/modals/Modal";
import AttachmentDropZone, { Attachment } from "@/components/common/media/AttachmentDropZone";
import {
  ArrowDownTrayIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  TagIcon,
  VideoCameraIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

interface EditImageModalProps {
  visible: boolean;
  image: ImageMeta | null;
  onClose: () => void;
  onSave: (newMeta: ImageMeta) => Promise<void>;
  processFiles: (files: File[], setAttachmentFn: (files: Attachment[]) => void) => Promise<void>;
  attachments: Attachment[];
  setAttachments: (files: Attachment[]) => void;
}

const EditImageModal: React.FC<EditImageModalProps> = ({
  visible,
  image,
  onClose,
  onSave,
  processFiles,
  attachments,
  setAttachments,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const attachmentInputLocalRef = useRef<HTMLInputElement>(null);

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
      lastMoved: new Date(),
      attachments: attachments,
    };
    await onSave(newMeta);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible}>
      <div className="bg-white rounded-lg p-4 w-[90vw] max-w-[1200px] max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="sticky top-0 flex justify-between items-center bg-white pb-2 border-b">
          <h3 className="text-lg font-bold">Edit Image Info</h3>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm">
              Cancel
            </button>
            <button type="submit" form="editForm" className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
              Save
            </button>
          </div>
        </div>
        <form id="editForm" ref={formRef} onSubmit={handleSubmit} className="flex flex-col h-full mt-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            {/* First Column */}
            <div className="flex flex-col">
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
                <h4 className="text-sm font-bold mb-2">Instructional Assets For Revision (Photo or Video)</h4>
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
            <div className="flex flex-col">
              <label className="block text-xs">Video Embed URL</label>
              <input name="videoEmbed" defaultValue={image?.videoEmbed} className="mt-1 w-full rounded border px-2 py-1 text-xs" />
              {image?.videoEmbed && (
                <div className="relative w-full mt-2 aspect-[9/16]">
                  <iframe
                    src={image.videoEmbed}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                  ></iframe>
                </div>
              )}
            </div>
            {/* Third Column */}
            <div className="flex flex-col">
              <label className="block text-xs">Thumbnail</label>
              <img src={image?.url} alt="Thumbnail" className="w-full h-auto object-contain rounded" />
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default EditImageModal;

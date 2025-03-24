// Put the components/UploadModal.tsx code here // UploadModal.tsx
import React, { useRef, FormEvent } from "react";
import Modal from "@/components/common/modals/Modal";

interface UploadModalProps {
  visible: boolean;
  droppedFile: File | null;
  onClose: () => void;
  onUpload: (formData: FormData, file: File) => Promise<void>;
  onFileSelect: (file: File) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({
  visible,
  droppedFile,
  onClose,
  onUpload,
  onFileSelect,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!droppedFile) return;
    const formData = new FormData(formRef.current!);
    await onUpload(formData, droppedFile);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible}>
      <div className="bg-white rounded-lg p-4 w-[90vw] max-w-[900px] max-h-[90vh] overflow-y-auto flex flex-col md:flex-row">
        {/* Left Column: Upload Area & Form */}
        <div className="md:w-1/2 p-4">
          <div className="sticky top-0 flex justify-between items-center bg-white pb-2 border-b">
            <h3 className="text-lg font-bold">Upload Photo</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded border px-3 py-1 text-sm"
            >
              Cancel
            </button>
          </div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                onFileSelect(e.dataTransfer.files[0]);
                try {
                  e.dataTransfer.clearData();
                } catch (err) {
                  console.warn("clearData error:", err);
                }
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-400 rounded cursor-pointer"
          >
            {droppedFile ? (
              <p className="text-sm text-gray-700">File Selected: {droppedFile.name}</p>
            ) : (
              <p className="text-sm text-gray-500">
                Drag & drop your photo here or click to select a file (Thumbnail only)
              </p>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
          <form ref={formRef} onSubmit={handleSubmit} className="mt-4">
            <label className="block text-xs font-medium mb-1">Title *</label>
            <input name="title" required className="mt-1 w-full rounded border px-2 py-1 text-xs" />
            <label className="block text-xs font-medium mt-2 mb-1">Description</label>
            <textarea name="description" className="mt-1 w-full rounded border px-2 py-1 text-xs" />
            <label className="block text-xs font-medium mt-2 mb-1">Label *</label>
            <select name="label" defaultValue="Ready for Approval" required className="mt-1 w-full rounded border px-2 py-1 text-xs">
              <option value="Approved">Approved</option>
              <option value="Needs Revision">Needs Revision</option>
              <option value="Ready for Approval">Ready for Approval</option>
              <option value="Scheduled">Scheduled</option>
            </select>
            <label className="block text-xs font-medium mt-2 mb-1">Content Type *</label>
            <select name="contentType" defaultValue="Photo" required className="mt-1 w-full rounded border px-2 py-1 text-xs">
              <option value="Photo">Photo</option>
              <option value="reel">Reel</option>
              <option value="video">Video</option>
              <option value="carousel">Carousel</option>
            </select>
            <label className="block text-xs font-medium mt-2 mb-1">Video Embed (Optional)</label>
            <input name="videoEmbed" className="mt-1 w-full rounded border px-2 py-1 text-xs" />
            <button type="submit" className="mt-4 w-full rounded bg-blue-600 px-3 py-2 text-sm text-white">
              Upload
            </button>
          </form>
        </div>

        {/* Right Column: Photo Preview */}
        <div className="md:w-1/2 p-4 flex flex-col justify-center items-center">
          <h4 className="text-sm font-bold mb-2">Photo Preview</h4>
          {droppedFile ? (
            <img
              src={URL.createObjectURL(droppedFile)}
              alt="Preview"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          ) : (
            <div className="w-full h-[80vh] flex items-center justify-center border border-dashed border-gray-300 rounded">
              <p className="text-sm text-gray-500">No photo selected</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default UploadModal;

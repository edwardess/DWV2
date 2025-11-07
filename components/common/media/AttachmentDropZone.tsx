// Put the components/AttachmentDropZone.tsx code here 
import React, { RefObject, useState } from "react";
import HashLoader from "react-spinners/HashLoader";

export interface Attachment {
  url: string;
  name: string;
}

interface AttachmentDropZoneProps {
  attachments: Attachment[];
  setAttachments: (files: Attachment[]) => void;
  inputRef: RefObject<HTMLInputElement>;
  processFiles: (files: File[], setAttachmentFn: (files: Attachment[]) => void) => Promise<void>;
}

const AttachmentDropZone: React.FC<AttachmentDropZoneProps> = ({
  attachments,
  setAttachments,
  inputRef,
  processFiles,
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = async (files: File[]) => {
    if (files && files.length > 0) {
      setIsUploading(true);
      try {
        await processFiles(Array.from(files), setAttachments);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <>
      {attachments.length < 10 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            await handleFiles(Array.from(files));
          }}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-400 rounded cursor-pointer relative"
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-4">
              <HashLoader color="#374151" size={30} />
              <p className="mt-4 text-xs text-gray-500">Uploading file...</p>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              Drag & drop attachments here (max 10, 2000MB each)
            </p>
          )}
          <input
            type="file"
            ref={inputRef}
            className="hidden"
            accept="image/*,video/*"
            multiple
            onChange={async (e) => {
              if (e.target.files && e.target.files.length > 0) {
                await handleFiles(Array.from(e.target.files));
              }
            }}
          />
        </div>
      )}
    </>
  );
};

export default AttachmentDropZone;

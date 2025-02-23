// AttachmentDropZone.tsx
import React, { RefObject } from "react";

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
}) => (
  <>
    {attachments.length > 0 && (
      <ul>
        {attachments.map((att, index) => (
          <li key={index} className="flex items-center justify-between border p-1 rounded mb-1">
            <span className="text-xs">{att.name}</span>
            <div>
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 text-xs mr-2"
              >
                Download
              </a>
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                className="text-red-500 text-xs"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    )}
    {attachments.length < 5 && (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault();
          const files = e.dataTransfer.files;
          if (files && files.length > 0) {
            await processFiles(Array.from(files), setAttachments);
          }
        }}
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-400 rounded cursor-pointer"
      >
        <p className="text-xs text-gray-500">
          Drag & drop attachments here (max 5, 300MB each)
        </p>
        <input
          type="file"
          ref={inputRef}
          className="hidden"
          accept="image/*,video/*"
          multiple
          onChange={async (e) => {
            if (e.target.files && e.target.files.length > 0) {
              await processFiles(Array.from(e.target.files), setAttachments);
            }
          }}
        />
      </div>
    )}
  </>
);

export default AttachmentDropZone;

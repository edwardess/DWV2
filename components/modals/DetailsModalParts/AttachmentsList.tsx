// Put the components/DetailsModalParts/AttachmentsList.tsx code here // AttachmentsList.tsx
import React, { useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { TrashIcon } from "@heroicons/react/24/solid";
import { Attachment } from "@/components/common/media/AttachmentDropZone"; // adjust the path if needed
import ConfirmationModal from "@/components/ui/confirmation-modal";

interface AttachmentsListProps {
  attachments: Attachment[];
  editing: boolean;
  setAttachments: (files: Attachment[]) => void;
}

const AttachmentsList: React.FC<AttachmentsListProps> = ({ attachments, editing, setAttachments }) => {
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  
  const handleDeleteAttachment = (attachment: Attachment) => {
    setAttachmentToDelete(attachment);
  };
  
  const confirmDeleteAttachment = () => {
    if (!attachmentToDelete) return;
    
    const updatedAttachments = attachments.filter(
      (a) => a.name !== attachmentToDelete.name
    );
    setAttachments(updatedAttachments);
    setAttachmentToDelete(null);
  };
  
  if (attachments && attachments.length > 0) {
    return (
      <div className="mt-2">
        <ConfirmationModal
          isOpen={!!attachmentToDelete}
          onClose={() => setAttachmentToDelete(null)}
          onConfirm={confirmDeleteAttachment}
          title="Delete Attachment"
          description={`Are you sure you want to delete "${attachmentToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
        
        <h4 className="text-sm font-bold mb-1">
          Instructional Assets For Revision (Photo or Video):
        </h4>
        <ul className="space-y-1">
          {attachments.map((att, index) => (
            <li
              key={index}
              className="flex items-center justify-between text-xs overflow-hidden bg-white rounded p-1"
            >
              <span className="flex-1 truncate" title={att.name}>
                {att.name}
              </span>
              <div className="flex-shrink-0 flex items-center gap-2">
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Download"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 text-gray-700" />
                </a>
                {editing && (
                  <button
                    onClick={() => handleDeleteAttachment(att)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4 text-red-500" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return <div className="mt-2 text-xs text-gray-500">No attached files.</div>;
};

export default AttachmentsList;

// Put the components/DetailsModalParts/RenderThirdColumn.tsx code here // RenderThirdColumn.tsx
import React, { useState } from "react";
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { ExtendedImageMeta } from "../DetailsModal";
import HashLoader from "react-spinners/HashLoader";
import ConfirmationModal from "@/components/ui/confirmation-modal";

interface RenderThirdColumnProps {
  image?: ExtendedImageMeta;
  editing: boolean;
  isUploadingPhoto: boolean;
  triggerPhotoUpload: () => void;
  isDownloading: boolean;
  handleThumbnailDownload: () => void;
}

const RenderThirdColumn: React.FC<RenderThirdColumnProps> = ({
  image,
  editing,
  isUploadingPhoto,
  triggerPhotoUpload,
  isDownloading,
  handleThumbnailDownload,
}) => {
  const [showChangePhotoConfirmation, setShowChangePhotoConfirmation] = useState(false);

  return (
    <div className="h-full w-full flex flex-col items-center justify-start">
      {/* Confirmation Modal for changing photo */}
      <ConfirmationModal
        isOpen={showChangePhotoConfirmation}
        onClose={() => setShowChangePhotoConfirmation(false)}
        onConfirm={() => {
          setShowChangePhotoConfirmation(false);
          triggerPhotoUpload();
        }}
        title="Change Thumbnail"
        description="Are you sure you want to change the thumbnail image? The current thumbnail will be replaced."
        confirmText="Change"
        cancelText="Cancel"
        type="warning"
      />

      {/* Display thumbnail photo */}
      <div className="w-full h-full flex flex-col items-center">
        {isUploadingPhoto ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <HashLoader color="#374151" size={50} />
              <p className="mt-4 text-sm text-gray-500">Uploading thumbnail...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-lg bg-gray-50">
              {image?.url ? (
                <img
                  src={image.url}
                  alt={image.title || "Thumbnail"}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <p>No thumbnail available</p>
                  {editing && (
                    <button
                      onClick={() => setShowChangePhotoConfirmation(true)}
                      className="mt-3 px-4 py-2 rounded-lg bg-gray-700 text-white text-xs flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                    >
                      <ArrowUpTrayIcon className="h-4 w-4" />
                      <span>Upload Thumbnail</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {editing && image?.url && (
              <div className="mt-4 w-full flex justify-center">
                <button
                  onClick={() => setShowChangePhotoConfirmation(true)}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white text-xs flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  <span>Change Thumbnail</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RenderThirdColumn;

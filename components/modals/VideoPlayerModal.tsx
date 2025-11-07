import React, { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  title,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-90">
      <div className="relative w-full h-full max-w-7xl max-h-screen p-4 md:p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-all text-white"
          aria-label="Close video"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        {/* Title */}
        {title && (
          <div className="absolute top-6 left-6 z-10 px-4 py-2 rounded-lg bg-black bg-opacity-50 text-white text-sm font-medium">
            {title}
          </div>
        )}

        {/* Video player */}
        <div className="w-full h-full flex items-center justify-center">
          <video
            src={videoUrl}
            controls
            autoPlay
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            style={{ maxHeight: "90vh" }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;


'use client';

import React, { useState, useCallback, useRef } from "react";
import { ArrowDownTrayIcon, ArrowUpTrayIcon, XMarkIcon, PlayIcon } from "@heroicons/react/24/outline";
import { ExtendedImageMeta } from "../DetailsModal";
import HashLoader from "react-spinners/HashLoader";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import VideoPlayerModal from "../VideoPlayerModal";

interface RenderThirdColumnProps {
  image?: ExtendedImageMeta;
  editing: boolean;
  isUploadingPhoto: boolean;
  triggerPhotoUpload: () => void;
  isDownloading: boolean;
  handleThumbnailDownload: () => void;
  onSamplesUpload?: (files: File[]) => Promise<void>;
  onSampleDelete?: (index: number, e?: React.MouseEvent) => void;
  uploadProgress?: { [key: string]: number };
}

const RenderThirdColumn: React.FC<RenderThirdColumnProps> = ({
  image,
  editing,
  isUploadingPhoto,
  triggerPhotoUpload,
  isDownloading,
  handleThumbnailDownload,
  onSamplesUpload,
  onSampleDelete,
  uploadProgress = {},
}) => {
  const [showChangePhotoConfirmation, setShowChangePhotoConfirmation] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const isDraft = image?.label === "Draft";
  const samples = image?.samples || [];

  // File validation
  const validateFile = (file: File): string | null => {
    const maxSize = 200 * 1024 * 1024; // 200MB
    const imageFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const videoFormats = ['video/mp4'];

    if (file.size > maxSize) {
      return `File "${file.name}" exceeds 200MB limit`;
    }

    if (!imageFormats.includes(file.type) && !videoFormats.includes(file.type)) {
      return `File "${file.name}" must be an image (jpg, png, gif, webp) or video (mp4)`;
    }

    return null;
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || !onSamplesUpload) return;

    const fileArray = Array.from(files);
    const currentCount = samples.length;

    if (currentCount + fileArray.length > 10) {
      alert(`Cannot upload more than 10 files. You currently have ${currentCount} files.`);
      return;
    }

    // Validate all files
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        alert(error);
        return;
      }
    }

    await onSamplesUpload(fileArray);
  }, [samples.length, onSamplesUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (!editing) return;
    handleFileSelect(e.dataTransfer.files);
  }, [editing, handleFileSelect]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (editing) {
      setIsDragging(true);
    }
  }, [editing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  const getFileType = (url: string): 'image' | 'video' => {
    return url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('video') ? 'video' : 'image';
  };

  // Draft-specific rendering
  if (isDraft) {
    if (editing) {
      return (
        <div className="h-full w-full flex flex-col">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-800">Samples | References</h4>
            <p className="text-xs text-gray-500">
              Upload images or videos (max 10 files, 200MB each)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div
            className={`flex-1 border-2 border-dashed rounded-lg transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50'
            } overflow-y-auto`}
            onDrop={handleDrop}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
          >
            {samples.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <ArrowUpTrayIcon className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag & drop files here
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  or click to browse
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-white text-xs hover:bg-gray-800 transition-colors"
                >
                  Choose Files
                </button>
                <p className="text-xs text-gray-400 mt-3">
                  Images: JPG, PNG, GIF, WEBP • Videos: MP4
                </p>
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {samples.map((sample, index) => {
                    const sampleType = sample.type || getFileType(sample.url);
                    const uploadKey = `sample-${index}`;
                    const progress = uploadProgress[uploadKey];
                    const isUploading = !sample.url || progress !== undefined;

                    return (
                      <div
                        key={index}
                        className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-sm group"
                      >
                        {isUploading ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
                            <HashLoader color="#374151" size={30} />
                            <p className="text-xs text-gray-600 mt-2">{progress ?? 0}%</p>
                          </div>
                        ) : sampleType === 'video' ? (
                          <>
                            <video
                              src={sample.url}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => window.open(sample.url, '_blank')}
                              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <PlayIcon className="h-12 w-12 text-white" />
                            </button>
                          </>
                        ) : (
                          <img
                            src={sample.url}
                            alt={`Sample ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {!isUploading && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.nativeEvent.stopImmediatePropagation();
                              onSampleDelete?.(index, e);
                              return false;
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                            className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {samples.length < 10 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 text-gray-600 text-sm hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowUpTrayIcon className="h-5 w-5" />
                    Add More Files ({samples.length}/10)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // View mode for drafts
    return (
      <>
        <VideoPlayerModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo?.url || ''}
          title={selectedVideo?.title}
        />

        <div className="h-full w-full flex flex-col">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-800">Samples | References</h4>
            <p className="text-xs text-gray-500">
              Reference materials for this draft
            </p>
          </div>

          <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
            {samples.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6">
                <p className="text-sm text-gray-500">No samples uploaded yet</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {samples.map((sample, index) => {
                  const sampleType = sample.type || getFileType(sample.url);

                  return (
                    <div
                      key={index}
                      className="relative rounded-lg overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {sampleType === 'video' ? (
                        <div
                          className="relative aspect-video cursor-pointer group"
                          onClick={() => setSelectedVideo({ url: sample.url, title: `Sample ${index + 1}` })}
                        >
                          <video
                            src={sample.url}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 group-hover:bg-opacity-50 transition-all">
                            <div className="w-16 h-16 rounded-full bg-white bg-opacity-90 flex items-center justify-center">
                              <PlayIcon className="h-8 w-8 text-gray-800 ml-1" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={sample.url}
                          alt={`Sample ${index + 1}`}
                          className="w-full object-contain"
                          style={{ maxHeight: '400px' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Original thumbnail rendering for non-Draft cards
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
                      type="button"
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
                  type="button"
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

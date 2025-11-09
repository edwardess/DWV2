"use client";

import React, { useRef, FormEvent, useState, useEffect } from "react";
import Modal from "@/components/common/modals/Modal";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";

interface MobileUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (formData: FormData, file: File, selectedDate: Date) => Promise<void>;
  projectId: string;
  currentMonth: number; // For date picker validation
  currentYear: number; // For date picker validation
}

export default function MobileUploadModal({
  visible,
  onClose,
  onUpload,
  projectId,
  currentMonth,
  currentYear,
}: MobileUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentType, setContentType] = useState<string>("Photo");
  const [videoEmbed, setVideoEmbed] = useState<string>("");

  // Initialize selected date to first day of current month/year
  useEffect(() => {
    if (visible) {
      // currentMonth is 0-indexed, so we can use it directly
      const firstDay = new Date(currentYear, currentMonth, 1);
      const dateStr = firstDay.toISOString().split("T")[0];
      setSelectedDate(dateStr);
      // Reset form state
      setContentType("Photo");
      setVideoEmbed("");
    }
  }, [visible, currentMonth, currentYear]);

  // Calculate min and max dates for the date picker
  // currentMonth is 0-indexed, so:
  // - Min: first day of currentMonth
  // - Max: last day of currentMonth (day 0 of next month)
  const minDate = new Date(currentYear, currentMonth, 1).toISOString().split("T")[0];
  const maxDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split("T")[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDroppedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!droppedFile) {
      alert("Please select a file to upload.");
      return;
    }
    if (!selectedDate) {
      alert("Please select a date for this content.");
      return;
    }

    // Validate videoEmbed for Reel and Video content types
    if ((contentType === "reel" || contentType === "video") && !videoEmbed.trim()) {
      alert(`Please enter a ${contentType === "reel" ? "Reel" : "Video"} URL.`);
      return;
    }

    const formData = new FormData(formRef.current!);
    // Add videoEmbed to form data if it exists
    if (videoEmbed.trim()) {
      formData.set("videoEmbed", videoEmbed.trim());
    }
    const dateObj = new Date(selectedDate);
    setIsSubmitting(true);
    try {
      await onUpload(formData, droppedFile, dateObj);
      // Reset form on success
      setDroppedFile(null);
      setSelectedDate(new Date(currentYear, currentMonth, 1).toISOString().split("T")[0]);
      setContentType("Photo");
      setVideoEmbed("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setDroppedFile(null);
    setSelectedDate(new Date(currentYear, currentMonth, 1).toISOString().split("T")[0]);
    setContentType("Photo");
    setVideoEmbed("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible}>
      <div className="bg-white rounded-lg p-4 w-[90vw] max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b mb-4">
          <h3 className="text-lg font-bold">Upload Content</h3>
          <button
            type="button"
            onClick={handleClose}
            className="rounded border px-3 py-1 text-sm"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Photo or Thumbnail *</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  setDroppedFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-400 rounded-lg cursor-pointer hover:border-blue-500 transition-colors"
            >
              {droppedFile ? (
                <div className="text-center">
                  <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-700 font-medium">{droppedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(droppedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <ArrowUpTrayIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Click to upload a photo</p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/mp4,video/quicktime"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium mb-2">Date *</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={minDate}
              max={maxDate}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Select a date in the current month
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              name="title"
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Enter content title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              name="description"
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm resize-none"
              placeholder="Enter description (optional)"
            />
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-medium mb-2">Status *</label>
            <select
              name="label"
              defaultValue="Ready for Approval"
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="Approved">Approved</option>
              <option value="Needs Revision">Needs Revision</option>
              <option value="Ready for Approval">Ready for Approval</option>
              <option value="Scheduled">Scheduled</option>
            </select>
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Content Type *</label>
            <select
              name="contentType"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="Photo">Photo</option>
              <option value="reel">Reel</option>
              <option value="video">Video</option>
            </select>
          </div>

          {/* Reel/Video URL Input - Dynamic */}
          {(contentType === "reel" || contentType === "video") && (
            <div>
              <label className="block text-sm font-medium mb-2">
                {contentType === "reel" ? "Reel Url" : "Video Url"} *
              </label>
              <input
                type="text"
                value={videoEmbed}
                onChange={(e) => setVideoEmbed(e.target.value)}
                placeholder="https://drive.google.com/file/d/FILE_ID/view"
                required
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported: Google Drive, YouTube, Vimeo, DailyMotion, Twitch
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !droppedFile}
            className="w-full rounded bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>
    </Modal>
  );
}


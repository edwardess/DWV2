"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import Modal from "@/components/common/modals/Modal";

interface MobileDraftModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateDraft: (formData: FormData, script: string, selectedDate: Date) => Promise<void>;
  currentMonth: number; // 0-indexed
  currentYear: number;
}

export default function MobileDraftModal({
  visible,
  onClose,
  onCreateDraft,
  currentMonth,
  currentYear,
}: MobileDraftModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [script, setScript] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Initialize selected date to first day of current month/year
  useEffect(() => {
    if (visible) {
      // currentMonth is 0-indexed, so we can use it directly
      const firstDay = new Date(currentYear, currentMonth, 1);
      const dateStr = firstDay.toISOString().split("T")[0];
      setSelectedDate(dateStr);
    }
  }, [visible, currentMonth, currentYear]);

  // Calculate min and max dates for the date picker
  // currentMonth is 0-indexed, so:
  // - Min: first day of currentMonth
  // - Max: last day of currentMonth (day 0 of next month)
  const minDate = new Date(currentYear, currentMonth, 1).toISOString().split("T")[0];
  const maxDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split("T")[0];

  useEffect(() => {
    if (!visible) {
      formRef.current?.reset();
      setScript("");
      // Reset date to first day of current month
      const firstDay = new Date(currentYear, currentMonth, 1);
      const dateStr = firstDay.toISOString().split("T")[0];
      setSelectedDate(dateStr);
    }
  }, [visible, currentMonth, currentYear]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!formRef.current) return;

    if (!selectedDate) {
      alert("Please select a date for this draft.");
      return;
    }

    const formData = new FormData(formRef.current);
    const dateObj = new Date(selectedDate);
    setIsSubmitting(true);
    try {
      await onCreateDraft(formData, script, dateObj);
      onClose();
    } catch (error) {
      console.error("Error creating draft:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    // Reset date to first day of current month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const dateStr = firstDay.toISOString().split("T")[0];
    setSelectedDate(dateStr);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible}>
      <div className="bg-white rounded-lg p-4 w-[90vw] max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b mb-4">
          <h3 className="text-lg font-bold">Create Draft</h3>
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
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Title / Idea *
            </label>
            <input
              id="title"
              name="title"
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Enter draft title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm resize-none"
              placeholder="Add a description for this draft (optional)"
            />
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Content Type *
            </label>
            <select
              id="contentType"
              name="contentType"
              defaultValue="Photo"
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="Photo">Photo</option>
              <option value="reel">Reel</option>
              <option value="carousel">Carousel</option>
              <option value="video">Video</option>
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Date *
            </label>
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

          {/* Script (Simple Textarea) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Script
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={10}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm resize-none"
              placeholder="Enter your script or content idea (optional)"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full rounded bg-gray-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Draft"}
          </button>
        </form>
      </div>
    </Modal>
  );
}


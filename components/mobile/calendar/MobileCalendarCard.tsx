"use client";

import React, { useRef, useState } from "react";
import HashLoader from "react-spinners/HashLoader";
import Image from "next/image";

interface MobileCalendarCardProps {
  id: string;
  url: string;
  title?: string;
  label?: string; // Status: "Approved", "Draft", "Needs Revision", etc.
  contentType?: string;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: () => void;
  inTransit?: boolean; // Show loading spinner
  onTouchStart?: (touch: Touch) => void;
  isDragging?: boolean;
}

// Status circle color mapping
const getStatusColor = (label?: string): string => {
  if (!label) return "bg-gray-400";
  
  const labelLower = label.toLowerCase();
  if (labelLower === "approved") return "bg-green-500";
  if (labelLower === "draft") return "bg-amber-500";
  if (labelLower === "needs revision") return "bg-red-500";
  if (labelLower === "ready for approval") return "bg-blue-500";
  if (labelLower === "scheduled") return "bg-purple-500";
  
  return "bg-gray-400";
};

export default function MobileCalendarCard({
  id,
  url,
  title,
  label,
  contentType,
  onDragStart,
  onClick,
  inTransit = false,
  onTouchStart,
  isDragging = false,
}: MobileCalendarCardProps) {
  const statusColor = getStatusColor(label);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isDragMode, setIsDragMode] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    // Prevent image drag (browsers try to drag the image itself)
    e.stopPropagation();
    
    // Set data in multiple formats for better mobile browser compatibility
    try {
      e.dataTransfer.setData("imageId", id);
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.dropEffect = "move";
    } catch (error) {
      console.error("❌ Error setting drag data:", error);
    }
    
    console.log("🟣 MobileCalendarCard dragStart - imageId:", id);
    
    // Call parent handler if provided
    onDragStart(e, id);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    hasMovedRef.current = false;
    setIsDragMode(false);
    
    // Start long-press timer (500ms like Android)
    longPressTimerRef.current = setTimeout(() => {
      // After 500ms, activate drag mode
      setIsDragMode(true);
      hasMovedRef.current = true; // Mark as "moved" to prevent click
      
      // Vibrate if supported (haptic feedback)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Notify parent to start drag
      if (onTouchStart) {
        onTouchStart(touch);
      }
    }, 500);
    
    // Prevent context menu on long press
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
    
    // If moved more than 10px before long-press completes, cancel the timer
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
    
    // Once drag mode is active, ALWAYS prevent scrolling
    if (isDragMode) {
      hasMovedRef.current = true;
      e.preventDefault(); // Prevent scrolling during drag
      e.stopPropagation(); // Stop event from bubbling to parent scroll handlers
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Clear the long-press timer if still running
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    const wasQuickTap = !hasMovedRef.current && !isDragMode;
    
    touchStartPosRef.current = null;
    hasMovedRef.current = false;
    setIsDragMode(false);
    
    // If it was a quick tap, allow onClick to fire
    if (wasQuickTap) {
      // Click will fire naturally
      onClick();
    } else {
      // Was a drag, prevent click
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      draggable={false}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 ${
        isDragMode ? "cursor-grabbing" : "cursor-pointer"
      } active:opacity-75 transition-opacity border border-gray-200 ${
        isDragging ? "opacity-0" : ""
      }`}
      style={{ 
        touchAction: isDragMode ? "none" : "pan-y",
        userSelect: "none",
        WebkitUserSelect: "none"
      }}
    >
      {/* Status Indicator Circle - Top Center */}
      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 z-10">
        <div className={`w-3 h-3 rounded-full ${statusColor} border-2 border-white shadow-sm`} />
      </div>

      {/* Image */}
      <div className="relative w-full h-full">
        <Image
          src={url}
          alt={title || "Content"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 33vw, 100px"
          draggable={false}
        />
      </div>

      {/* Loading Spinner Overlay */}
      {inTransit && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <HashLoader color="#ffffff" size={24} />
        </div>
      )}
    </div>
  );
}


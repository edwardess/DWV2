"use client";

import React, { useRef } from "react";
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
    
    // Prevent default to avoid scrolling while dragging
    e.preventDefault();
    
    if (onTouchStart) {
      onTouchStart(touch);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
    
    // If moved more than 10px, consider it a drag
    if (deltaX > 10 || deltaY > 10) {
      hasMovedRef.current = true;
      // Prevent scrolling while dragging
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Only trigger click if it wasn't a drag (no significant movement)
    // The parent's global touchend handler will handle drops
    // This local handler only handles taps (clicks without movement)
    const wasClick = !hasMovedRef.current;
    
    touchStartPosRef.current = null;
    hasMovedRef.current = false;
    
    // Only call onClick if it was a tap, not a drag
    // Use requestAnimationFrame to ensure parent's touchend runs first
    if (wasClick) {
      requestAnimationFrame(() => {
        // Double-check that we're not dragging (parent might have set draggedCardId)
        if (!isDragging) {
          onClick();
        }
      });
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onClick}
      className={`relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-move active:opacity-75 transition-opacity border border-gray-200 ${
        isDragging ? "opacity-50 scale-95" : ""
      }`}
      style={{ touchAction: "none" }}
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


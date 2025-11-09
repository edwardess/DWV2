"use client";

import React from "react";
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
}: MobileCalendarCardProps) {
  const statusColor = getStatusColor(label);

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

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-move active:opacity-75 transition-opacity border border-gray-200"
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


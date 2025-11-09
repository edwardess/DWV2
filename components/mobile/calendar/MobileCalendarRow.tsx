"use client";

import React, { useState, useEffect } from "react";
import MobileCalendarCard from "./MobileCalendarCard";
import { ImageMeta } from "@/components/pages/DemoWrapper";

interface MobileCalendarRowProps {
  day: number;
  month: number;
  year: number;
  cards: Array<{ id: string; url: string }>;
  imageMetadata: { [id: string]: ImageMeta };
  onCardClick: (id: string) => void;
  onDrop: (imageId: string) => Promise<void>;
  maxCards: number; // Strict limit: 3 cards maximum
  isDragOver?: boolean; // For visual feedback
  cardsInTransit?: Set<string>; // For loading spinners
  draggedCardId?: string | null;
  hoveredRowKey?: string | null;
  onTouchStart?: (id: string, touch: Touch) => void;
}

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function MobileCalendarRow({
  day,
  month,
  year,
  cards,
  imageMetadata,
  onCardClick,
  onDrop,
  maxCards = 3,
  cardsInTransit = new Set(),
  draggedCardId = null,
  hoveredRowKey = null,
  onTouchStart,
}: MobileCalendarRowProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isTouchOver, setIsTouchOver] = useState(false);

  const isFull = cards.length >= maxCards;
  const dateKey = `${year}-${month}-${day}`;

  // Check if this row is hovered during touch drag
  useEffect(() => {
    setIsTouchOver(hoveredRowKey === dateKey);
  }, [hoveredRowKey, dateKey]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if row is full
    if (isFull) {
      e.dataTransfer.effectAllowed = "none";
      setIsDragOver(false);
      return;
    }
    
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Check if row is full
    if (isFull) {
      return;
    }

    // Try multiple methods to get imageId (mobile browsers sometimes have issues with dataTransfer)
    let imageId = e.dataTransfer.getData("imageId");
    
    // Fallback: try text/plain format
    if (!imageId) {
      const textData = e.dataTransfer.getData("text/plain");
      try {
        const parsed = JSON.parse(textData);
        imageId = parsed.id || parsed.imageId;
      } catch {
        // If parsing fails, use textData as-is if it looks like an ID
        if (textData && textData.length > 10) {
          imageId = textData;
        }
      }
    }
    
    console.log("🟡 MobileCalendarRow handleDrop:", { imageId, day, month, year });
    console.log("🟡 dataTransfer types:", e.dataTransfer.types);
    console.log("🟡 dataTransfer items:", e.dataTransfer.items?.length);
    
    if (imageId && imageId.trim() !== "") {
      await onDrop(imageId);
    } else {
      console.error("❌ No imageId found in dataTransfer");
    }
  };

  return (
    <div
      data-row-key={dateKey}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full mb-3 rounded-lg border border-gray-300 bg-white flex items-stretch transition-colors ${
        isFull
          ? "opacity-60 cursor-not-allowed"
          : isDragOver || isTouchOver
          ? "border-blue-400 bg-blue-50"
          : "hover:border-gray-400"
      }`}
    >
      {/* Left Side: Date Label Box */}
      <div className="flex-shrink-0 w-20 md:w-24 rounded-l-lg bg-gray-50 border-r border-gray-300 flex flex-col items-center justify-center p-2">
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-800 leading-tight">
            {monthNames[month]}
          </div>
          <div className="text-lg font-bold text-gray-900 leading-tight">
            {day}
          </div>
          <div className="text-xs text-gray-600 leading-tight">
            {year}
          </div>
        </div>
      </div>

      {/* Right Side: Cards Container */}
      <div
        className={`flex-1 rounded-r-lg p-2 min-h-[80px] flex items-center relative ${
          cards.length === 0 ? "justify-center" : "justify-start"
        } ${isFull ? "bg-gray-50" : "bg-white"}`}
      >
        {/* Drop Zone Indicator */}
        {isTouchOver && !isFull && draggedCardId && (
          <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-blue-400 bg-blue-50/50 rounded-lg z-10 transition-opacity duration-200">
            <span className="text-blue-600 font-medium text-sm">drop here</span>
          </div>
        )}
        
        {cards.length === 0 ? (
          // Empty state
          <div className="text-gray-400 text-sm">empty</div>
        ) : (
          // Cards horizontal layout
          <div className="flex gap-2 w-full">
            {cards.map((card) => {
              const metadata = imageMetadata[card.id];
              // Calculate card width dynamically based on number of cards
              // For 1 card: ~100% width, for 2 cards: ~50% each, for 3 cards: ~33% each
              // Account for gaps: (cards.length - 1) * 8px (gap-2 = 0.5rem = 8px)
              const gapCount = cards.length > 1 ? cards.length - 1 : 0;
              const gapTotal = gapCount * 8; // 8px per gap
              const cardWidth = cards.length === 1 
                ? '100%' 
                : `calc((100% - ${gapTotal}px) / ${cards.length})`;
              
              return (
                <div 
                  key={card.id} 
                  className="flex-shrink-0" 
                  style={{ width: cardWidth, maxWidth: 'calc(33.333% - 6px)' }}
                >
                  <MobileCalendarCard
                    id={card.id}
                    url={card.url}
                    title={metadata?.title}
                    label={metadata?.label}
                    contentType={metadata?.contentType}
                    onDragStart={() => {}}
                    onClick={() => onCardClick(card.id)}
                    inTransit={cardsInTransit.has(card.id)}
                    onTouchStart={onTouchStart ? (touch) => onTouchStart(card.id, touch) : undefined}
                    isDragging={draggedCardId === card.id}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

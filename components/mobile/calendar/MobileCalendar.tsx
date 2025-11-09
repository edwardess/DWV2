"use client";

import React, { useMemo } from "react";
import MobileCalendarRow from "./MobileCalendarRow";
import { ImageMeta } from "@/components/pages/DemoWrapper";
import { type SocialMediaInstance } from "@/components/ui/social-media-switch";

interface MobileCalendarProps {
  month: number;
  year: number;
  droppedImages: { [date: string]: Array<{ id: string; url: string }> };
  imageMetadata: { [id: string]: ImageMeta };
  onCardClick: (id: string) => void;
  onCardDrop: (day: number, month: number, year: number, imageId: string) => Promise<void>;
  activeInstance: SocialMediaInstance;
  cardsInTransit?: Set<string>; // For showing loading spinners
  draggedCardId?: string | null;
  hoveredRowKey?: string | null;
  onTouchStart?: (id: string, touch: Touch) => void;
}

export default function MobileCalendar({
  month,
  year,
  droppedImages,
  imageMetadata,
  onCardClick,
  onCardDrop,
  activeInstance,
  cardsInTransit = new Set(),
  draggedCardId = null,
  hoveredRowKey = null,
  onTouchStart,
}: MobileCalendarProps) {
  // Use droppedImages directly - filtering by instance is done in parent component
  // when loading from Firestore, so all images here are for the active instance
  const filteredDroppedImages = droppedImages;

  // Generate days for the current month
  const monthDays = useMemo(() => {
    const days: Array<{ day: number; month: number; year: number }> = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, month, year });
    }
    
    return days;
  }, [month, year]);

  const handleDrop = async (day: number, month: number, year: number, imageId: string) => {
    await onCardDrop(day, month, year, imageId);
  };

  return (
    <div className="w-full px-4 py-4">
      {monthDays.map(({ day, month, year }) => {
        const dateKey = `${year}-${month}-${day}`;
        const cards = filteredDroppedImages[dateKey] || [];
        
        // Only render rows that have cards or are in the future (optional: can filter to only show days with content)
        return (
          <MobileCalendarRow
            key={dateKey}
            day={day}
            month={month}
            year={year}
            cards={cards}
            imageMetadata={imageMetadata}
            onCardClick={onCardClick}
            onDrop={(imageId) => handleDrop(day, month, year, imageId)}
            maxCards={3}
            cardsInTransit={cardsInTransit}
            draggedCardId={draggedCardId}
            hoveredRowKey={hoveredRowKey}
            onTouchStart={onTouchStart}
          />
        );
      })}
    </div>
  );
}


"use client";

// Put the components/ContentPool.tsx code here 

// ContentPool.tsx
import React from "react";
import { Squares2X2Icon, ListBulletIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { VirtualizedList } from "../VirtualizedList";
import ContentPoolImage from "./ContentPoolImage";

interface ContentPoolProps {
  poolViewMode: "full" | "list";
  setPoolViewMode: (mode: "full" | "list") => void;
  onUpload: () => void;
  renderPoolImages: () => React.ReactNode;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  className?: string;
  items?: Array<{
    id: string;
    url: string;
    title?: string;
    label?: string;
    onEdit?: () => void;
    inTransit?: boolean;
  }>;
}

const ContentPool: React.FC<ContentPoolProps> = ({
  poolViewMode,
  setPoolViewMode,
  onUpload,
  renderPoolImages,
  onDragOver,
  onDrop,
  className = "",
  items = []
}) => {
  // Calculate item heights based on view mode
  const itemHeight = poolViewMode === "full" ? 300 : 80;
  
  // Calculate container height based on available space
  const containerHeight = typeof window !== 'undefined' ? window.innerHeight - 200 : 600;

  const renderVirtualizedItem = (item: ContentPoolProps['items'][0], index: number) => {
    return (
      <ContentPoolImage
        key={item.id}
        id={item.id}
        src={item.url}
        alt={item.title || "Pool Content"}
        label={item.label}
        title={item.title}
        onEdit={item.onEdit}
        isListView={poolViewMode === "list"}
        inTransit={item.inTransit}
      />
    );
  };
  
  return (
    <div
      className={`w-full h-full mt-4 flex flex-col gap-4 p-4 border border-dashed border-gray-300 rounded-lg bg-white overflow-hidden ${className}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button
        onClick={onUpload}
        className="mb-2 rounded bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:from-[#0467a0] hover:to-[#7abaff] cursor-pointer flex items-center justify-center"
      >
        <CloudArrowUpIcon className="h-5 w-5 mr-2" />
        Upload Content
      </button>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-black">Content Library</h2>
        <div className="flex gap-2">
          <Squares2X2Icon
            onClick={() => setPoolViewMode("full")}
            className={`h-6 w-6 cursor-pointer ${poolViewMode === "full" ? "text-blue-600" : "text-gray-400"}`}
            title="Full View"
          />
          <ListBulletIcon
            onClick={() => setPoolViewMode("list")}
            className={`h-6 w-6 cursor-pointer ${poolViewMode === "list" ? "text-blue-600" : "text-gray-400"}`}
            title="List View"
          />
        </div>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center text-gray-500">
          <p className="mb-2">No content in the pool</p>
          <p className="text-sm">Click "Upload Content" to add new content</p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <VirtualizedList
            items={items}
            renderItem={renderVirtualizedItem}
            itemHeight={itemHeight}
            containerHeight={containerHeight}
            overscan={2}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};

export default ContentPool;

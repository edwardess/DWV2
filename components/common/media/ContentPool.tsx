"use client";

// Put the components/ContentPool.tsx code here 

// ContentPool.tsx
import React from "react";
import { Squares2X2Icon, ListBulletIcon, CloudArrowUpIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { VirtualizedList } from "../VirtualizedList";
import ContentPoolImage from "./ContentPoolImage";

interface ContentPoolProps {
  poolViewMode: "full" | "list";
  setPoolViewMode: (mode: "full" | "list") => void;
  onUpload: () => void;
  onCreateDraft?: () => void;
  onRefresh?: () => void;
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
  onCreateDraft,
  onRefresh,
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

  const renderVirtualizedItem = (item: typeof items[number], index: number) => {
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
      <div className="flex flex-wrap gap-2">
      <button
        onClick={onUpload}
          className="rounded bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 cursor-pointer flex items-center justify-center"
      >
        <CloudArrowUpIcon className="h-5 w-5 mr-2" />
        Upload Content
      </button>
        {onCreateDraft && (
          <button
            onClick={onCreateDraft}
            className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 cursor-pointer flex items-center justify-center"
          >
            <PencilSquareIcon className="h-5 w-5 mr-2" />
            Create Draft
          </button>
        )}
      </div>
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
          {onRefresh && (
            <div title="Refresh Content">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                onClick={onRefresh}
                className="h-6 w-6 cursor-pointer text-gray-400 hover:text-blue-600"
                aria-label="Refresh Content"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </div>
          )}
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

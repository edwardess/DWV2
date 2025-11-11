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
  draggedCardId?: string | null;
  onDragStart?: (id: string) => void;
  panelWidth?: number;
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
  draggedCardId = null,
  onDragStart,
  panelWidth = 240,
  items = []
}) => {
  const isNarrow = panelWidth <= 140;
  
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
        isDragging={draggedCardId === item.id}
        onDragStartCallback={onDragStart}
      />
    );
  };
  
  return (
    <div
      className={`w-full h-full mt-4 flex flex-col ${isNarrow ? 'gap-2' : 'gap-4'} ${isNarrow ? 'p-2' : 'p-4'} border border-dashed border-gray-300 rounded-lg bg-white overflow-hidden ${className}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{ minWidth: 0, maxWidth: '100%' }}
    >
      <div className={`flex ${isNarrow ? 'flex-col' : 'flex-wrap'} ${isNarrow ? 'gap-1' : 'gap-2'} min-w-0`}>
      <button
        onClick={onUpload}
          className={`rounded bg-gray-700 ${isNarrow ? 'px-2 py-1.5' : 'px-4 py-2'} ${isNarrow ? 'text-xs' : 'text-sm'} font-semibold text-white hover:bg-gray-800 cursor-pointer flex items-center justify-center ${isNarrow ? 'w-full' : ''} min-w-0 flex-shrink-0`}
      >
        <CloudArrowUpIcon className={`${isNarrow ? 'h-4 w-4' : 'h-5 w-5'} ${isNarrow ? '' : 'mr-2'} flex-shrink-0`} />
        {!isNarrow && <span className="truncate">Upload Content</span>}
      </button>
        {onCreateDraft && (
          <button
            onClick={onCreateDraft}
            className={`rounded bg-amber-600 ${isNarrow ? 'px-2 py-1.5' : 'px-4 py-2'} ${isNarrow ? 'text-xs' : 'text-sm'} font-semibold text-white hover:bg-amber-700 cursor-pointer flex items-center justify-center ${isNarrow ? 'w-full' : ''} min-w-0 flex-shrink-0`}
          >
            <PencilSquareIcon className={`${isNarrow ? 'h-4 w-4' : 'h-5 w-5'} ${isNarrow ? '' : 'mr-2'} flex-shrink-0`} />
            {!isNarrow && <span className="truncate">Create Draft</span>}
          </button>
        )}
      </div>
      <div className={`flex items-center justify-between ${isNarrow ? 'mb-2' : 'mb-4'} min-w-0`}>
        <h2 className={`${isNarrow ? 'text-sm' : 'text-lg'} font-semibold text-black truncate min-w-0`}>Content Library</h2>
        <div className={`flex ${isNarrow ? 'gap-1' : 'gap-2'}`}>
          <Squares2X2Icon
            onClick={() => setPoolViewMode("full")}
            className={`${isNarrow ? 'h-4 w-4' : 'h-6 w-6'} cursor-pointer ${poolViewMode === "full" ? "text-blue-600" : "text-gray-400"}`}
            title="Full View"
          />
          <ListBulletIcon
            onClick={() => setPoolViewMode("list")}
            className={`${isNarrow ? 'h-4 w-4' : 'h-6 w-6'} cursor-pointer ${poolViewMode === "list" ? "text-blue-600" : "text-gray-400"}`}
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
                className={`${isNarrow ? 'h-4 w-4' : 'h-6 w-6'} cursor-pointer text-gray-400 hover:text-blue-600`}
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

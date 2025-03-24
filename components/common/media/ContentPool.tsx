// Put the components/ContentPool.tsx code here 

// ContentPool.tsx
import React from "react";
import { Squares2X2Icon, ListBulletIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";

interface ContentPoolProps {
  poolViewMode: "full" | "list";
  setPoolViewMode: (mode: "full" | "list") => void;
  onUpload: () => void;
  renderPoolImages: () => React.ReactNode;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

const ContentPool: React.FC<ContentPoolProps> = ({
  poolViewMode,
  setPoolViewMode,
  onUpload,
  renderPoolImages,
  onDragOver,
  onDrop,
}) => {
  return (
    <div
      className="w-64 h-full mt-4 flex flex-col gap-4 p-4 border border-dashed border-gray-300 rounded-lg bg-white overflow-y-auto"
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
      {renderPoolImages()}
    </div>
  );
};

export default ContentPool;

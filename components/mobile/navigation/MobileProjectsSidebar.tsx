"use client";

import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface Project {
  id: string;
  name: string;
  createdAt?: any;
}

interface MobileProjectsSidebarProps {
  visible: boolean;
  projects: Project[];
  activeProjectId: string;
  onProjectSelect: (projectId: string) => void;
  onClose: () => void;
}

export default function MobileProjectsSidebar({
  visible,
  projects,
  activeProjectId,
  onProjectSelect,
  onClose,
}: MobileProjectsSidebarProps) {
  if (!visible) return null;

  const handleProjectClick = (projectId: string) => {
    onProjectSelect(projectId);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Projects</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No projects available
              </div>
            ) : (
              <div className="p-2">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectClick(project.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors ${
                      project.id === activeProjectId
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


// Put the components/Sidebar.tsx code here 
"use client";
import React, { useState, useRef, useEffect } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/components/services/AuthProvider";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/components/services/firebaseService";
import { useSnack } from "@/components/common/feedback/Snackbar";

export interface ProjectUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface SidebarProps {
  onProjectSelect: (projectId: string) => void;
  onOpenProjectCreation: (user: ProjectUser) => void;
  onAddMember: (user: ProjectUser) => Promise<void>;
  projects: { id: string; name: string; createdAt?: any }[];
  activeProjectId?: string;
  activeProjectMembers?: ProjectUser[];
  onToggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onProjectSelect,
  onOpenProjectCreation,
  onAddMember,
  projects = [],
  activeProjectId,
  activeProjectMembers = [],
  onToggleSidebar,
}) => {
  const { user, logout } = useAuth();
  const { createSnack } = useSnack();
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);
  // Inline project settings popover:
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  // For "Add Member" inside the inline popover:
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResults, setSearchResults] = useState<ProjectUser[]>([]);
  const projectSettingsRef = useRef<HTMLDivElement>(null);
  const globalSettingsRef = useRef<HTMLDivElement>(null);

  const handleSearch = async () => {
    if (!searchEmail) return;
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", searchEmail));
      const querySnapshot = await getDocs(q);
      const results: ProjectUser[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          uid: data.uid,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
        });
      });
      if (results.length === 0) {
        createSnack("No match found", "error");
      }
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
      createSnack("Error searching users", "error");
    }
  };

  // Close inline project settings popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        projectSettingsRef.current &&
        !projectSettingsRef.current.contains(event.target as Node)
      ) {
        setProjectSettingsOpen(false);
      }
    };
    if (projectSettingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [projectSettingsOpen]);

  // Close global settings popover when clicking outside
  useEffect(() => {
    const handleGlobalClickOutside = (event: MouseEvent) => {
      if (
        globalSettingsRef.current &&
        !globalSettingsRef.current.contains(event.target as Node)
      ) {
        setGlobalSettingsOpen(false);
      }
    };
    if (globalSettingsOpen) {
      document.addEventListener("mousedown", handleGlobalClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleGlobalClickOutside);
  }, [globalSettingsOpen]);

  // Sort projects by createdAt (oldest first)
  const sortedProjects = [...projects].sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return a.createdAt.toMillis() - b.createdAt.toMillis();
  });

  return (
    <div className="relative w-64 h-full p-4 border-r border-gray-300 flex flex-col">
      {/* Header with Logo and Sidebar Toggle */}
      <div className="flex items-start justify-between mb-4">
        <img src="/DWV2.png" alt="Logo" className="w-40" />
        <button onClick={onToggleSidebar} className="p-1">
          {/* You can add a toggle icon here if desired */}
        </button>
      </div>
      {/* Projects List */}
      <div className="mt-2 flex-1 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2">Your Projects</h3>
        {sortedProjects.length === 0 ? (
          <p className="text-sm text-gray-500">No projects yet.</p>
        ) : (
          sortedProjects.map((project) => {
            const isActive = project.id === activeProjectId;
            if (isActive) {
              return (
                <div key={project.id} className="relative">
                  <button
                    onClick={() => onProjectSelect(project.id)}
                    className="flex items-center justify-between text-left p-2 rounded w-full mb-1 bg-gray-700 text-white"
                  >
                    <span>{project.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectSettingsOpen((prev) => !prev);
                      }}
                      className="p-1 rounded-full bg-gray-600 hover:bg-gray-500"
                    >
                      <Cog6ToothIcon className="h-4 w-4 text-white" />
                    </button>
                  </button>
                  {projectSettingsOpen && (
                    <div
                      ref={projectSettingsRef}
                      className="absolute left-0 mt-1 w-56 p-4 bg-white border border-gray-300 rounded shadow-lg z-10"
                    >
                      {/* Current Members List */}
                      <div>
                        <p className="text-sm font-semibold mb-1">Current Members:</p>
                        {activeProjectMembers.length > 0 ? (
                          activeProjectMembers.map((member) => (
                            <div key={member.uid} className="flex items-center gap-2 mb-1">
                            
                              <span className="text-xs">{member.email}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-500">No members yet.</p>
                        )}
                      </div>
                      <hr className="my-2" />
                      {/* Add Member Section */}
                      <div>
                        <label className="block text-xs mb-1 font-medium">
                          Add Member by Email
                        </label>
                        <input
                          type="email"
                          placeholder="Email"
                          value={searchEmail}
                          onChange={(e) => setSearchEmail(e.target.value)}
                          className="border p-1 rounded w-full text-xs mb-2"
                        />
                        <button
                          onClick={handleSearch}
                          className="bg-blue-500 text-white text-xs p-1 rounded w-full"
                        >
                          Search
                        </button>
                        {searchResults.map((result) => (
                          <div
                            key={result.uid}
                            className="flex items-center justify-between border p-1 mt-2 rounded"
                          >
                            <span className="text-xs">{result.email}</span>
                            <button
                              onClick={async () => {
                                await onAddMember(result);
                                createSnack("Member successfully added", "success");
                                setSearchResults([]);
                                setSearchEmail("");
                              }}
                              className="bg-green-500 text-white text-xs p-1 rounded"
                            >
                              +
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            } else {
              return (
                <button
                  key={project.id}
                  onClick={() => onProjectSelect(project.id)}
                  className="text-left p-2 rounded w-full mb-1 hover:bg-gray-200 text-gray-600"
                >
                  {project.name}
                </button>
              );
            }
          })
        )}
      </div>
      {/* Global User Profile and Sign Out */}
      <div className="absolute bottom-4 left-4">
        <button
          onClick={() => setGlobalSettingsOpen((prev) => !prev)}
          className="p-2 rounded-full bg-gray-200 hover:bg-gray-300"
        >
          <Cog6ToothIcon className="h-6 w-6 text-gray-600" />
        </button>
        {globalSettingsOpen && (
          <div
            ref={globalSettingsRef}
            className="absolute bottom-16 left-4 w-56 p-4 bg-white border border-gray-300 rounded shadow-lg"
          >
            <div>
              <label className="block text-xs mb-1 font-medium">
                Create a new project
              </label>
              <input
                type="email"
                placeholder="Email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="border p-1 rounded w-full text-xs mb-2"
              />
              <button
                onClick={handleSearch}
                className="bg-blue-500 text-white text-xs p-1 rounded w-full"
              >
                Search
              </button>
            </div>
            {searchResults.map((result) => (
              <div
                key={result.uid}
                className="flex items-center justify-between border p-1 mt-2 rounded"
              >
                <span className="text-xs">{result.email}</span>
                <button
                  onClick={() => onOpenProjectCreation(result)}
                  className="bg-green-500 text-white text-xs p-1 rounded"
                >
                  +
                </button>
              </div>
            ))}
            <div className="mt-4 flex items-center">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="h-8 w-8 rounded-full mr-2"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-400 mr-2 flex items-center justify-center text-white text-xs">
                  {user?.displayName ? user.displayName.charAt(0) : "U"}
                </div>
              )}
              <span className="text-xs font-medium">
                {user?.displayName || user?.email}
              </span>
            </div>
            <button
              onClick={logout}
              className="mt-2 bg-red-500 text-white text-xs p-1 rounded w-full"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;

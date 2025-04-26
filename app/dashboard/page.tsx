"use client";
import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/components/services/AuthProvider";
import DemoWrapper from "@/components/pages/DemoWrapper";
import Sidebar from "@/components/pages/DemoWrapper/Sidebar";
import ProjectCreationModal from "@/components/modals/ProjectCreationModal";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/components/services/firebaseService";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  createdAt?: any;
}

function DashboardContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // The list of projects the user has access to
  const [projects, setProjects] = useState<Project[]>([]);
  // The ID of the currently selected/active project
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    // Try to get the last selected project from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem("selectedProjectId") || "";
    }
    return "";
  });
  // The members of the active project
  const [activeProjectMembers, setActiveProjectMembers] = useState<any[]>([]);
  // For creating new projects via the global settings popover
  const [projectCreationModalVisible, setProjectCreationModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  } | null>(null);
  // State to control sidebar visibility
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(() => {
    // Try to get the saved preference from localStorage
    if (typeof window !== 'undefined') {
      const savedPreference = localStorage.getItem("sidebarVisible");
      // If there's a saved preference, use it; otherwise default to true
      return savedPreference !== null ? savedPreference === "true" : true;
    }
    return true;
  });

  // Redirect to sign in if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  // Load projects for the current user from Firestore, sorted by createdAt (oldest first)
  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, "projects"),
        where("memberIds", "array-contains", user.uid),
        orderBy("createdAt", "asc")
      );
      getDocs(q)
        .then((querySnapshot) => {
          const loadedProjects: Project[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().projectName,
            createdAt: doc.data().createdAt,
          }));
          setProjects(loadedProjects);
          
          // If we have a previously selected project ID from localStorage,
          // check if it's still in the user's projects
          const savedProjectId = activeProjectId;
          if (savedProjectId) {
            // Check if the saved project is in the user's current projects
            const projectExists = loadedProjects.some(p => p.id === savedProjectId);
            if (projectExists) {
              // If project still exists, keep using it
              setActiveProjectId(savedProjectId);
            } else if (loadedProjects.length > 0) {
              // If saved project no longer exists but user has projects, select first one
              setActiveProjectId(loadedProjects[0].id);
              // Update localStorage with the new selection
              localStorage.setItem("selectedProjectId", loadedProjects[0].id);
            } else {
              // If user has no projects, clear the active project
              setActiveProjectId("");
              localStorage.removeItem("selectedProjectId");
            }
          } else if (loadedProjects.length > 0 && !activeProjectId) {
            // If no previously selected project, select the first one
            setActiveProjectId(loadedProjects[0].id);
          }
        })
        .catch((error) => {
          console.error("Error loading projects:", error);
        });
    }
  }, [user]);

  // Listen to changes on the active project to update members list
  useEffect(() => {
    if (activeProjectId) {
      const projectRef = doc(db, "projects", activeProjectId);
      const unsub = onSnapshot(projectRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setActiveProjectMembers(data.members || []);
        } else {
          setActiveProjectMembers([]);
        }
      });
      return () => unsub();
    }
  }, [activeProjectId]);

  // Called when the user clicks "+" beside a searched email (for project creation)
  const handleOpenProjectCreation = (member: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  }) => {
    setSelectedMember(member);
    setProjectCreationModalVisible(true);
  };

  // Called when a project is created via the modal
  const handleProjectCreated = (projectId: string, projectName: string) => {
    const newProject = { id: projectId, name: projectName };
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(projectId);
  };

  // Called when a project is clicked in the sidebar
  const handleProjectSelect = (projectId: string) => {
    console.log("Project selected:", projectId);
    setActiveProjectId(projectId);
  };

  // Called when adding a member via the inline project settings popover
  const handleAddMember = async (newMember: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  }) => {
    if (!activeProjectId) return;
    try {
      const projectRef = doc(db, "projects", activeProjectId);
      await updateDoc(projectRef, {
        members: arrayUnion(newMember),
        memberIds: arrayUnion(newMember.uid),
      });
      console.log("Member successfully added:", newMember.email);
    } catch (error) {
      console.error("Error adding member:", error);
    }
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => setSidebarVisible((prev) => !prev);

  // When sidebarVisible changes, update localStorage
  useEffect(() => {
    localStorage.setItem("sidebarVisible", sidebarVisible.toString());
  }, [sidebarVisible]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <div className="inline-block rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-gray-600">Loading your projects...</p>
      </div>
    </div>
  );
  if (!user) return null;

  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <div className="flex h-screen">
      {/* Sidebar Container with smooth slide animation */}
      <div
        className={`transition-transform duration-300 ${
          sidebarVisible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          onProjectSelect={handleProjectSelect}
          onOpenProjectCreation={handleOpenProjectCreation}
          onAddMember={handleAddMember}
          projects={projects}
          activeProjectId={activeProjectId}
          activeProjectMembers={activeProjectMembers}
          onToggleSidebar={toggleSidebar}
        />
      </div>
      
      {/* Show toggle button when sidebar is hidden */}
      {!sidebarVisible && (
        <button
          onClick={toggleSidebar}
          className="absolute left-4 top-4 z-20 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 border border-gray-300 transition-colors"
          aria-label="Show sidebar"
          title="Show sidebar"
        >
          <Bars3Icon className="h-5 w-5 text-gray-600" />
        </button>
      )}
      
      {/* Main Content */}
      <div className="flex-1">
        {activeProject ? (
          <DemoWrapper projectId={activeProject.id} projectName={activeProject.name} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p>No project selected. Please create or select a project.</p>
          </div>
        )}
      </div>
      {selectedMember && (
        <ProjectCreationModal
          visible={projectCreationModalVisible}
          onClose={() => setProjectCreationModalVisible(false)}
          member={selectedMember}
          onProjectCreated={handleProjectCreated}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}

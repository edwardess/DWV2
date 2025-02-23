"use client";
import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/components/service/AuthProvider";
import DemoWrapper from "@/components/DemoWrapper";
import Sidebar from "@/components/Sidebar";
import ProjectCreationModal from "@/components/ProjectCreationModal";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { db } from "@/components/service/firebaseService";

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
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  // The members of the active project
  const [activeProjectMembers, setActiveProjectMembers] = useState<any[]>([]);
  // For creating new projects via the global settings popover
  const [projectCreationModalVisible, setProjectCreationModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    uid: string;
    email: string;
    displayName: string;
  } | null>(null);
  // State to control sidebar visibility
  const [sidebarVisible, setSidebarVisible] = useState(true);

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
          // Auto-select the first project if none is selected
          if (loadedProjects.length > 0 && !activeProjectId) {
            setActiveProjectId(loadedProjects[0].id);
          }
        })
        .catch((error) => {
          console.error("Error loading projects:", error);
        });
    }
  }, [user, activeProjectId]);

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

  // Toggle sidebar visibility
  const toggleSidebar = () => setSidebarVisible((prev) => !prev);

  if (loading) return <div>Loading...</div>;
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
          onAddMember={async () => {}}
          projects={projects}
          activeProjectId={activeProjectId}
          activeProjectMembers={activeProjectMembers}
          onToggleSidebar={toggleSidebar}
        />
      </div>
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

function MobileRestrictedView() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <img src="/Mobile.png" alt="Mobile not supported" className="w-64 mb-4" />
      <p className="text-center text-xl font-medium text-gray-700">
        Our website is currently optimized for desktop viewing.
        <br />
        Please access this site from a desktop or laptop for the best experience.
      </p>
    </div>
  );
}

export default function DashboardPage() {
  // State to track if the device is mobile/tablet based on window width
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // adjust threshold as needed
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile) {
    return <MobileRestrictedView />;
  }

  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}

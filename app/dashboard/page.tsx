"use client";
import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/components/services/AuthProvider";
import DemoWrapper from "@/components/pages/DemoWrapper";
import Sidebar from "@/components/pages/DemoWrapper/Sidebar";
import ProjectCreationModal from "@/components/modals/ProjectCreationModal";
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
  const [activeProjectId, setActiveProjectId] = useState<string>("");
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
          onAddMember={handleAddMember}
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

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}

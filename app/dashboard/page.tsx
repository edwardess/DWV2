"use client";
import React, { useState, useEffect } from "react";
import dynamicImport from "next/dynamic";

// Force dynamic rendering to prevent SSR issues with localStorage and browser APIs
export const dynamic = 'force-dynamic';

// Dynamically import components that use browser APIs to prevent SSR issues
const DemoWrapper = dynamicImport(() => import("@/components/pages/DemoWrapper"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>
});

const MobileWrapper = dynamicImport(() => import("@/components/mobile"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>
});


const ProjectCreationModal = dynamicImport(() => import("@/components/modals/ProjectCreationModal"), {
  ssr: false
});

// Import mobile detection hook
import { useMobileDetection } from "@/components/mobile/hooks/useMobileDetection";

import { AuthProvider, useAuth } from "@/components/services/AuthProvider";
import HashLoader from "react-spinners/HashLoader";
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
  getDoc,
  setDoc,
  serverTimestamp,
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
  const isMobile = useMobileDetection();
  const [mounted, setMounted] = useState(false);

  // Track mount state to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

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
          // Read directly from localStorage and parse it (matching useLocalStorage hook behavior)
          let savedProjectId: string | null = null;
          if (typeof window !== 'undefined') {
            try {
              const item = localStorage.getItem("selectedProjectId");
              if (item) {
                savedProjectId = JSON.parse(item);
              }
            } catch (error) {
              console.warn("Error parsing selectedProjectId from localStorage:", error);
            }
          }
          
          if (savedProjectId && typeof savedProjectId === 'string' && savedProjectId.trim() !== "") {
            const trimmedSavedId = savedProjectId.trim();
            
            // Check if the saved project is in the user's current projects
            const projectExists = loadedProjects.some(p => {
              const trimmedLoadedId = String(p.id).trim();
              return trimmedLoadedId === trimmedSavedId;
            });
            
            if (projectExists) {
              // If project still exists, keep using it
              setActiveProjectId(trimmedSavedId);
            } else if (loadedProjects.length > 0) {
              // If saved project no longer exists but user has projects, select first one
              setActiveProjectId(loadedProjects[0].id);
            } else {
              // If user has no projects, clear the active project
              setActiveProjectId("");
            }
          } else if (loadedProjects.length > 0) {
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
    // Use setActiveProjectId which handles localStorage via useLocalStorage hook
    setActiveProjectId(projectId);
  };

  // Called when a project is clicked in the sidebar
  const handleProjectSelect = (projectId: string) => {
    console.log("🖱️ Project selected via sidebar:", projectId);
    // Use setActiveProjectId which handles localStorage via useLocalStorage hook
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

      // Update group chat to include the new member
      const groupChatId = `group_${activeProjectId}`;
      const conversationRef = doc(db, `projects/${activeProjectId}/conversations`, groupChatId);
      
      // Get the current conversation data
      const conversationDoc = await getDoc(conversationRef);
      
      if (conversationDoc.exists()) {
        // Update existing group chat
        await updateDoc(conversationRef, {
          participantIds: arrayUnion(newMember.uid),
          participants: arrayUnion({
            id: newMember.uid,
            name: newMember.displayName,
            email: newMember.email,
            photoURL: newMember.photoURL
          }),
          [`unreadCount.${newMember.uid}`]: 0
        });
      } else {
        // Create new group chat if it doesn't exist
        await setDoc(conversationRef, {
          isGroupChat: true,
          participantIds: [user.uid, newMember.uid],
          participants: [
            {
              id: user.uid,
              name: user.displayName || user.email,
              email: user.email,
              photoURL: user.photoURL
            },
            {
              id: newMember.uid,
              name: newMember.displayName,
              email: newMember.email,
              photoURL: newMember.photoURL
            }
          ],
          groupName: `${activeProject?.name || 'Project'} Group`,
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessage: 'Welcome to the group chat!',
          lastMessageSeen: true,
          unreadCount: {
            [user.uid]: 0,
            [newMember.uid]: 0
          }
        });
      }
      
      console.log("Member successfully added:", newMember.email);
    } catch (error) {
      console.error("Error adding member:", error);
    }
  };


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

  // Prevent hydration mismatch by only showing mobile/desktop after mount
  // Render desktop view initially (matches server), then switch after hydration
  if (!mounted) {
    // Server render and initial client render - show desktop to prevent mismatch
    return (
      <div className="flex h-screen">
        <div className="flex-1">
          {activeProject ? (
            <DemoWrapper 
              projectId={activeProject.id} 
              projectName={activeProject.name}
              onProjectSelect={handleProjectSelect}
              onOpenProjectCreation={handleOpenProjectCreation}
              onAddMember={handleAddMember}
              projects={projects}
              activeProjectId={activeProjectId}
              activeProjectMembers={activeProjectMembers}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center gap-4">
                <HashLoader color="#3b82f6" size={50} />
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-700">No project selected</p>
                  <p className="text-sm text-gray-500 mt-1">Please create or select a project to get started</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mobile view - only after client-side mount
  if (isMobile) {
    return (
      <>
        {activeProject ? (
          <MobileWrapper
            projectId={activeProject.id}
            projectName={activeProject.name}
            projects={projects}
            onProjectSelect={handleProjectSelect}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center h-screen bg-gray-50">
            <div className="flex flex-col items-center gap-4 px-4">
              <HashLoader color="#3b82f6" size={50} />
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-700">No project selected</p>
                <p className="text-sm text-gray-500 mt-1">Please create or select a project to get started</p>
              </div>
            </div>
          </div>
        )}
        {selectedMember && (
          <ProjectCreationModal
            visible={projectCreationModalVisible}
            onClose={() => setProjectCreationModalVisible(false)}
            member={selectedMember}
            onProjectCreated={handleProjectCreated}
          />
        )}
      </>
    );
  }

  // Desktop view
  return (
    <div className="flex h-screen">
      {/* Permanent dimmed background layer - base layer */}
      <div className="fixed inset-0 bg-black/30 z-0 pointer-events-none" />
      
      {/* Main Content */}
      <div className="flex-1 w-full">
        {activeProject ? (
          <DemoWrapper 
            projectId={activeProject.id} 
            projectName={activeProject.name}
          onProjectSelect={handleProjectSelect}
          onOpenProjectCreation={handleOpenProjectCreation}
          onAddMember={handleAddMember}
          projects={projects}
          activeProjectId={activeProjectId}
          activeProjectMembers={activeProjectMembers}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-4">
              <HashLoader color="#3b82f6" size={50} />
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-700">No project selected</p>
                <p className="text-sm text-gray-500 mt-1">Please create or select a project to get started</p>
              </div>
            </div>
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

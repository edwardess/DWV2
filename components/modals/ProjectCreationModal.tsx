// Put the components/ProjectCreationModal.tsx code here 

"use client";
import React, { useState, FormEvent } from "react";
import { doc, setDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "@/components/services/firebaseService";
import Modal from "@/components/common/modals/Modal";
import { useAuth } from "@/components/services/AuthProvider";

interface ProjectUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface ProjectCreationModalProps {
  visible: boolean;
  onClose: () => void;
  member: ProjectUser; // This is the real user from the users collection
  onProjectCreated: (projectId: string, projectName: string) => void;
}

export default function ProjectCreationModal({
  visible,
  onClose,
  member,
  onProjectCreated,
}: ProjectCreationModalProps) {
  const { user } = useAuth();
  const [projectName, setProjectName] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Generate UUID for project ID
      const projectId = crypto.randomUUID();
      const projectRef = doc(db, "projects", projectId);
      
      await setDoc(projectRef, {
        projectName: projectName,
        members: [
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          },
          member,
        ],
        memberIds: [user.uid, member.uid],
        createdAt: serverTimestamp(),
      });

      // Initialize the group chat
      const groupChatId = `group_${projectId}`;
      const conversationRef = doc(db, `projects/${projectId}/conversations`, groupChatId);
      
      await setDoc(conversationRef, {
        isGroupChat: true,
        participantIds: [user.uid, member.uid],
        participants: [
          {
            id: user.uid,
            name: user.displayName || user.email,
            email: user.email,
            photoURL: user.photoURL
          },
          {
            id: member.uid,
            name: member.displayName,
            email: member.email,
            photoURL: member.photoURL
          }
        ],
        groupName: `${projectName} Group`,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastMessage: 'Welcome to the group chat!',
        lastMessageSeen: true,
        unreadCount: {
          [user.uid]: 0,
          [member.uid]: 0
        }
      });

      onProjectCreated(projectId, projectName);
      onClose();
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible}>
      <div className="bg-white p-4 rounded shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          Start a project with {member.displayName}
        </h2>
        <form onSubmit={handleSubmit}>
          <label className="block mb-2">Project Name</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
            className="border p-2 rounded w-full mb-4"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white p-2 rounded w-full"
          >
            Create Project
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full border p-2 rounded"
          >
            Cancel
          </button>
        </form>
      </div>
    </Modal>
  );
}

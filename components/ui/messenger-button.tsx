"use client";

import React, { useState, useEffect } from "react";
import { ChatBubbleBottomCenterTextIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import MessengerModal from "@/components/modals/MessengerModal";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/services/AuthProvider";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/components/services/firebaseService";

// Use the same User type as defined in MessengerModal
interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  online?: boolean;
}

interface MessengerButtonProps {
  className?: string;
  projectId?: string;
  projectName?: string;
  projectMembers?: User[];
}

export function MessengerButton({ 
  className = "", 
  projectId, 
  projectName,
  projectMembers = []
}: MessengerButtonProps) {
  const [messengerVisible, setMessengerVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  
  // Listen for unread messages
  useEffect(() => {
    if (!projectId || !user?.uid) return;
    
    const conversationsRef = collection(db, `projects/${projectId}/conversations`);
    const q = query(
      conversationsRef,
      where('participantIds', 'array-contains', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalUnread = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        totalUnread += data.unreadCount?.[user.uid] || 0;
      });
      setUnreadCount(totalUnread);
    });
    
    return () => unsubscribe();
  }, [projectId, user?.uid]);
  
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMessengerVisible(true)}
        className={`
          flex items-center justify-center
          rounded-full p-2
          bg-background hover:bg-muted/50
          border border-border/50 hover:border-border
          shadow-sm hover:shadow
          transition-all duration-200
          ${className}
        `}
      >
        <div className="relative flex items-center justify-center">
          <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center px-1 text-[10px] font-medium ring-2 ring-background"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </Button>
      
      <MessengerModal 
        visible={messengerVisible} 
        onClose={() => setMessengerVisible(false)}
        projectId={projectId}
        projectName={projectName}
        projectMembers={projectMembers}
      />
    </>
  );
} 
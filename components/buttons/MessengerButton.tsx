import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import MessengerModal from '../modals/MessengerModal';

interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  online?: boolean;
}

interface MessengerButtonProps {
  projectId?: string;
  projectName?: string;
  projectMembers?: User[];
}

export const MessengerButton = ({ projectId, projectName, projectMembers }: MessengerButtonProps) => {
  const [showMessenger, setShowMessenger] = useState(false);

  const toggleMessenger = () => {
    setShowMessenger(!showMessenger);
  };

  return (
    <>
      <button
        onClick={toggleMessenger}
        className="fixed bottom-10 right-10 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-all z-50"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      <MessengerModal
        visible={showMessenger}
        onClose={() => setShowMessenger(false)}
        projectId={projectId}
        projectName={projectName}
        projectMembers={projectMembers}
      />
    </>
  );
}; 
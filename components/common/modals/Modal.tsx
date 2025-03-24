// Put the components/Modal.tsx code here 

// Modal.tsx
import React, { ReactNode } from "react";

interface ModalProps {
  visible: boolean;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ visible, children }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[555] flex items-center justify-center bg-black bg-opacity-50">
      {children}
    </div>
  );
};

export default Modal;

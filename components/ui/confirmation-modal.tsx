import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, XCircleIcon, CheckCircleIcon, InfoIcon } from "lucide-react";

export type ConfirmationType = "danger" | "warning" | "info" | "success";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: ConfirmationType;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning"
}) => {
  // Define styles based on confirmation type
  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          icon: <XCircleIcon className="h-7 w-7 text-destructive" />,
          confirmButtonVariant: "destructive" as const,
          headerClass: "text-destructive border-destructive/20 bg-destructive/10"
        };
      case "warning":
        return {
          icon: <AlertTriangleIcon className="h-7 w-7 text-amber-500" />,
          confirmButtonVariant: "default" as const,
          headerClass: "text-amber-500 border-amber-200 bg-amber-50"
        };
      case "success":
        return {
          icon: <CheckCircleIcon className="h-7 w-7 text-green-600" />,
          confirmButtonVariant: "outline" as const,
          headerClass: "text-green-600 border-green-200 bg-green-50"
        };
      case "info":
      default:
        return {
          icon: <InfoIcon className="h-7 w-7 text-primary" />,
          confirmButtonVariant: "default" as const,
          headerClass: "text-primary border-primary/20 bg-primary/10"
        };
    }
  };

  const { icon, confirmButtonVariant, headerClass } = getTypeStyles();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className={`p-4 rounded-t-lg ${headerClass} flex flex-row items-center gap-3 mb-2`}>
          {icon}
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>
        <div className="py-3 px-1">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={confirmButtonVariant} onClick={handleConfirm}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal; 
"use client"

import React, { useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface ApproveSwitchProps {
  isApproved: boolean;
  onChange: (approved: boolean) => void;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
}

const ApproveSwitch: React.FC<ApproveSwitchProps> = ({ 
  isApproved, 
  onChange, 
  className, 
  loading = false,
  disabled = false
}) => {
  console.log("ApproveSwitch rendering:", { isApproved, loading, disabled });
  
  useEffect(() => {
    console.log("ApproveSwitch mounted/updated with isApproved:", isApproved);
  }, [isApproved]);
  
  // Separate function to handle click events on both switch and label
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!disabled && !loading) {
      console.log("Switch clicked! Current value:", isApproved, "Toggling to:", !isApproved);
      onChange(!isApproved);
    } else {
      console.log("Switch click ignored - disabled or loading:", { disabled, loading });
    }
  };
  
  // Normal change handler for the Switch component
  const handleToggle = (checked: boolean) => {
    console.log("Switch toggled to:", checked);
    
    // Only trigger if not disabled or loading
    if (!disabled && !loading) {
      onChange(checked);
    }
  };
  
  return (
    <div 
      className={cn("flex items-center space-x-2", className)} 
      onClick={handleClick}
      role="button"
      tabIndex={0}
      data-approved={isApproved}
    >
      <Switch 
        checked={isApproved}
        onCheckedChange={handleToggle}
        disabled={loading || disabled}
        id="approve-switch"
        className="cursor-pointer"
      />
      <Label 
        htmlFor="approve-switch" 
        className={cn(
          "text-sm font-medium flex items-center cursor-pointer",
          isApproved ? "text-green-600" : "text-muted-foreground",
          (loading || disabled) && "opacity-50 cursor-not-allowed"
        )}
      >
        <CheckCircleIcon className={cn(
          "h-4 w-4 mr-1.5",
          isApproved ? "text-green-500" : "text-muted-foreground",
        )} />
        Quick Approve
        {loading && (
          <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
        )}
      </Label>
    </div>
  );
};

export default ApproveSwitch; 
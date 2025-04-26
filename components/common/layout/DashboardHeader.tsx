"use client";
import React from 'react';
import { Typography } from '@/components/common';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BellIcon, UserIcon, CogIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  title, 
  subtitle
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h4" className="font-bold">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" className="text-gray-500">
              {subtitle}
            </Typography>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <BellIcon className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <UserIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CogIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}; 
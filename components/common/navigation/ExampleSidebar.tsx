"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { Typography } from "@/components/common";

const ExampleSidebar: React.FC = () => {
  const pathname = usePathname();
  
  const navItems = [
    { label: "Component Gallery", href: "/examples" },
    { label: "Dashboard", href: "/dashboard" },
  ];

  return (
    <div className="w-64 h-full p-4 border-r border-gray-200 flex flex-col bg-white">
      {/* Header with Title */}
      <div className="mb-6">
        <Typography variant="h5" className="font-semibold text-gray-800">
          UI Components
        </Typography>
        <Typography variant="body2" className="text-gray-500">
          Example implementations
        </Typography>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={twMerge(
                    "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-gray-200">
        <Typography variant="caption" className="text-gray-500">
          &copy; {new Date().getFullYear()} Component Library
        </Typography>
      </div>
    </div>
  );
};

export default ExampleSidebar; 
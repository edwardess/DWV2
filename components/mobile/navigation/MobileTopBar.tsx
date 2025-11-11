"use client";

import React from "react";
import { Bars3Icon, ArrowUpTrayIcon, PencilSquareIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

interface MobileTopBarProps {
  currentMonth: number;
  currentYear: number;
  onMonthChange: (month: number, year: number) => void;
  onTodoClick: () => void;
  onUploadClick: () => void;
  onWriteClick: () => void;
  onBurgerClick: () => void;
}

export default function MobileTopBar({
  currentMonth,
  currentYear,
  onMonthChange,
  onTodoClick,
  onUploadClick,
  onWriteClick,
  onBurgerClick,
}: MobileTopBarProps) {
  // Generate month options for current year only
  const monthOptions = monthNames.map((month, index) => ({
    value: index,
    label: `${month} ${currentYear}`,
  }));

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMonth = parseInt(e.target.value, 10);
    onMonthChange(selectedMonth, currentYear);
  };

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Burger Menu */}
        <button
          onClick={onBurgerClick}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Toggle projects sidebar"
        >
          <Bars3Icon className="h-6 w-6 text-gray-700" />
        </button>

        {/* Right: Month Dropdown, Upload, Write */}
        <div className="flex items-center gap-3">
          {/* Month/Year Dropdown */}
          <select
            value={currentMonth}
            onChange={handleMonthChange}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* To-Do List Icon */}
          <button
            onClick={onTodoClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open to-do list"
          >
            <ClipboardDocumentListIcon className="h-6 w-6 text-gray-700" />
          </button>

          {/* Upload Icon */}
          <button
            onClick={onUploadClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Upload content"
          >
            <ArrowUpTrayIcon className="h-6 w-6 text-gray-700" />
          </button>

          {/* Write Icon */}
          <button
            onClick={onWriteClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Create draft"
          >
            <PencilSquareIcon className="h-6 w-6 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );
}


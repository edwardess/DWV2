"use client";

import React from "react";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { TodoTask } from "@/components/pages/Calendar/TodoList/types";

interface MobileTodoTaskCardProps {
  task: TodoTask;
  onEdit: (task: TodoTask) => void;
  onDeleteRequest: (task: TodoTask) => void;
}

const statusStyles: Record<TodoTask["status"], { label: string; className: string }> = {
  completed: {
    label: "Completed",
    className: "bg-purple-200 text-purple-800",
  },
  incomplete: {
    label: "Incomplete",
    className: "bg-sky-200 text-sky-800",
  },
};

const MobileTodoTaskCard: React.FC<MobileTodoTaskCardProps> = ({ 
  task, 
  onEdit, 
  onDeleteRequest 
}) => {
  const dueDateLabel = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  const statusMeta = statusStyles[task.status];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-4 py-3 space-y-2 active:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 leading-tight truncate">
            {task.title}
          </h4>
          {task.description && (
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600 line-clamp-3 break-words">
              {task.description}
            </p>
          )}
        </div>
        <span
          className={`min-w-[80px] flex-shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold text-center ${statusMeta.className}`}
        >
          {statusMeta.label}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
        <span className="truncate pr-2 font-medium">{dueDateLabel}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="rounded-full p-2 active:bg-gray-200 transition-colors"
            aria-label="Edit task"
          >
            <PencilSquareIcon className="h-5 w-5 text-gray-700" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(task)}
            className="rounded-full p-2 active:bg-red-100 transition-colors"
            aria-label="Delete task"
          >
            <TrashIcon className="h-5 w-5 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileTodoTaskCard;


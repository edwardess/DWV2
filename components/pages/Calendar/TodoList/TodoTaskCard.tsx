import React from "react";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { TodoTask } from "./types";

interface TodoTaskCardProps {
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

const TodoTaskCard: React.FC<TodoTaskCardProps> = ({ task, onEdit, onDeleteRequest }) => {
  const dueDateLabel = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  const statusMeta = statusStyles[task.status];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm shadow-gray-200 px-3 py-4 space-y-2.5 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-semibold text-gray-900 leading-snug truncate">
            {task.title}
          </h4>
          {task.description && (
            <p className="mt-1 text-xs leading-relaxed text-gray-600 line-clamp-3">
              {task.description}
            </p>
          )}
        </div>
        <span
          className={`min-w-[72px] flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-center ${statusMeta.className}`}
        >
          {statusMeta.label}
        </span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span className="truncate pr-2">{dueDateLabel}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Edit task"
          >
            <PencilSquareIcon className="h-3.5 w-3.5 text-gray-700" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteRequest(task)}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label="Delete task"
          >
            <TrashIcon className="h-3.5 w-3.5 text-red-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TodoTaskCard;


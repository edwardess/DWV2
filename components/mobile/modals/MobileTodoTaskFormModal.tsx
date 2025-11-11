"use client";

import React, { useEffect, useState } from "react";
import Modal from "@/components/common/modals/Modal";
import { TodoColumnKey, TodoStatus, TodoTask, TodoTaskInput } from "@/components/pages/Calendar/TodoList/types";

interface MobileTodoTaskFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: TodoTaskInput, taskId?: string) => Promise<void> | void;
  defaultTask?: TodoTask | null;
  canSubmit?: boolean;
}

const columnOptions: Array<{ value: TodoColumnKey; label: string }> = [
  { value: "provider", label: "Provider Tasks" },
  { value: "client", label: "Client Tasks" },
];

const statusOptions: Array<{ value: TodoStatus; label: string }> = [
  { value: "completed", label: "Completed" },
  { value: "incomplete", label: "Incomplete" },
];

const MobileTodoTaskFormModal: React.FC<MobileTodoTaskFormModalProps> = ({
  visible,
  onClose,
  onSubmit,
  defaultTask,
  canSubmit = true,
}) => {
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formState, setFormState] = useState<TodoTaskInput>({
    column: defaultTask?.column ?? "client",
    title: defaultTask?.title ?? "",
    description: defaultTask?.description ?? "",
    dueDate: defaultTask?.dueDate ?? getTodayDateString(),
    status: defaultTask?.status ?? "incomplete",
  });

  useEffect(() => {
    if (visible) {
      setFormState({
        column: defaultTask?.column ?? "client",
        title: defaultTask?.title ?? "",
        description: defaultTask?.description ?? "",
        dueDate: defaultTask?.dueDate ?? getTodayDateString(),
        status: defaultTask?.status ?? "incomplete",
      });
    }
  }, [defaultTask, visible]);

  if (!visible) return null;

  const handleChange = (field: keyof TodoTaskInput, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: field === "dueDate" ? (value ? value : null) : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      onClose();
      return;
    }
    try {
      await onSubmit(formState, defaultTask?.id);
      onClose();
    } catch (error) {
      console.error("Failed to save to-do task", error);
    }
  };

  return (
    <Modal visible={visible}>
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">
            {defaultTask ? "Edit Task" : "Add New Task"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 active:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <span className="text-2xl font-light leading-none text-gray-600">&times;</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Column Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Column</label>
              <select
                value={formState.column}
                onChange={(event) => handleChange("column", event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {columnOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Task Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
              <input
                type="text"
                value={formState.title}
                onChange={(event) => handleChange("title", event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="Enter task title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formState.description}
                onChange={(event) => handleChange("description", event.target.value)}
                rows={6}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-base leading-relaxed text-gray-700 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
                placeholder="Add task details"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formState.dueDate ?? ""}
                onChange={(event) => handleChange("dueDate", event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>

            {/* Status (only for edit) */}
            {defaultTask && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formState.status}
                  onChange={(event) => handleChange("status", event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </form>

        {/* Footer Buttons */}
        <div className="flex items-center gap-3 px-4 py-4 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-base font-semibold text-gray-600 active:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              const form = e.currentTarget.closest('form');
              if (form) {
                form.requestSubmit();
              }
            }}
            disabled={!canSubmit || !formState.title.trim()}
            className="flex-1 rounded-lg bg-black px-4 py-3 text-base font-semibold text-white shadow-md active:bg-gray-900 transition-colors disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default MobileTodoTaskFormModal;


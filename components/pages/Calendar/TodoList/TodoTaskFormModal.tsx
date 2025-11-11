import React, { useEffect, useState } from "react";
import { TodoColumnKey, TodoStatus, TodoTask, TodoTaskInput } from "./types";

interface TodoTaskFormModalProps {
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

const modalBackdrop =
  "fixed inset-0 z-[560] flex items-center justify-center bg-black/50 px-4 py-8";

const TodoTaskFormModal: React.FC<TodoTaskFormModalProps> = ({
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
    column: defaultTask?.column ?? "provider",
    title: defaultTask?.title ?? "",
    description: defaultTask?.description ?? "",
    dueDate: defaultTask?.dueDate ?? getTodayDateString(),
    status: defaultTask?.status ?? "incomplete",
  });

  useEffect(() => {
    setFormState({
      column: defaultTask?.column ?? "provider",
      title: defaultTask?.title ?? "",
      description: defaultTask?.description ?? "",
      dueDate: defaultTask?.dueDate ?? getTodayDateString(),
      status: defaultTask?.status ?? "incomplete",
    });
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
    <div className={modalBackdrop}>
      <div className="w-full max-w-5xl rounded-3xl bg-white p-8 shadow-2xl shadow-gray-400">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {defaultTask ? "Edit Task" : "Add New Task"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Close task form"
          >
            <span className="text-lg font-semibold">&times;</span>
          </button>
        </div>

        <form className="mt-5 flex flex-col gap-6 lg:flex-row" onSubmit={handleSubmit}>
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
              <select
                value={formState.column}
                onChange={(event) => handleChange("column", event.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {columnOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
              <input
                value={formState.title}
                onChange={(event) => handleChange("title", event.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="Enter task title"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formState.dueDate ?? ""}
                  onChange={(event) => handleChange("dueDate", event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              {defaultTask && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formState.status}
                    onChange={(event) => handleChange("status", event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
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

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit || !formState.title.trim()}
                className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-gray-500/30 transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-200"
              >
                Save
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formState.description}
              onChange={(event) => handleChange("description", event.target.value)}
              className="h-96 w-full rounded-2xl border border-gray-300 bg-gray-50 px-3 py-3 text-sm leading-relaxed text-gray-700 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none overflow-y-auto whitespace-pre-wrap"
              placeholder="Add task details"
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default TodoTaskFormModal;


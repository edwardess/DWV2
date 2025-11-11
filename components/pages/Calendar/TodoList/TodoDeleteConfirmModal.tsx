import React from "react";

interface TodoDeleteConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  taskTitle: string;
}

const TodoDeleteConfirmModal: React.FC<TodoDeleteConfirmModalProps> = ({
  visible,
  onCancel,
  onConfirm,
  taskTitle,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[570] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl shadow-gray-500/40">
        <h3 className="text-lg font-semibold text-gray-900">Delete this task?</h3>
        <p className="mt-2 text-sm text-gray-600">
          You are about to permanently remove{" "}
          <span className="font-semibold text-gray-900">“{taskTitle || "Untitled Task"}”</span>.
          This action cannot be undone.
        </p>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-red-400/40 hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default TodoDeleteConfirmModal;


"use client";

import React, { useMemo, useState, useEffect } from "react";
import Modal from "@/components/common/modals/Modal";
import MobileTodoTaskCard from "./MobileTodoTaskCard";
import MobileTodoTaskFormModal from "./MobileTodoTaskFormModal";
import TodoDeleteConfirmModal from "@/components/pages/Calendar/TodoList/TodoDeleteConfirmModal";
import { TodoColumnKey, TodoTask, TodoTaskInput } from "@/components/pages/Calendar/TodoList/types";
import { useTodoList } from "@/components/pages/Calendar/TodoList/useTodoList";

interface MobileTodoListModalProps {
  visible: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string | null;
  activeYear?: number;
}

const columnAccents: Record<TodoColumnKey, string> = {
  provider: "#8B5CF6",
  client: "#38BDF8",
};

const MobileTodoListModal: React.FC<MobileTodoListModalProps> = ({
  visible,
  onClose,
  projectId,
  projectName,
  activeYear,
}) => {
  const {
    loading,
    columns,
    tasks,
    addTask,
    updateTask,
    deleteTask,
    updateColumnTitle,
  } = useTodoList(projectId);

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<TodoTask | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<TodoTask | null>(null);
  const [activeColumn, setActiveColumn] = useState<TodoColumnKey>("client");

  useEffect(() => {
    if (visible) {
      setActiveColumn("client");
    }
  }, [visible]);

  const providerTasks = useMemo(
    () => tasks.filter((task) => task.column === "provider"),
    [tasks]
  );
  const clientTasks = useMemo(
    () => tasks.filter((task) => task.column === "client"),
    [tasks]
  );

  const openCreateModal = () => {
    setActiveTask(null);
    setIsTaskFormOpen(true);
  };

  const handleEditTask = (task: TodoTask) => {
    setActiveTask(task);
    setIsTaskFormOpen(true);
  };

  const handleDeleteRequest = (task: TodoTask) => {
    setTaskPendingDelete(task);
  };

  const confirmDeleteTask = async () => {
    if (taskPendingDelete) {
      await deleteTask(taskPendingDelete.id);
      setTaskPendingDelete(null);
    }
  };

  const cancelDeleteTask = () => setTaskPendingDelete(null);

  const handleSaveTask = async (input: TodoTaskInput, taskId?: string) => {
    if (!projectId) return;
    if (taskId) {
      await updateTask(taskId, input);
    } else {
      await addTask(input);
    }
  };

  if (!visible) return null;

  const providerTitle = columns.provider ?? "Service Provider's Tasks";
  const clientTitle = columns.client ?? "Client's Tasks";
  const currentColumnTitle = activeColumn === "provider" ? providerTitle : clientTitle;
  const currentColumnTasks = activeColumn === "provider" ? providerTasks : clientTasks;

  return (
    <Modal visible={visible}>
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-600">
              {projectName || "Project"} · {activeYear ?? new Date().getFullYear()}
            </p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">
              Collaborative To-Do List
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 active:bg-gray-100 transition-colors"
            aria-label="Close to-do list"
          >
            <span className="text-2xl font-light leading-none text-gray-600">&times;</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4 space-y-4">
          {!projectId ? (
            <div className="text-center py-12">
              <p className="text-sm font-semibold text-gray-400">
                Select a project to enable task management.
              </p>
            </div>
          ) : (
            <>
              {/* Add Button */}
              <button
                type="button"
                onClick={openCreateModal}
                disabled={!projectId}
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black text-xl font-bold text-white shadow-lg active:scale-95 transition-transform disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Add new task"
              >
                +
              </button>

              {/* Tab Toggle */}
              <div className="flex justify-center">
                <div className="inline-flex rounded-full bg-gray-200 p-1 shadow-inner">
                  {(["provider", "client"] as TodoColumnKey[]).map((columnKey) => {
                    const isActive = activeColumn === columnKey;
                    const tabLabel = columnKey === "provider" ? providerTitle : clientTitle;
                    return (
                      <button
                        key={columnKey}
                        type="button"
                        onClick={() => setActiveColumn(columnKey)}
                        className={`relative mx-0.5 min-w-[140px] rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                          isActive ? "bg-black text-white shadow-md" : "text-gray-600 active:text-gray-800"
                        }`}
                        aria-pressed={isActive}
                      >
                        <span className="block truncate">{tabLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Task List */}
              <div className="space-y-3 pb-4">
                {currentColumnTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center">
                    <p className="text-sm font-medium text-gray-400">No tasks yet</p>
                  </div>
                ) : (
                  currentColumnTasks.map((task) => (
                    <MobileTodoTaskCard
                      key={task.id}
                      task={task}
                      onEdit={handleEditTask}
                      onDeleteRequest={handleDeleteRequest}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Loading Overlay */}
        {projectId && loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" />
          </div>
        )}
      </div>

      <MobileTodoTaskFormModal
        visible={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        defaultTask={activeTask}
        onSubmit={handleSaveTask}
        canSubmit={Boolean(projectId)}
      />
      <TodoDeleteConfirmModal
        visible={Boolean(taskPendingDelete)}
        onCancel={cancelDeleteTask}
        onConfirm={confirmDeleteTask}
        taskTitle={taskPendingDelete?.title ?? ""}
      />
    </Modal>
  );
};

export default MobileTodoListModal;


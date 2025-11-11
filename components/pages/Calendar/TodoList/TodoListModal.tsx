import React, { useMemo, useState } from "react";
import Modal from "@/components/common/modals/Modal";
import TodoTaskColumn from "./TodoTaskColumn";
import TodoTaskFormModal from "./TodoTaskFormModal";
import TodoDeleteConfirmModal from "./TodoDeleteConfirmModal";
import { TodoColumnKey, TodoTask, TodoTaskInput } from "./types";
import { useTodoList } from "./useTodoList";

interface TodoListModalProps {
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

const TodoListModal: React.FC<TodoListModalProps> = ({
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

  const handleUpdateTitle = async (column: TodoColumnKey, title: string) => {
    if (!projectId) return;
    await updateColumnTitle(column, title);
  };

  if (!visible) return null;

  const providerTitle = columns.provider ?? "Service Provider's Tasks";
  const clientTitle = columns.client ?? "Client's Tasks";

  return (
    <Modal visible={visible}>
      <div className="w-full max-w-6xl px-4">
        <div className="relative w-full rounded-[36px] bg-gradient-to-br from-gray-100 via-white to-gray-200 p-8 shadow-2xl shadow-gray-600/30 border border-white/60">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 rounded-full border border-gray-200 bg-white p-2 text-gray-500 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Close to-do list"
          >
            <span className="text-lg font-semibold leading-none">&times;</span>
          </button>

          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-gray-700">
              {projectName || "Project"} · {activeYear ?? new Date().getFullYear()}
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-wide text-gray-900">
              Collaborative To-Do List
            </h2>
            <p className="mt-1.5 text-xs text-gray-500">
              Keep track of deliverables for both the provider and client sides.
            </p>
            {!projectId && (
              <p className="mt-4 text-sm font-semibold text-gray-400">
                Select a project to enable task management.
              </p>
            )}
          </div>

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-center">
            <div className="flex flex-1 justify-center">
              <TodoTaskColumn
                columnKey="provider"
                title={providerTitle}
                onTitleChange={handleUpdateTitle}
                tasks={providerTasks}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteRequest}
                accentColor={columnAccents.provider}
                editable={Boolean(projectId)}
              />
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="absolute left-1/2 top-0 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-black text-2xl font-bold text-white shadow-xl shadow-black/40 transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-black/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              aria-label="Add new task"
              disabled={!projectId}
            >
              +
            </button>

            <div className="flex flex-1 justify-center">
              <TodoTaskColumn
                columnKey="client"
                title={clientTitle}
                onTitleChange={handleUpdateTitle}
                tasks={clientTasks}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteRequest}
                accentColor={columnAccents.client}
                editable={Boolean(projectId)}
              />
            </div>
          </div>

          {projectId && loading && (
            <div className="absolute inset-0 rounded-[40px] bg-white/60 backdrop-blur-sm flex items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" />
            </div>
          )}
        </div>
      </div>

      <TodoTaskFormModal
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

export default TodoListModal;


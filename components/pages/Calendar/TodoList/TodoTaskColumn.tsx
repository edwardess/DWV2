import React, { useEffect, useRef, useState } from "react";
import { BriefcaseIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import TodoTaskCard from "./TodoTaskCard";
import { TodoColumnKey, TodoTask } from "./types";

interface TodoTaskColumnProps {
  columnKey: TodoColumnKey;
  title: string;
  onTitleChange: (column: TodoColumnKey, title: string) => Promise<void> | void;
  tasks: TodoTask[];
  onEditTask: (task: TodoTask) => void;
  onDeleteTask: (task: TodoTask) => void;
  accentColor: string;
  editable: boolean;
}

const TodoTaskColumn: React.FC<TodoTaskColumnProps> = ({
  columnKey,
  title,
  onTitleChange,
  tasks,
  onEditTask,
  onDeleteTask,
  accentColor,
  editable,
}) => {
  const [localTitle, setLocalTitle] = useState(title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  }, [localTitle]);

  const handleBlur = async () => {
    if (!editable) {
      setLocalTitle(title);
      return;
    }

    if (!localTitle.trim() || localTitle.trim() === title.trim()) {
      setLocalTitle(title);
      return;
    }
    try {
      setIsSavingTitle(true);
      await onTitleChange(columnKey, localTitle.trim());
    } finally {
      setIsSavingTitle(false);
    }
  };

  const ColumnIcon = columnKey === "provider" ? BriefcaseIcon : UserGroupIcon;

  return (
    <div className="relative flex h-[560px] w-full max-w-md flex-col rounded-3xl border border-gray-200 bg-gradient-to-b from-white via-white to-gray-100 px-5 py-5 shadow-lg shadow-gray-200/70">
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-start gap-3 w-full">
          <ColumnIcon className="mt-1 h-5 w-5 shrink-0" style={{ color: accentColor }} />
          <textarea
            ref={titleRef}
            value={localTitle}
            onChange={(event) => setLocalTitle(event.target.value)}
            onBlur={handleBlur}
            disabled={isSavingTitle || !editable}
            rows={1}
            className="w-full resize-none overflow-hidden bg-transparent text-[17px] font-semibold uppercase tracking-wide text-gray-800 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-gray-400"
          />
        </div>
      </div>
      <div className="mt-3 flex-1 overflow-y-auto pr-1.5 space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/60 py-10 text-center text-sm font-medium text-gray-400">
            No tasks yet
          </div>
        ) : (
          tasks.map((task) => (
            <TodoTaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDeleteRequest={onDeleteTask}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TodoTaskColumn;


export type TodoColumnKey = "provider" | "client";

export type TodoStatus = "completed" | "incomplete";

export interface TodoTask {
  id: string;
  column: TodoColumnKey;
  title: string;
  description: string;
  dueDate: string | null;
  status: TodoStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface TodoColumnState {
  key: TodoColumnKey;
  title: string;
}

export interface TodoTaskInput {
  column: TodoColumnKey;
  title: string;
  description: string;
  dueDate: string | null;
  status: TodoStatus;
}


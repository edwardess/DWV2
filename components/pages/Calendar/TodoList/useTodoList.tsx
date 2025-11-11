import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/components/services/firebaseService";
import { TodoColumnKey, TodoTask, TodoTaskInput } from "./types";

const defaultColumnTitles: Record<TodoColumnKey, string> = {
  provider: "Service Provider's Tasks",
  client: "Client's Tasks",
};

interface UseTodoListResult {
  loading: boolean;
  columns: Record<TodoColumnKey, string>;
  tasks: TodoTask[];
  addTask: (input: TodoTaskInput) => Promise<void>;
  updateTask: (taskId: string, input: TodoTaskInput) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateColumnTitle: (column: TodoColumnKey, title: string) => Promise<void>;
}

export const useTodoList = (projectId?: string): UseTodoListResult => {
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<Record<TodoColumnKey, string>>(defaultColumnTitles);
  const [tasks, setTasks] = useState<TodoTask[]>([]);

  const todoListDocRef = useMemo(() => {
    if (!projectId) return null;
    return doc(db, "projects", projectId, "todoLists", "default");
  }, [projectId]);

  const ensureTodoListDocument = useCallback(async () => {
    if (!todoListDocRef) return;
    try {
      const snapshot = await getDoc(todoListDocRef);
      if (!snapshot.exists()) {
        await setDoc(todoListDocRef, {
          providerTitle: defaultColumnTitles.provider,
          clientTitle: defaultColumnTitles.client,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Failed to ensure to-do list document", error);
    }
  }, [todoListDocRef]);

  useEffect(() => {
    if (!todoListDocRef) {
      setColumns(defaultColumnTitles);
      setTasks([]);
      return;
    }

    setLoading(true);

    const unsubscribeMeta = onSnapshot(todoListDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        setColumns(defaultColumnTitles);
        return;
      }
      const data = snapshot.data();
      setColumns({
        provider: data.providerTitle || defaultColumnTitles.provider,
        client: data.clientTitle || defaultColumnTitles.client,
      });
    });

    const tasksRef = collection(todoListDocRef, "tasks");
    const q = query(tasksRef, orderBy("dueDate", "asc"), orderBy("createdAt", "asc"));
    let initialFetch = true;
    const unsubscribeTasks = onSnapshot(q, (snapshot) => {
      const nextTasks: TodoTask[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          column: (data.column as TodoColumnKey) ?? "provider",
          title: data.title ?? "Untitled Task",
          description: data.description ?? "",
          dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate().toISOString().slice(0, 10) : null,
          status: data.status === "completed" ? "completed" : "incomplete",
          createdAt:
            data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : undefined,
          updatedAt:
            data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : undefined,
        };
      });
      setTasks(nextTasks);
      if (initialFetch) {
        setLoading(false);
        initialFetch = false;
      }
    });

    return () => {
      unsubscribeMeta();
      unsubscribeTasks();
      setLoading(false);
    };
  }, [todoListDocRef]);

  const addTask = useCallback(
    async (input: TodoTaskInput) => {
      if (!todoListDocRef) return;
      try {
        await ensureTodoListDocument();

        const tasksCollection = collection(todoListDocRef, "tasks");
        await addDoc(tasksCollection, {
          ...input,
          dueDate: input.dueDate ? Timestamp.fromDate(new Date(input.dueDate)) : null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Failed to add to-do task", error);
      }
    },
    [todoListDocRef, ensureTodoListDocument]
  );

  const updateTask = useCallback(
    async (taskId: string, input: TodoTaskInput) => {
      if (!todoListDocRef) return;
      try {
        const taskDoc = doc(todoListDocRef, "tasks", taskId);
        await updateDoc(taskDoc, {
          ...input,
          dueDate: input.dueDate ? Timestamp.fromDate(new Date(input.dueDate)) : null,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error("Failed to update to-do task", error);
      }
    },
    [todoListDocRef]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!todoListDocRef) return;
      try {
        const taskDoc = doc(todoListDocRef, "tasks", taskId);
        await deleteDoc(taskDoc);
      } catch (error) {
        console.error("Failed to delete to-do task", error);
      }
    },
    [todoListDocRef]
  );

  const updateColumnTitle = useCallback(
    async (column: TodoColumnKey, title: string) => {
      if (!todoListDocRef) return;
      try {
        await ensureTodoListDocument();
        await setDoc(
          todoListDocRef,
          {
            [`${column === "provider" ? "providerTitle" : "clientTitle"}`]: title,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Failed to update column title", error);
      }
    },
    [todoListDocRef, ensureTodoListDocument]
  );

  return useMemo(
    () => ({
      loading,
      columns,
      tasks,
      addTask,
      updateTask,
      deleteTask,
      updateColumnTitle,
    }),
    [loading, columns, tasks, addTask, updateTask, deleteTask, updateColumnTitle]
  );
};


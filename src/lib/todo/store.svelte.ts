import { invoke } from "@tauri-apps/api/core";
import { parseTodoMarkdown, toggleTaskInMarkdown, DEFAULT_TODO_TEMPLATE, type TodoDocument } from "./parser";

export const todoStore = $state<{
  path: string | null;
  content: string;
  parsed: TodoDocument;
  loading: boolean;
}>({
  path: null,
  content: "",
  parsed: { sections: [], total: 0, completed: 0 },
  loading: false,
});

export function setTodoPath(path: string | null) {
  todoStore.path = path;
  if (path) {
    loadTodoFile(path);
  }
}

export async function loadTodoFile(path: string): Promise<void> {
  todoStore.loading = true;
  try {
    const content = await invoke<string>("read_file", { path });
    todoStore.content = content;
    todoStore.parsed = parseTodoMarkdown(content);
  } catch {
    todoStore.content = "";
    todoStore.parsed = { sections: [], total: 0, completed: 0 };
  } finally {
    todoStore.loading = false;
  }
}

export async function ensureTodoFile(path: string): Promise<void> {
  try {
    const content = await invoke<string>("read_file", { path });
    todoStore.content = content;
    todoStore.parsed = parseTodoMarkdown(content);
    todoStore.path = path;
  } catch {
    // File doesn't exist, create with template
    try {
      await invoke("write_file", { path, contents: DEFAULT_TODO_TEMPLATE });
      todoStore.content = DEFAULT_TODO_TEMPLATE;
      todoStore.parsed = parseTodoMarkdown(DEFAULT_TODO_TEMPLATE);
      todoStore.path = path;
    } catch (e) {
      console.error("Failed to create todo.md", e);
    }
  }
}

export async function toggleTodoTask(lineIndex: number): Promise<void> {
  const path = todoStore.path;
  if (!path) return;
  const updated = toggleTaskInMarkdown(todoStore.content, lineIndex);
  todoStore.content = updated;
  todoStore.parsed = parseTodoMarkdown(updated);
  try {
    await invoke("write_file", { path, contents: updated });
  } catch (e) {
    console.error("Failed to write todo.md", e);
  }
}

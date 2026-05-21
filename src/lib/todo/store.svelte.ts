import { invoke } from "@tauri-apps/api/core";
import {
  parseTodoMarkdown,
  toggleTaskInMarkdown,
  addTaskInMarkdown,
  editTaskInMarkdown,
  deleteTaskInMarkdown,
  addSectionInMarkdown,
  editSectionTitleInMarkdown,
  deleteSectionInMarkdown,
  getDefaultTodoTemplate,
  type TodoDocument,
} from "./parser";

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

function updateStore(content: string) {
  todoStore.content = content;
  todoStore.parsed = parseTodoMarkdown(content);
}

async function persist(content: string): Promise<void> {
  const path = todoStore.path;
  if (!path) return;
  try {
    await invoke("write_file", { path, contents: content });
  } catch (e) {
    console.error("Failed to write todo.md", e);
  }
}

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
    updateStore(content);
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
    updateStore(content);
    todoStore.path = path;
  } catch {
    try {
      await invoke("write_file", { path, contents: getDefaultTodoTemplate() });
      updateStore(getDefaultTodoTemplate());
      todoStore.path = path;
    } catch (e) {
      console.error("Failed to create todo.md", e);
    }
  }
}

export async function toggleTodoTask(lineIndex: number): Promise<void> {
  const updated = toggleTaskInMarkdown(todoStore.content, lineIndex);
  updateStore(updated);
  await persist(updated);
}

export async function addTodoTask(sectionEndLine: number, text: string): Promise<void> {
  if (!text.trim()) return;
  const updated = addTaskInMarkdown(todoStore.content, sectionEndLine, text.trim());
  updateStore(updated);
  await persist(updated);
}

export async function editTodoTask(lineIndex: number, newText: string): Promise<void> {
  if (!newText.trim()) return;
  const updated = editTaskInMarkdown(todoStore.content, lineIndex, newText.trim());
  updateStore(updated);
  await persist(updated);
}

export async function deleteTodoTask(lineIndex: number): Promise<void> {
  const updated = deleteTaskInMarkdown(todoStore.content, lineIndex);
  updateStore(updated);
  await persist(updated);
}

export async function addTodoSection(title: string): Promise<void> {
  if (!title.trim()) return;
  const updated = addSectionInMarkdown(todoStore.content, title.trim());
  updateStore(updated);
  await persist(updated);
}

export async function editTodoSectionTitle(startLine: number, newTitle: string): Promise<void> {
  if (!newTitle.trim()) return;
  const updated = editSectionTitleInMarkdown(todoStore.content, startLine, newTitle.trim());
  updateStore(updated);
  await persist(updated);
}

export async function deleteTodoSection(startLine: number, endLine: number): Promise<void> {
  const updated = deleteSectionInMarkdown(todoStore.content, startLine, endLine);
  updateStore(updated);
  await persist(updated);
}

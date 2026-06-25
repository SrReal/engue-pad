import { invoke } from "@tauri-apps/api/core";

export const notesStore = $state<{
  path: string | null;
  content: string;
  loading: boolean;
}>({
  path: null,
  content: "",
  loading: false,
});

async function persist(content: string): Promise<void> {
  const path = notesStore.path;
  if (!path) return;
  try {
    await invoke("write_file", { path, contents: content });
  } catch (e) {
    console.error("Failed to write notes.md", e);
  }
}

export function setNotesPath(path: string | null) {
  notesStore.path = path;
  if (path) {
    loadNotesFile(path);
  }
}

export async function loadNotesFile(path: string): Promise<void> {
  notesStore.loading = true;
  try {
    const content = await invoke<string>("read_file", { path });
    notesStore.content = content;
  } catch {
    notesStore.content = "";
  } finally {
    notesStore.loading = false;
  }
}

export async function ensureNotesFile(path: string): Promise<void> {
  try {
    const content = await invoke<string>("read_file", { path });
    notesStore.content = content;
    notesStore.path = path;
  } catch {
    try {
      await invoke("write_file", { path, contents: "" });
      notesStore.content = "";
      notesStore.path = path;
    } catch (e) {
      console.error("Failed to create notes.md", e);
    }
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function setNotesContent(content: string): void {
  notesStore.content = content;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persist(content);
  }, 400);
}

export function resetNotesStore(): void {
  notesStore.path = null;
  notesStore.content = "";
  notesStore.loading = false;
}
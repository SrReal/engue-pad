import { writable } from "svelte/store";

export const editorNavigation = writable<{ path: string; offset: number } | null>(null);

import { writable } from "svelte/store";

export const terminalClipboardStore = writable<{ text: string } | null>(null);

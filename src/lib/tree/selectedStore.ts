import { writable } from "svelte/store";

export const selectedTreePath = writable<string | null>(null);

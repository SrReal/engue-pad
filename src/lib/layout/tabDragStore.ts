import { writable } from "svelte/store";

export const tabDrag = writable<{
  tabId: string | null;
  fromNodeId: string | null;
  x: number;
  y: number;
}>({ tabId: null, fromNodeId: null, x: 0, y: 0 });

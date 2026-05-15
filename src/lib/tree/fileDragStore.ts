import { writable } from "svelte/store";

export const fileDrag = writable<{
  path: string | null;
  target: string | null;
  x: number;
  y: number;
}>({ path: null, target: null, x: 0, y: 0 });

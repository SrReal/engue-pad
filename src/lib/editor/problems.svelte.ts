export type Problem = {
  path: string;
  from: number;
  to: number;
  severity: "error" | "warning" | "info";
  message: string;
};

export const problemsStore = $state<{ items: Problem[] }>({ items: [] });

import { setMascotState } from "$lib/mascot/store.svelte";

export function setProblemsForPath(path: string, newProblems: Problem[]) {
  problemsStore.items = problemsStore.items
    .filter((p) => p.path !== path)
    .concat(newProblems);
  if (newProblems.some((p) => p.severity === "error")) {
    setMascotState("failed");
  } else if (newProblems.length > 0) {
    setMascotState("review");
  }
}

export function clearProblemsForPath(path: string) {
  problemsStore.items = problemsStore.items.filter((p) => p.path !== path);
}

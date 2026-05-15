export type Problem = {
  path: string;
  from: number;
  to: number;
  severity: "error" | "warning" | "info";
  message: string;
};

export const problemsStore = $state<{ items: Problem[] }>({ items: [] });

export function setProblemsForPath(path: string, newProblems: Problem[]) {
  problemsStore.items = problemsStore.items
    .filter((p) => p.path !== path)
    .concat(newProblems);
}

export function clearProblemsForPath(path: string) {
  problemsStore.items = problemsStore.items.filter((p) => p.path !== path);
}

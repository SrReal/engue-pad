import { invoke } from "@tauri-apps/api/core";

export type GitFileStatus = {
  status: string;
};

export const gitStore = $state<{
  isRepo: boolean;
  branch: string;
  files: Record<string, string>;
}>({
  isRepo: false,
  branch: "",
  files: {},
});

export async function refreshGitStatus(cwd: string) {
  try {
    const result = await invoke<{
      is_repo: boolean;
      branch: string;
      files: Record<string, string>;
    }>("git_status", { cwd });
    gitStore.isRepo = result.is_repo;
    gitStore.branch = result.branch;
    gitStore.files = result.files;
  } catch {
    gitStore.isRepo = false;
    gitStore.branch = "";
    gitStore.files = {};
  }
}

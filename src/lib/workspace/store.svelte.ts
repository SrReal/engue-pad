import { layoutState, syncTerminalCwds } from "$lib/layout/store.svelte";
import { serializeNode, deserializeNode, type WorkspaceData, type LinterConfig } from "./persist";
import { SKILL_FILES } from "./skills";

export type WorkspaceInfo = {
  rootPath: string | null;
  workspaceId: string | null;
};

export const workspaceInfo = $state<WorkspaceInfo>({ rootPath: null, workspaceId: null });

export const linterConfig = $state<LinterConfig>({ enabled: true, runOnSave: false, runOnType: true });

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export async function loadWorkspace(rootPath: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");

  const exists = await invoke<boolean>("dir_exists", { path: rootPath });
  if (!exists) {
    console.warn("Project directory no longer exists:", rootPath);
    throw new Error(`Directory does not exist: ${rootPath}`);
  }

  const workspacePath = `${rootPath}/.enguepad/workspace.json`;

  try {
    const raw = await invoke<string>("read_file", { path: workspacePath });
    const data: WorkspaceData = JSON.parse(raw);
    if (data.version !== 1) {
      console.warn("Unknown workspace version", data.version);
      return;
    }

    workspaceInfo.workspaceId = data.workspaceId;
    layoutState.root = deserializeNode(data.layout.root, rootPath);
    layoutState.activeNodeId = data.layout.activeNodeId;
    if (data.linter) {
      linterConfig.enabled = data.linter.enabled;
      linterConfig.runOnSave = data.linter.runOnSave;
      linterConfig.runOnType = data.linter.runOnType;
      if (data.linter.languages) {
        linterConfig.languages = data.linter.languages;
      }
    }
  } catch {
    const workspaceId = crypto.randomUUID();
    workspaceInfo.workspaceId = workspaceId;
    const data: WorkspaceData = {
      workspaceId,
      version: 1,
      layout: {
        root: serializeNode(layoutState.root, rootPath),
        activeNodeId: layoutState.activeNodeId,
      },
    };

    try {
      await invoke("ensure_dir", { path: `${rootPath}/.enguepad` });
      await invoke("write_file", { path: workspacePath, contents: JSON.stringify(data, null, 2) });

      // Create .enguepad/skills/ with default skill files
      await invoke("ensure_dir", { path: `${rootPath}/.enguepad/skills` });
      for (const [relPath, content] of Object.entries(SKILL_FILES)) {
        const filePath = `${rootPath}/${relPath}`;
        try {
          await invoke("write_file", { path: filePath, contents: content });
        } catch {
          // ignore skill write errors
        }
      }
    } catch (writeErr) {
      console.error("Failed to create workspace.json", writeErr);
    }
  }
}

export function scheduleSaveWorkspace(): void {
  const rootPath = workspaceInfo.rootPath;
  if (!rootPath) return;

  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveWorkspace(rootPath);
  }, 500);
}

async function saveWorkspace(rootPath: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  const workspacePath = `${rootPath}/.enguepad/workspace.json`;

  const updatedRoot = await syncTerminalCwds(layoutState.root);

  const data: WorkspaceData = {
    workspaceId: workspaceInfo.workspaceId ?? crypto.randomUUID(),
    version: 1,
    layout: {
      root: serializeNode(updatedRoot, rootPath),
      activeNodeId: layoutState.activeNodeId,
    },
    linter: { ...linterConfig },
  };

  try {
    await invoke("ensure_dir", { path: `${rootPath}/.enguepad` });
    await invoke("write_file", { path: workspacePath, contents: JSON.stringify(data, null, 2) });
  } catch (e) {
    console.error("Failed to save workspace", e);
  }
}

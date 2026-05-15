<script lang="ts">
  import { onMount } from "svelte";
  import { listen } from "@tauri-apps/api/event";
  import { invoke } from "@tauri-apps/api/core";
  import { layoutState, splitNode, findAllDirtyTabs, resetLayout } from "$lib/layout/store.svelte";
  import { workspaceInfo, loadWorkspace, scheduleSaveWorkspace } from "$lib/workspace/store.svelte";
  import { loadSettings, saveSettings } from "$lib/workspace/settings";
  import LayoutNode from "./LayoutNode.svelte";
  import FileTree from "./FileTree.svelte";
  import StatusBar from "./StatusBar.svelte";
  import ProcessFooter from "./ProcessFooter.svelte";
  import ProblemsPanel from "./ProblemsPanel.svelte";
  import UrlToast from "./UrlToast.svelte";
  import { open, confirm } from "@tauri-apps/plugin-dialog";

  let sidebarWidth = $state(240);
  let isResizingSidebar = $state(false);
  let sidebarCollapsed = $state(false);
  let refreshSignal = $state(0);
  let lastSidebarWidth = $state(240);
  let showProblems = $state(false);

  onMount(async () => {
    const settings = await loadSettings();
    if (settings.lastProjectPath) {
      workspaceInfo.rootPath = settings.lastProjectPath;
    }

    const unlistenClose = await listen("request-app-close", async () => {
      const dirtyTabs = findAllDirtyTabs(layoutState.root);
      if (dirtyTabs.length > 0) {
        const names = dirtyTabs.map((t) => `"${t.title}"`).join(", ");
        const confirmed = await confirm(`${names} has unsaved changes. Quit without saving?`, { title: "Quit", kind: "warning" });
        if (confirmed) {
          await invoke("exit_app");
        }
      } else {
        await invoke("exit_app");
      }
    });

    return () => {
      unlistenClose();
    };
  });

  $effect(() => {
    const root = workspaceInfo.rootPath;
    if (root) {
      loadWorkspace(root);
    }
  });

  $effect(() => {
    const root = workspaceInfo.rootPath;
    if (!root) return;
    const _ = layoutState.root;
    const __ = layoutState.activeNodeId;
    scheduleSaveWorkspace();
  });

  function onSidebarPointerDown(e: PointerEvent) {
    isResizingSidebar = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onSidebarPointerMove(e: PointerEvent) {
    if (!isResizingSidebar) return;
    sidebarWidth = Math.max(160, Math.min(400, e.clientX));
    if (sidebarWidth > 40) lastSidebarWidth = sidebarWidth;
  }

  function onSidebarPointerUp() {
    isResizingSidebar = false;
  }

  function addHorizontalSplit() {
    const targetId = layoutState.activeNodeId ?? layoutState.root.id;
    splitNode(targetId, "horizontal");
  }

  function addVerticalSplit() {
    const targetId = layoutState.activeNodeId ?? layoutState.root.id;
    splitNode(targetId, "vertical");
  }

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    if (sidebarCollapsed) {
      lastSidebarWidth = sidebarWidth;
      sidebarWidth = 0;
    } else {
      sidebarWidth = lastSidebarWidth || 240;
    }
  }

  async function openFolder() {
    const selected = await open({ directory: true });
    if (selected && typeof selected === "string") {
      const dirtyTabs = findAllDirtyTabs(layoutState.root);
      if (dirtyTabs.length > 0) {
        const names = dirtyTabs.map((t) => `"${t.title}"`).join(", ");
        const confirmed = await confirm(`${names} has unsaved changes. Switch project without saving?`, { title: "Switch Project", kind: "warning" });
        if (!confirmed) return;
      }
      resetLayout();
      workspaceInfo.rootPath = selected;
      await saveSettings({ lastProjectPath: selected });
    }
  }

  function triggerRefresh() {
    refreshSignal++;
  }

</script>

<div class="app-layout">
  <header class="top-bar">
    <button class="icon-btn" onclick={toggleSidebar} title="Toggle sidebar">☰</button>
    <span class="logo">EnguePad</span>
    <button class="icon-btn" onclick={openFolder} title="Open folder">📂</button>
    <button class="icon-btn" onclick={triggerRefresh} title="Refresh tree">🔄</button>
    <button class="icon-btn" onclick={addHorizontalSplit} title="Split horizontal">⧈</button>
    <button class="icon-btn" onclick={addVerticalSplit} title="Split vertical">⧉</button>
  </header>
  <div class="body">
    <aside class="sidebar" class:collapsed={sidebarCollapsed} style:width="{sidebarCollapsed ? 0 : sidebarWidth}px">
      <div class="sidebar-content">
        {#if workspaceInfo.rootPath}
          <FileTree rootPath={workspaceInfo.rootPath} {refreshSignal} />
        {:else}
          <div class="placeholder">
            <button class="open-btn" onclick={openFolder}>Open folder</button>
          </div>
        {/if}
      </div>
    </aside>
    {#if !sidebarCollapsed}
      <div
        class="sidebar-divider"
        onpointerdown={onSidebarPointerDown}
        onpointermove={onSidebarPointerMove}
        onpointerup={onSidebarPointerUp}
        role="separator"
        aria-orientation="vertical"
      ></div>
    {/if}
    <main class="main-area">
      <div class="editor-area">
        <LayoutNode node={layoutState.root} />
      </div>
      {#if showProblems}
        <div class="problems-area">
          <ProblemsPanel />
        </div>
      {/if}
      <ProcessFooter />
      <StatusBar toggleProblems={() => showProblems = !showProblems} {showProblems} />
    </main>
  </div>
  <UrlToast />
</div>

<style>
  .app-layout {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: var(--bg-app, #1a1a1a);
    color: var(--text-color, #ccc);
  }

  .top-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-bottom: 1px solid var(--border-color, #333);
    background: var(--bg-sidebar, #252526);
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .logo {
    color: var(--accent-color, #4a9eff);
    user-select: none;
    -webkit-user-select: none;
    margin-right: auto;
  }

  .icon-btn {
    background: transparent;
    border: none;
    color: var(--text-color, #ccc);
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 3px;
    user-select: none;
    -webkit-user-select: none;
    font-size: 16px;
  }

  .icon-btn:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    background: var(--bg-sidebar, #252526);
    flex-shrink: 0;
    min-width: 160px;
    max-width: 400px;
  }

  .sidebar-content {
    flex: 1;
    overflow: auto;
    padding: 8px;
  }

  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .open-btn {
    background: var(--accent-color, #4a9eff);
    border: none;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }

  .open-btn:hover {
    opacity: 0.9;
  }

  .sidebar-divider {
    width: 4px;
    flex-shrink: 0;
    cursor: col-resize;
    background: var(--border-color, #333);
  }

  .sidebar-divider:hover {
    background: var(--accent-color, #4a9eff);
  }

  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  .editor-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .problems-area {
    height: 180px;
    flex-shrink: 0;
    border-top: 1px solid var(--border-color, #333);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .sidebar.collapsed {
    overflow: hidden;
    padding: 0;
    min-width: 0;
  }

  .sidebar.collapsed .sidebar-content {
    display: none;
  }
</style>

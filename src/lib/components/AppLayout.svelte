<script lang="ts">
  import { onMount } from "svelte";
  import { listen } from "@tauri-apps/api/event";
  import { invoke } from "@tauri-apps/api/core";
  import { layoutState, findAllDirtyTabs, resetLayout, activateNextTab, activatePrevTab, closeActiveTab } from "$lib/layout/store.svelte";
  import { workspaceInfo, loadWorkspace, scheduleSaveWorkspace } from "$lib/workspace/store.svelte";
  import { setTodoPath, ensureTodoFile, loadTodoFile } from "$lib/todo/store.svelte";
  import { loadSettings, saveSettings } from "$lib/workspace/settings";
  import { appSettings, updateAppSettings } from "$lib/workspace/settingsStore.svelte";
  import LayoutNode from "./LayoutNode.svelte";
  import FileTree from "./FileTree.svelte";
  import TodoPanel from "./TodoPanel.svelte";
  import StatusBar from "./StatusBar.svelte";
  import SidebarFooter from "./SidebarFooter.svelte";
  import ProcessFooter from "./ProcessFooter.svelte";
  import ProblemsPanel from "./ProblemsPanel.svelte";
  import UrlToast from "./UrlToast.svelte";
  import SettingsModal from "./SettingsModal.svelte";
  import MascotPanel from "./MascotPanel.svelte";
  import { open, confirm } from "@tauri-apps/plugin-dialog";
  import { setMascotState, updateMascotSettings } from "$lib/mascot/store.svelte";

  let sidebarWidth = $state(240);
  let isResizingSidebar = $state(false);
  let sidebarCollapsed = $state(false);
  let refreshSignal = $state(0);
  let lastSidebarWidth = $state(240);
  let showProblems = $state(false);
  let showSettings = $state(false);

  let rightSidebarWidth = $state(260);
  let isResizingRightSidebar = $state(false);
  let rightSidebarCollapsed = $state(false);
  let lastRightSidebarWidth = $state(260);

  onMount(async () => {
    const settings = await loadSettings();
    updateAppSettings(settings);
    if (settings.mascot?.enabled && (!settings.mascot.position || (settings.mascot.position.x <= 50 && settings.mascot.position.y <= 50))) {
      const size = settings.mascot.size === "small" ? 96 : 160;
      updateMascotSettings({
        position: {
          x: Math.round((window.innerWidth - size) / 2),
          y: Math.round((window.innerHeight - size) / 2),
        },
      });
    }
    if (settings.restoreLayout !== false && settings.lastProjectPath) {
      workspaceInfo.rootPath = settings.lastProjectPath;
    }
    if (typeof settings.rightSidebarCollapsed === "boolean") {
      rightSidebarCollapsed = settings.rightSidebarCollapsed;
    }
    if (typeof settings.rightSidebarWidth === "number" && settings.rightSidebarWidth >= 160) {
      rightSidebarWidth = settings.rightSidebarWidth;
      lastRightSidebarWidth = settings.rightSidebarWidth;
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

  let gitRefreshInterval = $state(5000);

  $effect(() => {
    const root = workspaceInfo.rootPath;
    if (root) {
      loadWorkspace(root);
      loadSettings().then((s) => {
        gitRefreshInterval = (s.git?.refreshInterval ?? 5) * 1000;
        if (s.mascot?.enabled && s.mascot?.currentMascot) {
          setMascotState("wave");
        }
      });
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

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    if (sidebarCollapsed) {
      lastSidebarWidth = sidebarWidth;
      sidebarWidth = 0;
    } else {
      sidebarWidth = lastSidebarWidth || 240;
    }
  }

  function onRightSidebarPointerDown(e: PointerEvent) {
    isResizingRightSidebar = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onRightSidebarPointerMove(e: PointerEvent) {
    if (!isResizingRightSidebar) return;
    const w = window.innerWidth - e.clientX;
    rightSidebarWidth = Math.max(200, Math.min(400, w));
    if (rightSidebarWidth > 40) lastRightSidebarWidth = rightSidebarWidth;
  }

  function onRightSidebarPointerUp() {
    isResizingRightSidebar = false;
  }

  function toggleRightSidebar() {
    rightSidebarCollapsed = !rightSidebarCollapsed;
    if (rightSidebarCollapsed) {
      lastRightSidebarWidth = rightSidebarWidth;
      rightSidebarWidth = 0;
    } else {
      rightSidebarWidth = lastRightSidebarWidth || 260;
    }
    saveSidebarState();
  }

  function saveSidebarState() {
    saveSettings({
      lastProjectPath: workspaceInfo.rootPath,
      rightSidebarCollapsed,
      rightSidebarWidth: rightSidebarCollapsed ? lastRightSidebarWidth : rightSidebarWidth,
    });
  }

  $effect(() => {
    if (isResizingRightSidebar) return;
    const _w = rightSidebarWidth;
    const _c = rightSidebarCollapsed;
    if (workspaceInfo.rootPath) {
      saveSidebarState();
    }
  });

  $effect(() => {
    const zoom = appSettings.zoom ?? 1;
    const uiFontSize = appSettings.uiFontSize ?? 13;
    const theme = appSettings.theme ?? "dark";
    document.documentElement.style.setProperty("--app-zoom", String(zoom));
    document.documentElement.style.setProperty("--app-ui-font-size", `${uiFontSize}px`);
    document.body.classList.remove("theme-dark", "theme-light");
    if (theme === "auto") {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      document.body.classList.add(prefersLight ? "theme-light" : "theme-dark");
    } else {
      document.body.classList.add(`theme-${theme}`);
    }
  });

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

  function handleGlobalKeydown(e: KeyboardEvent) {
    // Skip if typing in an input or editor
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.closest(".cm-editor")) {
      // Still allow Ctrl+W and Ctrl+Tab even in editor
      if (!e.ctrlKey && !e.metaKey) return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;

    if (e.key === "w") {
      e.preventDefault();
      closeActiveTab();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) activatePrevTab();
      else activateNextTab();
      return;
    }
  }

  function triggerRefresh() {
    refreshSignal++;
  }

  $effect(() => {
    const root = workspaceInfo.rootPath;
    if (!root) return;
    const todoPath = `${root}/.enguepad/todo.md`;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    let unwatch: (() => void) | null = null;

    async function startWatch() {
      await ensureTodoFile(todoPath);
      try {
        const { watch } = await import("@tauri-apps/plugin-fs");
        unwatch = await watch(todoPath, () => {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            loadTodoFile(todoPath);
          }, 300);
        });
      } catch {
        // watch not available
      }
    }
    startWatch();

    return () => {
      if (timeout) clearTimeout(timeout);
      unwatch?.();
    };
  });

</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="app-layout">
  <header class="top-bar">
    <button class="icon-btn" onclick={toggleSidebar} title="Toggle sidebar">☰</button>
    <span class="logo">EnguePad</span>
    <button class="icon-btn" onclick={openFolder} title="Open folder">📂</button>
    <button class="icon-btn" onclick={triggerRefresh} title="Refresh tree">🔄</button>
    <button class="icon-btn" onclick={toggleRightSidebar} title="Toggle tasks sidebar">📝</button>
    <button class="icon-btn" onclick={() => showSettings = true} title="Settings">⚙️</button>
  </header>
  <div class="body">
    <aside class="sidebar" class:collapsed={sidebarCollapsed} style:width="{sidebarCollapsed ? 0 : sidebarWidth}px">
      <div class="sidebar-content">
        {#if !workspaceInfo.rootPath}
          <div class="placeholder">
            <button class="open-btn" onclick={openFolder}>Open folder</button>
          </div>
        {:else}
          <FileTree rootPath={workspaceInfo.rootPath} {refreshSignal} />
        {/if}
      </div>
      <SidebarFooter />
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
          <ProblemsPanel onClose={() => showProblems = false} />
        </div>
      {/if}
      <ProcessFooter />
      <StatusBar toggleProblems={() => showProblems = !showProblems} {showProblems} />
    </main>
    {#if !rightSidebarCollapsed}
      <div
        class="sidebar-divider"
        onpointerdown={onRightSidebarPointerDown}
        onpointermove={onRightSidebarPointerMove}
        onpointerup={onRightSidebarPointerUp}
        role="separator"
        aria-orientation="vertical"
      ></div>
    {/if}
    <aside class="right-sidebar" class:collapsed={rightSidebarCollapsed} style:width="{rightSidebarCollapsed ? 0 : rightSidebarWidth}px">
      <div class="right-sidebar-content">
        <TodoPanel />
      </div>
    </aside>
  </div>
  <UrlToast />
  <SettingsModal bind:show={showSettings} />
  <MascotPanel />
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
    zoom: var(--app-zoom, 1);
    font-size: var(--app-ui-font-size, 13px);
  }

  .top-bar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-bottom: 1px solid var(--border-color, #333);
    background: var(--bg-sidebar, #252526);
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

  .right-sidebar {
    display: flex;
    flex-direction: column;
    background: var(--bg-sidebar, #252526);
    flex-shrink: 0;
    min-width: 200px;
    max-width: 400px;
  }

  .right-sidebar.collapsed {
    overflow: hidden;
    padding: 0;
    min-width: 0;
  }

  .right-sidebar.collapsed .right-sidebar-content {
    display: none;
  }

  .right-sidebar-content {
    flex: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
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

<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { listen } from "@tauri-apps/api/event";
  import { invoke } from "@tauri-apps/api/core";
  import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
  import { layoutState, findAllDirtyTabs, resetLayout, activateNextTab, activatePrevTab, closeActiveTab, addSearchTab, addTab } from "$lib/layout/store.svelte";
  import { workspaceInfo, loadWorkspace, scheduleSaveWorkspace } from "$lib/workspace/store.svelte";
  import { todoStore, setTodoPath, ensureTodoFile, loadTodoFile } from "$lib/todo/store.svelte";
  import { ensureNotesFile, loadNotesFile, resetNotesStore } from "$lib/notes/store.svelte";
  import { loadSettings, saveSettings, addRecentFolder } from "$lib/workspace/settings";
  import { appSettings, updateAppSettings } from "$lib/workspace/settingsStore.svelte";
  import LayoutNode from "./LayoutNode.svelte";
  import FileTree from "./FileTree.svelte";
  import TodoPanel from "./TodoPanel.svelte";
  import NotesPanel from "./NotesPanel.svelte";
  import SidebarFooter from "./SidebarFooter.svelte";
  import SymbolPanel from "./SymbolPanel.svelte";
  import AppFooter from "./AppFooter.svelte";
  import UrlToast from "./UrlToast.svelte";
  import SettingsModal from "./SettingsModal.svelte";
  import LoadingScreen from "./LoadingScreen.svelte";
  import WelcomeScreen from "./WelcomeScreen.svelte";
  import CommandPalette from "./CommandPalette.svelte";
  import { open, confirm } from "@tauri-apps/plugin-dialog";
  import { SidebarSimple, FolderOpen, NotePencil, Gear, SquaresFour } from "phosphor-svelte";
  import { setLocale, t } from "$lib/i18n";
  const projectName = $derived(workspaceInfo.rootPath ? workspaceInfo.rootPath.split(/[\\/]/).pop() ?? t("appName") : t("appName"));

  $effect(() => {
    const title = projectName || t("appName");
    document.title = title;
    getCurrentWebviewWindow().setTitle(title).catch(() => {});
  });

  let sidebarWidth = $state(240);
  let isResizingSidebar = $state(false);
  let sidebarCollapsed = $state(false);
  let lastSidebarWidth = $state(240);
  let refreshSignal = $state(0);
  let showSettings = $state(false);
  let sidebarMode = $state<"files" | "outline">("files");
  let rightSidebarMode = $state<"todo" | "notes">("todo");

  let rightSidebarWidth = $state(260);
  let isResizingRightSidebar = $state(false);
  let rightSidebarCollapsed = $state(false);
  let lastRightSidebarWidth = $state(260);

  let unlistenClose: (() => void) | null = null;

  let isLoading = $state(true);
  let showCommandPalette = $state(false);
  let recentFolders = $state<string[]>([]);

  let searchQuery = $state("");

  onMount(async () => {
    const settings = await loadSettings();
    updateAppSettings(settings);
    recentFolders = settings.recentFolders ?? [];
    if (settings.locale) {
      setLocale(settings.locale);
    }
    const isFresh = new URLSearchParams(window.location.search).get("fresh") === "1";
    if (isFresh) {
      isLoading = false;
    } else if (settings.restoreLayout !== false && settings.lastProjectPath) {
      const exists = await invoke<boolean>("dir_exists", { path: settings.lastProjectPath });
      if (exists) {
        workspaceInfo.rootPath = settings.lastProjectPath;
      } else {
        // Directory was deleted; clear saved path
        await saveSettings({ ...settings, lastProjectPath: null });
        isLoading = false;
      }
    } else {
      isLoading = false;
    }
    if (typeof settings.rightSidebarCollapsed === "boolean") {
      rightSidebarCollapsed = settings.rightSidebarCollapsed;
    }
    if (typeof settings.rightSidebarWidth === "number" && settings.rightSidebarWidth >= 160 && settings.rightSidebarWidth <= 700) {
      rightSidebarWidth = settings.rightSidebarWidth;
      lastRightSidebarWidth = settings.rightSidebarWidth;
    }

    unlistenClose = await listen<string>("request-app-close", async (event) => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const myLabel = getCurrentWindow().label;
      if (event.payload !== myLabel) return;
      const dirtyTabs = findAllDirtyTabs(layoutState.root);
      if (dirtyTabs.length > 0) {
        const names = dirtyTabs.map((t) => `"${t.title}"`).join(", ");
        const confirmed = await confirm(t("dialogQuitBody", names), { title: t("dialogQuitTitle"), kind: "warning" });
        if (!confirmed) return;
      }
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const all = await WebviewWindow.getAll();
      if (all.length > 1) {
        await invoke("close_current_window");
      } else {
        await invoke("exit_app");
      }
    });
  });

  onDestroy(() => {
    unlistenClose?.();
  });

  let gitRefreshInterval = $state(5000);

  $effect(() => {
    const root = workspaceInfo.rootPath;
    if (root) {
      Promise.all([
        loadWorkspace(root).catch(() => {
          // Directory no longer exists; reset
          workspaceInfo.rootPath = null;
        }),
        loadSettings().then(async (s) => {
          gitRefreshInterval = (s.git?.refreshInterval ?? 5) * 1000;
        }),
      ]).finally(() => {
        isLoading = false;
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
    rightSidebarWidth = Math.max(200, Math.min(700, w));
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
      ...appSettings,
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
    document.documentElement.style.setProperty("--app-zoom", String(zoom));
    document.documentElement.style.setProperty("--app-ui-font-size", `${uiFontSize}px`);
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add("theme-dark");
  });

  async function openFolder() {
    const selected = await open({ directory: true });
    if (selected && typeof selected === "string") {
      const dirtyTabs = findAllDirtyTabs(layoutState.root);
      if (dirtyTabs.length > 0) {
        const names = dirtyTabs.map((t) => `"${t.title}"`).join(", ");
        const confirmed = await confirm(t("dialogSwitchProjectBody", names), { title: t("dialogSwitchProjectTitle"), kind: "warning" });
        if (!confirmed) return;
      }
      // Full reset before switching
      resetLayout();
      todoStore.path = null;
      todoStore.content = "";
      todoStore.parsed = { sections: [], total: 0, completed: 0 };
      todoStore.loading = false;
      resetNotesStore();
      refreshSignal++;
      workspaceInfo.rootPath = selected;
      const updated = addRecentFolder(appSettings, selected);
      recentFolders = updated.recentFolders ?? [];
      await saveSettings({ ...updated, lastProjectPath: selected });
    }
  }

  async function openRecentFolder(path: string) {
    const dirtyTabs = findAllDirtyTabs(layoutState.root);
    if (dirtyTabs.length > 0) {
      const names = dirtyTabs.map((t) => `"${t.title}"`).join(", ");
      const confirmed = await confirm(t("dialogSwitchProjectBody", names), { title: t("dialogSwitchProjectTitle"), kind: "warning" });
      if (!confirmed) return;
    }
    const exists = await invoke<boolean>("dir_exists", { path });
    if (!exists) {
      const filtered = recentFolders.filter((p) => p !== path);
      recentFolders = filtered;
      await saveSettings({ ...appSettings, recentFolders: filtered });
      return;
    }
    resetLayout();
    todoStore.path = null;
    todoStore.content = "";
    todoStore.parsed = { sections: [], total: 0, completed: 0 };
    todoStore.loading = false;
    resetNotesStore();
    refreshSignal++;
    workspaceInfo.rootPath = path;
    const updated = addRecentFolder(appSettings, path);
    recentFolders = updated.recentFolders ?? [];
    await saveSettings({ ...updated, lastProjectPath: path });
  }

  async function removeRecentFolder(path: string) {
    const filtered = recentFolders.filter((p) => p !== path);
    recentFolders = filtered;
    await saveSettings({ ...appSettings, recentFolders: filtered });
  }

  function findActiveEditorTab(): { path?: string } | null {
    const nodeId = layoutState.activeNodeId;
    if (!nodeId) return null;
    function find(node: any): any {
      if (node.kind === "tab-group" && node.id === nodeId) {
        const tab = node.tabs.find((t: any) => t.id === node.activeTabId);
        return tab ?? null;
      }
      if (node.kind === "split") {
        return find(node.first) ?? find(node.second);
      }
      return null;
    }
    return find(layoutState.root);
  }

  async function runSearch() {
    const q = searchQuery.trim();
    if (!q || !workspaceInfo.rootPath) return;
    const results = await invoke<{ path: string; line: number; text: string }[]>("find_in_project", { path: workspaceInfo.rootPath, query: q });
    const nodeId = layoutState.activeNodeId ?? layoutState.root.id;
    addSearchTab(nodeId, q, true, results);
    searchQuery = "";
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

    if (e.key === "p") {
      e.preventDefault();
      if (workspaceInfo.rootPath) {
        showCommandPalette = true;
      }
      return;
    }
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

  function openFileFromPalette(path: string) {
    const nodeId = layoutState.activeNodeId ?? layoutState.root.id;
    addTab(nodeId, { id: path, title: path.split(/[\\/]/).pop() ?? path, path });
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

  $effect(() => {
    const root = workspaceInfo.rootPath;
    if (!root) return;
    const notesPath = `${root}/.enguepad/notes.md`;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let unwatch: (() => void) | null = null;

    async function startWatch() {
      await ensureNotesFile(notesPath);
      if (cancelled) return;
      try {
        const { watch } = await import("@tauri-apps/plugin-fs");
        if (cancelled) return;
        unwatch = await watch(notesPath, () => {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            loadNotesFile(notesPath);
          }, 300);
        });
      } catch {
        // watch not available
      }
    }
    startWatch();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      unwatch?.();
    };
  });

  $effect(() => {
    const root = workspaceInfo.rootPath;
    if (root) return;
    let cancelled = false;
    let unwatch: (() => void) | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    (async () => {
      try {
        const appDataDir = await invoke<string>("get_app_data_dir");
        if (cancelled || !appDataDir) return;
        await invoke("ensure_dir", { path: appDataDir });
        const notesPath = `${appDataDir}/notes.md`;
        await ensureNotesFile(notesPath);
        try {
          const { watch } = await import("@tauri-apps/plugin-fs");
          unwatch = await watch(notesPath, () => {
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => {
              loadNotesFile(notesPath);
            }, 300);
          });
        } catch {
          // watch not available
        }
      } catch (e) {
        console.error("Failed to init global notes", e);
      }
    })();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      unwatch?.();
    };
  });

</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="app-layout">
  <header class="top-bar">
    <div class="app-brand">
      <img class="brand-icon" src="/favicon.png" alt="" />
      <span class="app-name">{t("appName")}</span>
    </div>
    <div class="header-actions">
      {#if workspaceInfo.rootPath}
        <button class="icon-btn" onclick={toggleSidebar} title={t("headerToggleSidebar")}><SidebarSimple size={18} /></button>
      {/if}
      <button class="icon-btn" onclick={openFolder} title={t("headerOpenFolder")}><FolderOpen size={18} /></button>
      <button class="icon-btn" onclick={() => invoke("create_new_window")} title={t("headerNewWindow")}><SquaresFour size={18} /></button>
      {#if workspaceInfo.rootPath}
        <button class="icon-btn" class:active={!rightSidebarCollapsed} onclick={toggleRightSidebar} title={t("headerToggleTasksSidebar")}><NotePencil size={18} /></button>
      {/if}
      <button class="icon-btn" onclick={() => showSettings = true} title={t("headerSettings")}><Gear size={18} /></button>
      {#if workspaceInfo.rootPath}
        <div class="header-search">
          <input
            type="text"
            bind:value={searchQuery}
            placeholder={t("headerSearchPlaceholder")}
            onkeydown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); runSearch(); }
            }}
          />
        </div>
      {/if}
    </div>
    <span class="logo">{projectName}</span>
  </header>
  <div class="body">
    {#if workspaceInfo.rootPath}
      <aside class="sidebar" class:collapsed={sidebarCollapsed} style:width="{sidebarCollapsed ? 0 : sidebarWidth}px">
        <div class="sidebar-tabs">
          <button class="sidebar-tab" class:active={sidebarMode === "files"} onclick={() => sidebarMode = "files"}>{t("treeOpen")}</button>
          <button class="sidebar-tab" class:active={sidebarMode === "outline"} onclick={() => sidebarMode = "outline"}>{t("symbolPanelTitle")}</button>
        </div>
        <div class="sidebar-content">
          {#if sidebarMode === "files"}
            <FileTree rootPath={workspaceInfo.rootPath} {refreshSignal} />
          {:else}
            <SymbolPanel />
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
    {/if}
    <main class="main-area">
      {#if !workspaceInfo.rootPath}
        <WelcomeScreen {recentFolders} onOpenFolder={openFolder} onOpenRecent={openRecentFolder} onRemoveRecent={removeRecentFolder} />
      {:else}
        <div class="editor-area">
          <LayoutNode node={layoutState.root} />
        </div>
        <AppFooter />
      {/if}
    </main>
    {#if workspaceInfo.rootPath}
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
        {#if !rightSidebarCollapsed}
          <div class="right-sidebar-tabs">
            <button class="right-sidebar-tab" class:active={rightSidebarMode === "todo"} onclick={() => rightSidebarMode = "todo"}>{t("rightSidebarTabTodo")}</button>
            <button class="right-sidebar-tab" class:active={rightSidebarMode === "notes"} onclick={() => rightSidebarMode = "notes"}>{t("rightSidebarTabNotes")}</button>
          </div>
          <div class="right-sidebar-content">
            {#if rightSidebarMode === "todo"}
              <TodoPanel />
            {:else}
              <NotesPanel />
            {/if}
          </div>
        {/if}
      </aside>
    {/if}
  </div>
  <UrlToast />
  <SettingsModal bind:show={showSettings} />
  {#if showCommandPalette && workspaceInfo.rootPath}
    <CommandPalette rootPath={workspaceInfo.rootPath} onSelect={openFileFromPalette} onClose={() => showCommandPalette = false} />
  {/if}
  {#if isLoading}
    <LoadingScreen />
  {/if}
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
    gap: 10px;
    min-height: 48px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--border-color, #333);
    background: linear-gradient(180deg, #0d1725 0%, var(--bg-tab-bar, #0b1220) 100%);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset;
    font-weight: 400;
    flex-shrink: 0;
  }

  .app-brand {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--text-color, #ccc);
    user-select: none;
    -webkit-user-select: none;
    flex-shrink: 0;
  }

  .brand-icon {
    width: 30px;
    height: 30px;
    border-radius: 7px;
    box-shadow: 0 0 0 1px rgba(14, 165, 255, 0.35), 0 8px 20px rgba(0, 0, 0, 0.28);
  }

  .app-name {
    font-size: 18px;
    font-weight: 400;
    letter-spacing: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
  }

  .logo {
    color: var(--text-muted, #888);
    user-select: none;
    -webkit-user-select: none;
    flex-shrink: 0;
    font-weight: 500;
    font-size: 13px;
  }

  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    background: rgba(17, 24, 39, 0.72);
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    cursor: pointer;
    padding: 0;
    border-radius: 7px;
    user-select: none;
    -webkit-user-select: none;
    font-size: 16px;
    transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
  }

  .icon-btn:hover {
    background: var(--bg-tab-hover, #3d3d3d);
    border-color: var(--accent-color, #4a9eff);
    color: var(--accent-cyan, #00e5ff);
  }

  .icon-btn.active {
    background: var(--accent-color, #0ea5ff);
    border-color: var(--accent-color, #0ea5ff);
    color: #ffffff;
  }

  .body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding: 8px;
  }

  .sidebar,
  .right-sidebar {
    border: 1px solid var(--border-color, #333);
    border-radius: 8px;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
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
    max-width: 700px;
  }

  .right-sidebar-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color, #333);
    flex-shrink: 0;
  }

  .right-sidebar-tab {
    flex: 1;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-muted, #888);
    padding: 6px 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
  }

  .right-sidebar-tab.active {
    color: var(--accent-color, #4a9eff);
    border-bottom-color: var(--accent-color, #4a9eff);
  }

  .right-sidebar-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .right-sidebar.collapsed {
    overflow: hidden;
    padding: 0;
    min-width: 0;
    border: none;
    box-shadow: none;
  }

  .sidebar-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color, #333);
    flex-shrink: 0;
  }

  .sidebar-tab {
    flex: 1;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-muted, #888);
    padding: 6px 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
  }

  .sidebar-tab.active {
    color: var(--accent-color, #4a9eff);
    border-bottom-color: var(--accent-color, #4a9eff);
  }

  .sidebar-content {
    flex: 1;
    overflow: auto;
    padding: 10px 8px;
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
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
  }

  .open-btn:hover {
    background: var(--accent-hover, #0d8cff);
  }

  .sidebar-divider {
    width: 8px;
    flex-shrink: 0;
    cursor: col-resize;
    background: transparent;
    z-index: 2;
  }

  .sidebar-divider:hover {
    background: linear-gradient(90deg, transparent 3px, var(--accent-color, #4a9eff) 3px, var(--accent-color, #4a9eff) 5px, transparent 5px);
  }

  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    min-height: 0;
    background: transparent;
    overflow: hidden;
  }

  .editor-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }


  .sidebar.collapsed {
    overflow: hidden;
    padding: 0;
    min-width: 0;
    border: none;
    box-shadow: none;
  }

  .sidebar.collapsed .sidebar-content {
    display: none;
  }

  .header-search {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    max-width: 480px;
    min-width: 0;
  }

  .header-search input {
    flex: 1;
    background: var(--bg-surface, #111827);
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    padding: 0 10px;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1;
    outline: none;
    min-width: 0;
    height: 34px;
    box-sizing: border-box;
  }

  .header-search input:focus {
    border-color: var(--accent-color, #4a9eff);
  }



</style>

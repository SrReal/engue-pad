<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { layoutState } from "$lib/layout/store.svelte";
  import { todoStore } from "$lib/todo/store.svelte";
  import type { LayoutNode, Tab } from "$lib/layout/types";
  import { t } from "$lib/i18n";
  import { formatRequest } from "$lib/editor/formatRequest.svelte";
  import { NotePencil, MagicWand } from "phosphor-svelte";


  function findActiveTab(root: LayoutNode, activeNodeId: string | null): Tab | null {
    if (!activeNodeId) return null;
    if (root.kind === "tab-group" && root.id === activeNodeId) {
      return root.tabs.find((t) => t.id === root.activeTabId) ?? null;
    }
    if (root.kind === "split") {
      return findActiveTab(root.first, activeNodeId) ?? findActiveTab(root.second, activeNodeId);
    }
    return null;
  }

  const activeTab = $derived(findActiveTab(layoutState.root, layoutState.activeNodeId));


  let cpu = $state(0);
  let memory = $state(0);
  let toast = $state({ message: "", visible: false });

  function showToast(message: string) {
    toast = { message, visible: true };
    setTimeout(() => {
      toast = { message: "", visible: false };
    }, 2000);
  }

  async function copyPath(path: string | undefined) {
    if (!path) return;
    try {
      await navigator.clipboard.writeText(path);
      showToast(t("statusPathCopied"));
    } catch (e) {
      console.error("Failed to copy path:", e);
    }
  }

  function handleFormat() {
    if (activeTab?.language) {
      console.log("[StatusBar] requesting format for tab", activeTab.id);
      formatRequest.tabId = activeTab.id;
    }
  }

  onMount(() => {
    const interval = setInterval(async () => {
      try {
        const stats = await invoke<{ cpu: number; memory_mb: number }>("get_app_stats");
        cpu = stats.cpu;
        memory = stats.memory_mb;
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  });
</script>

<div class="status-bar" onselectstart={(e) => e.preventDefault()}>
  <span class="info path" onclick={() => copyPath(activeTab?.path)} title={t("statusCopyPath")}>{activeTab?.path ?? ""}</span>
  {#if activeTab?.language}
    <button class="info format-btn" onclick={handleFormat} title={t("statusFormat")}><MagicWand size={12} /></button>
  {/if}
  {#if todoStore.parsed.total > 0}
    <span class="info todo-count"><NotePencil size={12} /> {todoStore.parsed.completed}/{todoStore.parsed.total}</span>
  {/if}
  <span class="info">{t("statusCpu")} {cpu.toFixed(1)}%</span>
  <span class="info">{memory} MB {t("statusRam")}</span>
  <span class="info">{activeTab?.lineEnding ?? t("statusLf")}</span>
  <span class="info">{t("statusUtf8")}</span>
  <span class="info">{activeTab?.language ?? ""}</span>
</div>

{#if toast.visible}
  <div class="toast">{toast.message}</div>
{/if}

<style>
  .status-bar {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 12px;
    height: 28px;
    background: var(--bg-tab-bar, #252526);
    border-top: 1px solid var(--border-color, #333);
    color: var(--text-muted, #888);
    font-size: 12px;
    flex-shrink: 0;
    user-select: none;
    -webkit-user-select: none;
  }

  .info {
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
    padding: 0 10px;
    border-left: 1px solid var(--border-color, #333);
  }

  .path {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    padding-left: 0;
    border-left: none;
  }


  .todo-count {
    color: var(--accent-color, #4a9eff);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .format-btn {
    background: none;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    padding: 2px 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .format-btn:hover {
    color: var(--accent-color, #4a9eff);
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .toast {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-surface, #252526);
    color: var(--text-color, #ccc);
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    border: 1px solid var(--border-color, #333);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
    z-index: 9999;
    pointer-events: none;
    user-select: none;
  }
</style>

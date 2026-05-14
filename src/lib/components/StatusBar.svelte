<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { layoutState } from "$lib/layout/store.svelte";
  import type { LayoutNode, Tab } from "$lib/layout/types";

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
      showToast("Ruta copiada");
    } catch (e) {
      console.error("Failed to copy path:", e);
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
  <span class="info path" onclick={() => copyPath(activeTab?.path)} title="Copiar ruta">{activeTab?.path ?? ""}</span>
  <span class="info">CPU {cpu.toFixed(1)}%</span>
  <span class="info">{memory} MB RAM</span>
  <span class="info">{activeTab?.lineEnding ?? "LF"}</span>
  <span class="info">UTF-8</span>
  <span class="info">{activeTab?.language ?? ""}</span>
</div>

{#if toast.visible}
  <div class="toast">{toast.message}</div>
{/if}

<style>
  .status-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 12px;
    height: 22px;
    background: var(--bg-sidebar, #252526);
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
  }

  .path {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
  }

  .toast {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-sidebar, #252526);
    color: var(--text-color, #ccc);
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 13px;
    border: 1px solid var(--border-color, #333);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    z-index: 9999;
    pointer-events: none;
    user-select: none;
  }
</style>

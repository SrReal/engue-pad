<script lang="ts">
  import { problemsStore } from "$lib/editor/problems.svelte";
  import { linterAvailability } from "$lib/editor/linterAvailability.svelte";
  import { layoutState, addTab, setActiveTab, setActiveNode } from "$lib/layout/store.svelte";
  import { editorNavigation } from "$lib/editor/navigation";
  import { triggerMascotEvent } from "$lib/mascot/store.svelte";
  import { X, Warning, Info, Circle, CaretRight } from "phosphor-svelte";

  let { onClose }: { onClose: () => void } = $props();

  let expandedPaths = $state<Set<string>>(new Set());

  function togglePath(path: string) {
    if (expandedPaths.has(path)) {
      expandedPaths.delete(path);
    } else {
      expandedPaths.add(path);
    }
    expandedPaths = new Set(expandedPaths);
  }

  function openProblem(path: string, offset: number) {
    editorNavigation.set({ path, offset });
    const nodeId = layoutState.activeNodeId ?? layoutState.root.id;
    const fileName = path.split(/[\\/]/).pop() ?? path;
    addTab(nodeId, {
      id: crypto.randomUUID(),
      title: fileName,
      type: "editor",
      path,
    });
    setActiveNode(nodeId);
    triggerMascotEvent("llamar_atencion");
  }

  const grouped = $derived.by(() => {
    const map = new Map<string, typeof problemsStore.items>();
    for (const p of problemsStore.items) {
      const list = map.get(p.path) ?? [];
      list.push(p);
      map.set(p.path, list);
    }
    return map;
  });

  const errorCount = $derived(problemsStore.items.filter((p) => p.severity === "error").length);
  const warningCount = $derived(problemsStore.items.filter((p) => p.severity === "warning").length);
  const infoCount = $derived(problemsStore.items.filter((p) => p.severity === "info").length);
</script>

<div class="problems-panel">
  <div class="problems-header">
    <span class="title">Problems</span>
    <span class="counts">
      {#if errorCount > 0}<span class="count error">{errorCount} errors</span>{/if}
      {#if warningCount > 0}<span class="count warning">{warningCount} warnings</span>{/if}
      {#if infoCount > 0}<span class="count info">{infoCount} info</span>{/if}
      {#if problemsStore.items.length === 0}<span class="count">No problems</span>{/if}
    </span>
    <button class="close-btn" onclick={onClose} title="Close"><X size={14} /></button>
  </div>
  <div class="problems-list">
    {#if problemsStore.items.length === 0 && linterAvailability.available === false}
      <div class="empty-hint">
        <span class="hint-title">No linter found</span>
        <span class="hint-text">Install one of the following in your project to enable diagnostics:</span>
        <ul>
          <li><strong>JS / TS / JSON:</strong> npm install --save-dev @biomejs/biome</li>
          <li><strong>Python:</strong> pip install ruff</li>
          <li><strong>PowerShell:</strong> Install-Module PSScriptAnalyzer</li>
        </ul>
        <span class="hint-note">Config is saved in .enguepad/workspace.json</span>
      </div>
    {:else}
      {#each grouped.entries() as [path, list] (path)}
      <div class="path-group">
        <button class="path-header" onclick={() => togglePath(path)}>
          <span class="arrow" class:expanded={expandedPaths.has(path)}><CaretRight size={12} /></span>
          <span class="path-name">{path.split(/[\\/]/).pop() ?? path}</span>
          <span class="path-count">{list.length}</span>
        </button>
        {#if expandedPaths.has(path)}
          <div class="path-issues">
            {#each list as p}
              <button class="issue" onclick={() => openProblem(p.path, p.from)}>
                <span class="issue-icon">
                  {#if p.severity === "error"}<X size={12} />{:else if p.severity === "warning"}<Warning size={12} />{:else if p.severity === "info"}<Info size={12} />{:else}<Circle size={12} />{/if}
                </span>
                <span class="issue-msg">{p.message}</span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .problems-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-panel, #1e1e1e);
    color: var(--text-color, #ccc);
    font-size: 13px;
  }

  .problems-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    border-bottom: 1px solid var(--border-color, #333);
    background: var(--bg-sidebar, #252526);
    flex-shrink: 0;
  }

  .title {
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .counts {
    display: flex;
    gap: 8px;
    font-size: 12px;
    margin-right: auto;
    margin-left: 12px;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: none;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    border-radius: 3px;
    padding: 0;
  }

  .close-btn:hover {
    background: var(--bg-tab-hover, #3d3d3d);
    color: var(--text-color, #ccc);
  }

  .count {
    color: var(--text-muted, #888);
  }

  .count.error {
    color: #f14c4c;
  }

  .count.warning {
    color: #f0a732;
  }

  .count.info {
    color: #4a9eff;
  }

  .problems-list {
    flex: 1;
    overflow: auto;
    padding: 4px 0;
  }

  .path-group {
    display: flex;
    flex-direction: column;
  }

  .path-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: none;
    border: none;
    color: var(--text-color, #ccc);
    cursor: pointer;
    font-size: 13px;
    width: 100%;
    text-align: left;
  }

  .path-header:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .arrow {
    font-size: 10px;
    transition: transform 0.15s ease;
    display: inline-block;
  }

  .arrow.expanded {
    transform: rotate(90deg);
  }

  .path-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .path-count {
    font-size: 11px;
    color: var(--text-muted, #888);
    background: var(--bg-tab-bar, #2d2d2d);
    padding: 1px 6px;
    border-radius: 10px;
  }

  .path-issues {
    display: flex;
    flex-direction: column;
    padding-left: 28px;
  }

  .issue {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 12px;
    background: none;
    border: none;
    color: var(--text-color, #ccc);
    cursor: pointer;
    font-size: 12px;
    width: 100%;
    text-align: left;
  }

  .issue:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .issue-icon {
    font-size: 12px;
    flex-shrink: 0;
  }

  .issue-msg {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty-hint {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 24px 16px;
    color: var(--text-muted, #888);
    font-size: 13px;
    line-height: 1.5;
  }

  .hint-title {
    font-weight: 600;
    color: var(--text-color, #ccc);
  }

  .hint-text {
    font-size: 12px;
  }

  .empty-hint ul {
    margin: 0;
    padding-left: 20px;
    font-size: 12px;
  }

  .empty-hint li {
    margin-bottom: 4px;
  }

  .hint-note {
    font-size: 11px;
    opacity: 0.7;
    margin-top: 4px;
  }
</style>
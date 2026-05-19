<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { CaretDown, CaretRight } from "phosphor-svelte";

  type ProcessInfo = {
    pid: number;
    name: string;
    cpu: number;
    memory_mb: number;
    cwd: string;
  };

  type TerminalProcessTree = {
    processes: ProcessInfo[];
    total_cpu: number;
    total_memory_mb: number;
  };

  let expanded = $state(false);
  let totalCpu = $state(0);
  let totalMemory = $state(0);
  let processes = $state<ProcessInfo[]>([]);
  let toast = $state({ message: "", visible: false });

  function showToast(message: string) {
    toast = { message, visible: true };
    setTimeout(() => {
      toast = { message: "", visible: false };
    }, 2000);
  }

  async function copyPath(path: string) {
    try {
      await navigator.clipboard.writeText(path);
      showToast("Ruta copiada");
    } catch (e) {
      console.error("Failed to copy path:", e);
    }
  }

  async function refresh() {
    try {
      const tree = await invoke<TerminalProcessTree>("get_terminal_processes");
      totalCpu = tree.total_cpu;
      totalMemory = tree.total_memory_mb;
      processes = tree.processes;
    } catch {
      // ignore
    }
  }

  onMount(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  });
</script>

<div class="process-footer" onselectstart={(e) => e.preventDefault()}>
  <div
    class="process-bar"
    onclick={() => (expanded = !expanded)}
    role="button"
    tabindex="0"
    onkeydown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        expanded = !expanded;
      }
    }}
  >
    <span class="arrow">{#if expanded}<CaretDown size={12} />{:else}<CaretRight size={12} />{/if}</span>
    <span class="summary">Procesos lanzados</span>
    <span class="totals">CPU {totalCpu.toFixed(1)}% · {totalMemory} MB RAM</span>
  </div>

  {#if expanded}
    <div class="process-list">
      {#if processes.length === 0}
        <div class="empty">Sin procesos activos</div>
      {:else}
        <div class="process-header">
          <span class="col name">Nombre</span>
          <span class="col pid">PID</span>
          <span class="col cpu">CPU</span>
          <span class="col mem">RAM</span>
          <span class="col cwd">Ruta</span>
        </div>
        {#each processes as p (p.pid)}
          <div class="process-row">
            <span class="col name" title={p.name}>{p.name}</span>
            <span class="col pid">{p.pid}</span>
            <span class="col cpu">{p.cpu.toFixed(1)}%</span>
            <span class="col mem">{p.memory_mb} MB</span>
            <span class="col cwd" title={p.cwd} onclick={() => copyPath(p.cwd)}>{p.cwd}</span>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>

{#if toast.visible}
  <div class="toast">{toast.message}</div>
{/if}

<style>
  .process-footer {
    background: var(--bg-sidebar, #252526);
    border-top: 1px solid var(--border-color, #333);
    color: var(--text-muted, #888);
    font-size: 12px;
    flex-shrink: 0;
    user-select: none;
    -webkit-user-select: none;
  }

  .process-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    height: 22px;
    cursor: pointer;
    user-select: none;
  }

  .summary, .totals, .arrow, .empty, .process-header, .process-row {
    user-select: none;
    -webkit-user-select: none;
  }

  .process-bar:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .arrow {
    font-size: 10px;
    width: 12px;
    text-align: center;
  }

  .summary {
    font-weight: 600;
  }

  .totals {
    margin-left: auto;
    white-space: nowrap;
  }

  .process-list {
    max-height: 200px;
    overflow-y: auto;
    border-top: 1px solid var(--border-color, #333);
    padding: 4px 12px;
  }

  .process-header,
  .process-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 0;
  }

  .process-header {
    font-weight: 600;
    border-bottom: 1px solid var(--border-color, #333);
    padding-bottom: 4px;
    margin-bottom: 2px;
  }

  .col {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .col.name {
    flex: 2;
    min-width: 0;
  }

  .col.pid {
    width: 50px;
  }

  .col.cpu {
    width: 50px;
  }

  .col.mem {
    width: 60px;
  }

  .col.cwd {
    flex: 3;
    min-width: 0;
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

  .empty {
    padding: 8px 0;
    text-align: center;
    font-style: italic;
  }
</style>

<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { invoke } from "@tauri-apps/api/core";
  import { Terminal as XTerm } from "@xterm/xterm";
  import { FitAddon } from "@xterm/addon-fit";
  import "@xterm/xterm/css/xterm.css";

  let { nodeId, tabId, cwd }: {
    nodeId: string;
    tabId: string;
    cwd?: string;
  } = $props();

  let containerRef = $state<HTMLDivElement | null>(null);
  let terminal = $state<XTerm | null>(null);
  let fitAddon = $state<FitAddon | null>(null);
  let unlisten = $state<UnlistenFn | null>(null);

  onMount(async () => {
    if (!containerRef) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      fontSize: 14,
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
        cursor: "#cccccc",
        selectionBackground: "#264f78",
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);

    term.open(containerRef);
    fit.fit();

    const cols = term.cols;
    const rows = term.rows;

    const shell = navigator.platform.startsWith("Win") ? "powershell.exe" : "zsh";

    try {
      await invoke("create_terminal", {
        terminalId: tabId,
        shell,
        cwd,
        cols,
        rows,
      });
    } catch (e) {
      term.writeln(`Failed to start terminal: ${e}`);
      return;
    }

    const listener = await listen<{ terminal_id: string; data: number[] }>("terminal-output", (event) => {
      if (event.payload.terminal_id === tabId) {
        const data = new Uint8Array(event.payload.data);
        term.write(data);
      }
    });
    unlisten = listener;

    term.onData((data) => {
      invoke("write_terminal", { terminalId: tabId, data: Array.from(new TextEncoder().encode(data)) });
    });

    terminal = term;
    fitAddon = fit;
  });

  onDestroy(async () => {
    unlisten?.();
    try {
      await invoke("kill_terminal", { terminalId: tabId });
    } catch {
      // terminal may already be dead
    }
    terminal?.dispose();
  });

  export function focusTerminal() {
    terminal?.focus();
  }

  export function resizeTerminal() {
    fitAddon?.fit();
  }
</script>

<div class="terminal-wrapper" bind:this={containerRef}></div>

<style>
  .terminal-wrapper {
    width: 100%;
    height: 100%;
    padding: 4px;
    background: var(--bg-panel, #1e1e1e);
  }

  .terminal-wrapper :global(.xterm) {
    height: 100%;
  }

  .terminal-wrapper :global(.xterm-screen) {
    padding: 4px;
  }
</style>

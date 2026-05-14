<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { invoke } from "@tauri-apps/api/core";
  import { Terminal as XTerm } from "@xterm/xterm";
  import { FitAddon } from "@xterm/addon-fit";
  import "@xterm/xterm/css/xterm.css";
  import { reportUrl } from "$lib/terminal/urlDetector";

  let { nodeId, tabId, cwd }: {
    nodeId: string;
    tabId: string;
    cwd?: string;
  } = $props();

  let containerRef = $state<HTMLDivElement | null>(null);
  let terminal = $state<XTerm | null>(null);
  let fitAddon = $state<FitAddon | null>(null);
  let unlisten = $state<UnlistenFn | null>(null);
  let textDecoder = $state(new TextDecoder());
  let urlBuffer = $state("");

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
    term.focus();

    const rect = containerRef.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      fit.fit();
    }

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

    const urlRegex = /https?:\/\/localhost:\d+[^\s'"\)\]>]+/g;

    const listener = await listen<{ terminal_id: string; data: number[] }>("terminal-output", (event) => {
      if (event.payload.terminal_id === tabId) {
        const data = new Uint8Array(event.payload.data);
        term.write(data);

        // Scan output for local URLs.
        const text = textDecoder.decode(data, { stream: true });
        urlBuffer += text;
        if (urlBuffer.length > 4096) {
          urlBuffer = urlBuffer.slice(-2048);
        }
        const matches = urlBuffer.matchAll(urlRegex);
        for (const match of matches) {
          reportUrl(match[0], tabId);
        }
      }
    });
    unlisten = listener;

    term.attachCustomKeyEventHandler((e) => {
      if (e.type !== "keydown") return true;

      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        invoke("write_terminal", { terminalId: tabId, data: [0x0a] }).catch(() => {});
        return false;
      }

      if (e.key === "c" && e.ctrlKey && !e.shiftKey) {
        if (term.hasSelection()) {
          navigator.clipboard.writeText(term.getSelection()).catch(() => {});
          return false;
        }
        return true;
      }

      if (e.key === "v" && e.ctrlKey && !e.shiftKey) {
        navigator.clipboard.readText().then((text) => {
          if (text) {
            invoke("write_terminal", { terminalId: tabId, data: Array.from(new TextEncoder().encode(text)) }).catch(() => {});
          }
        }).catch(() => {});
        return false;
      }

      if (e.key === "x" && e.ctrlKey && !e.shiftKey) {
        if (term.hasSelection()) {
          navigator.clipboard.writeText(term.getSelection()).catch(() => {});
          term.clearSelection();
          return false;
        }
        return true;
      }

      return true;
    });

    term.onData((data) => {
      invoke("write_terminal", { terminalId: tabId, data: Array.from(new TextEncoder().encode(data)) });
    });

    terminal = term;
    fitAddon = fit;

    // Ensure focus after xterm textarea is fully initialised.
    setTimeout(() => {
      term.focus();
    }, 100);
  });

  onDestroy(() => {
    unlisten?.();
    terminal?.dispose();
  });

  export function focusTerminal() {
    terminal?.focus();
  }

  export function resizeTerminal() {
    fitAddon?.fit();
    if (terminal) {
      invoke("resize_terminal", {
        terminalId: tabId,
        cols: terminal.cols,
        rows: terminal.rows,
      }).catch(() => {});
    }
  }
</script>

<div class="terminal-wrapper" bind:this={containerRef} onmousedown={() => terminal?.focus()}></div>

<style>
  .terminal-wrapper {
    width: 100%;
    flex: 1;
    min-height: 0;
    background: var(--bg-panel, #1e1e1e);
  }

  .terminal-wrapper :global(.xterm) {
    height: 100%;
  }
</style>

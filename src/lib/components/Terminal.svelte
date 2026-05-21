<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { invoke } from "@tauri-apps/api/core";
  import { Terminal as XTerm } from "@xterm/xterm";
  import { FitAddon } from "@xterm/addon-fit";
  import { WebLinksAddon } from "@xterm/addon-web-links";
  import "@xterm/xterm/css/xterm.css";
  import { reportUrl } from "$lib/terminal/urlDetector";
  import { addPreview } from "$lib/layout/store.svelte";
  import { appSettings } from "$lib/workspace/settingsStore.svelte";
  import { triggerMascotEvent } from "$lib/mascot/store.svelte";

  let { nodeId, tabId, cwd, shell }: {
    nodeId: string;
    tabId: string;
    cwd?: string;
    shell?: string;
  } = $props();

  let containerRef = $state<HTMLDivElement | null>(null);
  let terminal = $state<XTerm | null>(null);
  let fitAddon = $state<FitAddon | null>(null);
  let unlisten = $state<UnlistenFn | null>(null);
  let unlistenClosed = $state<UnlistenFn | null>(null);
  let textDecoder = $state(new TextDecoder());
  let urlBuffer = $state("");
  let idleTimeout = $state<ReturnType<typeof setTimeout> | null>(null);
  const IDLE_MS = 5000;

  onMount(async () => {
    if (!containerRef) return;

    const tSettings = appSettings.terminal ?? {
      defaultShell: "",
      fontSize: 14,
      scrollback: 1000,
      copyOnSelect: false,
    };

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      fontSize: tSettings.fontSize,
      scrollback: tSettings.scrollback,
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
        cursor: "#cccccc",
        selectionBackground: "#264f78",
      },
    });

    const fit = new FitAddon();
    term.loadAddon(fit);

    const webLinks = new WebLinksAddon(
      (e, uri) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          addPreview(nodeId, uri);
          triggerMascotEvent("preview_opened");
        }
      },
      {
        hover: (e, uri) => {
          (e.target as HTMLElement).title = "Ctrl+Click to open preview";
        },
        leave: (e, uri) => {
          (e.target as HTMLElement).title = "";
        },
      }
    );
    term.loadAddon(webLinks);

    term.open(containerRef);
    term.focus();

    if (tSettings.copyOnSelect) {
      term.onSelectionChange(() => {
        if (term.hasSelection()) {
          navigator.clipboard.writeText(term.getSelection()).catch(() => {});
        }
      });
    }

    const rect = containerRef.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      fit.fit();
    }

    const cols = term.cols;
    const rows = term.rows;

    const effectiveShell = shell || tSettings.defaultShell || (navigator.platform.startsWith("Win") ? "powershell.exe" : "zsh");

    const urlRegex = /https?:\/\/[^\s'"\)\]>]+/g;

    function stripAnsi(str: string): string {
      // eslint-disable-next-line no-control-regex
      return str.replace(/\x1b\[[0-9;]*m/g, "");
    }

    const listener = await listen<{ terminal_id: string; data: number[] }>("terminal-output", (event) => {
      if (event.payload.terminal_id === tabId) {
        const data = new Uint8Array(event.payload.data);
        term.write(data);

        // Scan output for URLs (strip ANSI color codes first).
        const text = textDecoder.decode(data, { stream: true });
        const cleanText = stripAnsi(text);
        urlBuffer += cleanText;
        if (urlBuffer.length > 4096) {
          urlBuffer = urlBuffer.slice(-2048);
        }
        const matches = urlBuffer.matchAll(urlRegex);
        for (const match of matches) {
          reportUrl(match[0], tabId);
        }

        // Reset idle timer
        if (idleTimeout) clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
          triggerMascotEvent("waiting_command");
        }, IDLE_MS);
      }
    });
    unlisten = listener;

    const closedListener = await listen<{ terminal_id: string }>("terminal-closed", (event) => {
      if (event.payload.terminal_id === tabId) {
        triggerMascotEvent("terminal_closed");
      }
    });
    unlistenClosed = closedListener;

    // Kill any stale PTY before creating a new one (handles app refresh)
    await invoke("kill_terminal", { terminalId: tabId }).catch(() => {});

    try {
      await invoke("create_terminal", {
        terminalId: tabId,
        shell: effectiveShell,
        cwd,
        cols,
        rows,
      });
    } catch (e) {
      term.writeln(`Failed to start terminal: ${e}`);
      return;
    }

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
      if (data.trim().length > 0 && data.includes("\r")) {
        triggerMascotEvent("keep_working");
      }
      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        triggerMascotEvent("waiting_command");
      }, IDLE_MS);
    });

    terminal = term;
    fitAddon = fit;

    // Ensure proper sizing and focus after mount.
    setTimeout(() => {
      fit.fit();
      if (terminal) {
        invoke("resize_terminal", { terminalId: tabId, cols: terminal.cols, rows: terminal.rows }).catch(() => {});
      }
      term.focus();
    }, 100);
  });

  onDestroy(() => {
    unlisten?.();
    unlistenClosed?.();
    if (idleTimeout) clearTimeout(idleTimeout);
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

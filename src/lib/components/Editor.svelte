<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { EditorView, keymap } from "@codemirror/view";
  import { EditorState, type Extension } from "@codemirror/state";
  import { oneDark } from "@codemirror/theme-one-dark";
  import { javascript } from "@codemirror/lang-javascript";
  import { json } from "@codemirror/lang-json";
  import { html } from "@codemirror/lang-html";
  import { css } from "@codemirror/lang-css";
  import { markdown } from "@codemirror/lang-markdown";
  import { python } from "@codemirror/lang-python";
  import { lineNumbers, highlightActiveLineGutter } from "@codemirror/view";
  import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
  import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
  import { updateTabContent, markTabSaved } from "$lib/layout/store.svelte";

  let { nodeId, tabId, path, language, initialContent = "" }: {
    nodeId: string;
    tabId: string;
    path?: string;
    language?: string;
    initialContent?: string;
  } = $props();

  let containerRef = $state<HTMLDivElement | null>(null);
  let view = $state<EditorView | null>(null);
  let isLoading = $state(false);
  let currentContent = $state("");

  $effect(() => {
    currentContent = initialContent;
  });

  function getLanguageExtension(lang: string): Extension {
    switch (lang) {
      case "javascript":
      case "typescript":
        return javascript({ typescript: lang === "typescript" });
      case "json":
        return json();
      case "html":
        return html();
      case "css":
        return css();
      case "markdown":
        return markdown();
      case "python":
        return python();
      default:
        return [];
    }
  }

  async function loadFile() {
    if (!path) return;
    isLoading = true;
    try {
      const content = await invoke<string>("read_file", { path });
      currentContent = content;
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content },
        });
      }
    } catch (e) {
      console.error("Failed to read file:", e);
    } finally {
      isLoading = false;
    }
  }

  async function saveFile() {
    if (!path || !view) return;
    const content = view.state.doc.toString();
    try {
      await invoke("write_file", { path, contents: content });
      markTabSaved(nodeId, tabId);
    } catch (e) {
      console.error("Failed to save file:", e);
    }
  }

  onMount(() => {
    if (!containerRef) return;

    const saveKeymap = keymap.of([
      {
        key: "Mod-s",
        run: () => {
          saveFile();
          return true;
        },
      },
    ]);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const content = update.state.doc.toString();
        currentContent = content;
        updateTabContent(nodeId, tabId, content);
      }
    });

    const extensions: Extension[] = [
      oneDark,
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle),
      saveKeymap,
      updateListener,
      EditorView.theme({
        "&": {
          fontSize: "14px",
          height: "100%",
        },
        ".cm-content": {
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          padding: "8px 0",
        },
        ".cm-gutters": {
          background: "var(--bg-panel, #1e1e1e)",
          borderRight: "1px solid var(--border-color, #333)",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        },
      }),
    ];

    if (language) {
      extensions.push(getLanguageExtension(language));
    }

    const state = EditorState.create({
      doc: currentContent,
      extensions,
    });

    view = new EditorView({
      state,
      parent: containerRef,
    });

    if (path) {
      loadFile();
    }
  });

  onDestroy(() => {
    view?.destroy();
  });
</script>

<div class="editor-wrapper">
  {#if isLoading}
    <div class="loading">Loading...</div>
  {/if}
  <div class="editor-container" bind:this={containerRef}></div>
</div>

<style>
  .editor-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
  }

  .editor-container {
    flex: 1;
    overflow: hidden;
  }

  .editor-container :global(.cm-editor) {
    height: 100%;
  }

  .loading {
    position: absolute;
    top: 8px;
    right: 12px;
    color: var(--text-muted, #888);
    font-size: 12px;
    z-index: 10;
  }
</style>

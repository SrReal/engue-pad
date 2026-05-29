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
  import { lineNumbers, highlightActiveLineGutter, EditorView as CMEditorView } from "@codemirror/view";
  import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
  import { bracketMatching, syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap, indentUnit } from "@codemirror/language";
  import { highlightSelectionMatches, searchKeymap, search } from "@codemirror/search";
  import { updateTabContent, markTabSaved, setTabLineEnding } from "$lib/layout/store.svelte";
  import { urlLinksFor } from "$lib/editor/urlLinks";
  import { formatContent } from "$lib/editor/formatter";
  import { type EditorSettings } from "$lib/workspace/settings";
  import { appSettings } from "$lib/workspace/settingsStore.svelte";
  import { triggerMascotEvent } from "$lib/mascot/store.svelte";
  import { showMinimap } from "@replit/codemirror-minimap";

  let { nodeId, tabId, path, language, initialContent = "", dirty = false }: {
    nodeId: string;
    tabId: string;
    path?: string;
    language?: string;
    initialContent?: string;
    dirty?: boolean;
  } = $props();

  let containerRef = $state<HTMLDivElement | null>(null);
  let view: EditorView | null = null;
  let isLoading = $state(false);
  let currentContent = $state("");
  let isSettingContent = $state(false);
  let contextMenu = $state<{ x: number; y: number } | null>(null);

  $effect(() => {
    currentContent = initialContent;
  });

  function getLanguageExtension(lang: string): Extension {
    switch (lang) {
      case "javascript":
        return javascript({ jsx: true });
      case "typescript":
        return javascript({ typescript: true, jsx: true });
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
      const result = await invoke<{ content: string; lineEnding: string }>("read_file_meta", { path });
      currentContent = result.content;
      setTabLineEnding(nodeId, tabId, result.lineEnding);
      if (view) {
        isSettingContent = true;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: result.content },
        });
        isSettingContent = false;
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
      triggerMascotEvent("task_done");
    } catch (e) {
      console.error("Failed to save file:", e);
      triggerMascotEvent("error");
    }
  }

  export function format() {
    if (!view) return;
    const content = view.state.doc.toString();
    const lineEnding = view.state.lineBreak;
    const formatted = formatContent(content, lineEnding === "\r\n" ? "CRLF" : "LF");
    if (formatted === content) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: formatted },
    });
    updateTabContent(nodeId, tabId, formatted);
    triggerMascotEvent("task_done");
  }

  function openContextMenu(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    contextMenu = { x: e.clientX, y: e.clientY };
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  function handleFormat() {
    closeContextMenu();
    format();
  }

  function buildEditor() {
    if (!containerRef) return;

    const editorSettings: EditorSettings = appSettings.editor ?? {
      fontSize: 14,
      lineHeight: 1.5,
      wordWrap: true,
      tabSize: 2,
      insertSpaces: true,
      showLineNumbers: true,
      highlightActiveLine: true,
      minimap: false,
    };

    const saveKeymap = keymap.of([
      {
        key: "Mod-s",
        run: () => {
          saveFile();
          return true;
        },
      },
    ]);

    const contextMenuHandler = EditorView.domEventHandlers({
      contextmenu(event) {
        openContextMenu(event);
        return true;
      },
    });

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isSettingContent) {
        const content = update.state.doc.toString();
        currentContent = content;
        updateTabContent(nodeId, tabId, content);
      }
    });

    const formatKeymap = keymap.of([
      {
        key: "Mod-Shift-i",
        run: () => {
          format();
          return true;
        },
      },
    ]);

    const extensions: Extension[] = [
      oneDark,
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, ...searchKeymap]),
      search({ top: true }),
      bracketMatching(),
      foldGutter(),
      highlightSelectionMatches(),
      syntaxHighlighting(defaultHighlightStyle),
      saveKeymap,
      formatKeymap,
      contextMenuHandler,
      updateListener,
      ...urlLinksFor(nodeId),
      EditorState.tabSize.of(editorSettings.tabSize),
      indentUnit.of(editorSettings.insertSpaces ? " ".repeat(editorSettings.tabSize) : "\t"),
      EditorView.theme({
        "&": {
          fontSize: `${editorSettings.fontSize}px`,
          lineHeight: `${editorSettings.lineHeight}`,
          height: "100%",
          backgroundColor: "var(--bg-panel, #0b1422)",
        },
        ".cm-content": {
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          padding: "8px 0",
        },
        ".cm-editor": {
          backgroundColor: "var(--bg-panel, #0b1422)",
        },
        ".cm-scroller": {
          backgroundColor: "var(--bg-panel, #0b1422)",
        },
        ".cm-gutters": {
          background: "var(--bg-panel, #0b1422)",
          borderRight: "1px solid var(--border-color, #333)",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        },
        ".cm-lineNumbers .cm-gutterElement": {
          fontSize: `${editorSettings.fontSize - 1}px`,
        },
      }),
    ];

    if (editorSettings.showLineNumbers) {
      extensions.push(lineNumbers());
    }
    if (editorSettings.highlightActiveLine) {
      extensions.push(highlightActiveLineGutter());
    }
    if (editorSettings.wordWrap) {
      extensions.push(CMEditorView.lineWrapping);
    }
    if (editorSettings.minimap) {
      extensions.push(
        showMinimap.compute(["doc"], () => ({
          create: () => ({ dom: document.createElement("div") }),
          displayText: "characters",
          showOverlay: "always",
        }))
      );
    }

    if (language) {
      extensions.push(getLanguageExtension(language));
    }

    const doc = view?.state.doc.toString() ?? currentContent;

    const state = EditorState.create({
      doc,
      extensions,
    });

    view?.destroy();
    view = new EditorView({
      state,
      parent: containerRef,
    });

  }

  onMount(() => {
    buildEditor();
    if (path && !dirty) {
      loadFile();
    }
  });

  onDestroy(() => {
    view?.destroy();
  });

  let lastEditorJson = "";

  $effect(() => {
    const settings = appSettings.editor;
    const json = JSON.stringify(settings);
    if (json === lastEditorJson) return;
    lastEditorJson = json;
    if (view && containerRef) {
      buildEditor();
    }
  });


</script>

<div class="editor-wrapper">
  {#if isLoading}
    <div class="loading">Loading...</div>
  {/if}
  <div class="editor-container" bind:this={containerRef} onclick={closeContextMenu}></div>
  {#if contextMenu}
    <div class="context-menu" style:left="{contextMenu.x}px" style:top="{contextMenu.y}px">
      <button onclick={handleFormat}>{t("editorFormat")}</button>
    </div>
  {/if}
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

  .editor-container :global(.cm-url-link) {
    text-decoration: underline;
    text-decoration-color: var(--accent-color, #4a9eff);
    cursor: pointer;
    pointer-events: auto;
  }

  .editor-container :global(.cm-url-link:hover) {
    color: var(--accent-color, #4a9eff);
  }


  .editor-container :global(.cm-lineNumbers) {
    user-select: none;
    -webkit-user-select: none;
  }

  .editor-container :global(.cm-foldGutter) {
    user-select: none;
    -webkit-user-select: none;
  }


  .loading {
    position: absolute;
    top: 8px;
    right: 12px;
    color: var(--text-muted, #888);
    font-size: 12px;
    z-index: 10;
  }

  .context-menu {
    position: fixed;
    background: var(--bg-surface, #252526);
    border: 1px solid var(--border-color, #333);
    border-radius: 7px;
    padding: 4px 0;
    z-index: 1000;
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.44);
  }

  .context-menu button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 6px 16px;
    background: none;
    border: none;
    color: var(--text-color, #ccc);
    cursor: pointer;
    font-size: 13px;
  }

  .context-menu button:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }
</style>

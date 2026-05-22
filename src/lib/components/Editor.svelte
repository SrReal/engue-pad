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
  import { linterFor, forceLint } from "$lib/editor/linter";
  import { clearProblemsForPath } from "$lib/editor/problems.svelte";
  import { linterConfig } from "$lib/workspace/store.svelte";
  import { editorNavigation } from "$lib/editor/navigation";
  import { get } from "svelte/store";
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
      if (linterConfig.enabled && linterConfig.runOnSave && language) {
        forceLint(view, path, language);
      }
    } catch (e) {
      console.error("Failed to save file:", e);
      triggerMascotEvent("error");
    }
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

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isSettingContent) {
        const content = update.state.doc.toString();
        currentContent = content;
        updateTabContent(nodeId, tabId, content);
      }
    });

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
    if (path && language && linterConfig.enabled && linterConfig.runOnType) {
      extensions.push(linterFor(path, language));
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

    const nav = get(editorNavigation);
    if (nav && nav.path === path && view) {
      view.dispatch({
        selection: { anchor: nav.offset, head: nav.offset },
        scrollIntoView: true,
      });
      editorNavigation.set(null);
    }
  }

  onMount(() => {
    buildEditor();
    if (path && !dirty) {
      loadFile();
    }
  });

  onDestroy(() => {
    view?.destroy();
    if (path) clearProblemsForPath(path);
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

  $effect(() => {
    const unsub = editorNavigation.subscribe((nav) => {
      if (nav && nav.path === path && view) {
        view.dispatch({
          selection: { anchor: nav.offset, head: nav.offset },
          scrollIntoView: true,
        });
        editorNavigation.set(null);
      }
    });
    return unsub;
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

  .editor-container :global(.cm-url-link) {
    text-decoration: underline;
    text-decoration-color: var(--accent-color, #4a9eff);
    cursor: pointer;
    pointer-events: auto;
  }

  .editor-container :global(.cm-url-link:hover) {
    color: var(--accent-color, #4a9eff);
  }

  .editor-container :global(.cm-diagnostic) {
    background: var(--bg-panel, #1e1e1e);
    color: var(--text-color, #ccc);
    border-left: 3px solid var(--text-muted, #888);
    padding: 4px 8px;
    font-size: 13px;
  }

  .editor-container :global(.cm-diagnostic-error) {
    border-left-color: var(--error-color, #f14c4c);
  }

  .editor-container :global(.cm-diagnostic-warning) {
    border-left-color: var(--warning-color, #f0a732);
  }

  .editor-container :global(.cm-diagnostic-info) {
    border-left-color: #4a9eff;
  }

  .editor-container :global(.cm-tooltip-lint) {
    background: var(--bg-panel, #1e1e1e);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
    max-width: 400px;
  }

  .editor-container :global(.cm-lintRange-error) {
    text-decoration: underline wavy var(--error-color, #f14c4c);
  }

  .editor-container :global(.cm-lintRange-warning) {
    text-decoration: underline wavy var(--warning-color, #f0a732);
  }

  .editor-container :global(.cm-lintRange-info) {
    text-decoration: underline wavy #4a9eff;
  }

  .editor-container :global(.cm-panel.cm-panel-lint) {
    background: var(--bg-panel, #1e1e1e);
    border-top: 1px solid var(--border-color, #333);
  }

  .editor-container :global(.cm-panel.cm-panel-lint ul) {
    font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
    font-size: 12px;
    color: var(--text-color, #ccc);
  }

  .editor-container :global(.cm-lineNumbers) {
    user-select: none;
    -webkit-user-select: none;
  }

  .editor-container :global(.cm-foldGutter) {
    user-select: none;
    -webkit-user-select: none;
  }

  .editor-container :global(.cm-panel.cm-panel-lint li[aria-selected]) {
    background: var(--bg-tab-hover, #3d3d3d);
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

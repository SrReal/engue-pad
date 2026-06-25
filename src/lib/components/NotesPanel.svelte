<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { notesStore, setNotesContent } from "$lib/notes/store.svelte";
  import { t } from "$lib/i18n";
  import { NoteBlank } from "phosphor-svelte";
  import { EditorView, keymap, lineNumbers } from "@codemirror/view";
  import { EditorState, type Extension } from "@codemirror/state";
  import { oneDark } from "@codemirror/theme-one-dark";
  import { markdown } from "@codemirror/lang-markdown";
  import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
  import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
  import { highlightSelectionMatches } from "@codemirror/search";

  let containerRef = $state<HTMLDivElement | null>(null);
  let view: EditorView | null = null;
  let isSettingContent = $state(false);
  let lastExternalContent = "";

  function buildEditor() {
    if (!containerRef) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isSettingContent) {
        setNotesContent(update.state.doc.toString());
      }
    });

    const extensions: Extension[] = [
      oneDark,
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      bracketMatching(),
      highlightSelectionMatches(),
      syntaxHighlighting(defaultHighlightStyle),
      markdown(),
      lineNumbers(),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": {
          height: "100%",
          backgroundColor: "transparent",
        },
        ".cm-content": {
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: "13px",
          lineHeight: "1.6",
          padding: "8px 4px",
        },
        ".cm-editor": {
          backgroundColor: "transparent",
        },
        ".cm-scroller": {
          backgroundColor: "transparent",
        },
        ".cm-gutters": {
          background: "rgba(0, 0, 0, 0.15)",
          borderRight: "1px solid var(--border-color, #333)",
          color: "var(--text-muted, #5a6377)",
          fontFamily: "'Inter', sans-serif",
          fontSize: "12px",
        },
      }),
      updateListener,
    ];

    const state = EditorState.create({
      doc: notesStore.content,
      extensions,
    });

    view?.destroy();
    view = new EditorView({ state, parent: containerRef });
    lastExternalContent = notesStore.content;
  }

  onMount(() => {
    buildEditor();
  });

  onDestroy(() => {
    view?.destroy();
  });

  // Sync external content changes (file load, file-watch reload) into CodeMirror
  $effect(() => {
    const content = notesStore.content;
    if (!view) return;
    if (content === lastExternalContent) return;
    isSettingContent = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content },
    });
    lastExternalContent = content;
    isSettingContent = false;
  });
</script>

<div class="notes-panel">
  {#if notesStore.loading}
    <div class="loading">{t("loading")}</div>
  {:else if !notesStore.path}
    <div class="empty">
      <span class="empty-icon"><NoteBlank size={28} /></span>
      <span class="empty-text">{t("notesPlaceholder")}</span>
    </div>
  {:else}
    <div class="notes-editor" bind:this={containerRef}></div>
  {/if}
</div>

<style>
  .notes-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: transparent;
    color: var(--text-color, #ccc);
    font-size: 13px;
  }

  .loading,
  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--text-muted, #888);
    padding: 24px 12px;
    text-align: center;
  }

  .empty-icon {
    opacity: 0.5;
  }

  .empty-text {
    font-size: 12px;
    line-height: 1.5;
    max-width: 220px;
  }

  .notes-editor {
    flex: 1;
    display: flex;
    min-height: 0;
    overflow: hidden;
  }

  .notes-editor :global(.cm-editor) {
    flex: 1;
    height: 100%;
  }

  .notes-editor :global(.cm-scroller) {
    overflow: auto;
  }
</style>
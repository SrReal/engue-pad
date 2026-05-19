import { EditorView, Decoration, ViewPlugin, ViewUpdate, EditorView as EV } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { addPreview } from "$lib/layout/store.svelte";
import { triggerMascotEvent } from "$lib/mascot/store.svelte";

const urlRegex = /https?:\/\/[^\s'"\)\]\>]+/g;

const urlMark = Decoration.mark({
  class: "cm-url-link",
  attributes: { title: "Ctrl+Click to open" },
});

function urlLinks(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    let match;
    urlRegex.lastIndex = 0;
    while ((match = urlRegex.exec(text)) !== null) {
      const start = from + match.index;
      const end = start + match[0].length;
      builder.add(start, end, urlMark);
    }
  }
  return builder.finish();
}

class UrlLinksView {
  decorations: ReturnType<typeof urlLinks>;
  constructor(view: EditorView) {
    this.decorations = urlLinks(view);
  }
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = urlLinks(update.view);
    }
  }
}

const urlLinksPlugin = ViewPlugin.fromClass(UrlLinksView, {
  decorations: (v) => v.decorations,
});

export function urlLinksFor(nodeId: string) {
  const urlClickHandler = EV.domEventHandlers({
    click(e) {
      if (!e.ctrlKey && !e.metaKey) return false;
      const target = e.target as HTMLElement;
      const link = target.closest(".cm-url-link") as HTMLElement | null;
      if (!link) return false;
      const url = link.textContent ?? "";
      if (!url) return false;
      addPreview(nodeId, url);
      triggerMascotEvent("preview_abierto");
      return true;
    },
  });
  return [urlLinksPlugin, urlClickHandler];
}

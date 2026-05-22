<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from "svelte";

  let { path }: { path: string } = $props();
  let src = $state<string>("");

  async function loadImage() {
    try {
      const bytes: number[] = await invoke("read_file_bytes", { path });
      const uint8 = new Uint8Array(bytes);
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      const mime = ext === "png"
        ? "image/png"
        : ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "gif"
            ? "image/gif"
            : ext === "webp"
              ? "image/webp"
              : ext === "svg"
                ? "image/svg+xml"
                : ext === "bmp"
                  ? "image/bmp"
                  : ext === "ico"
                    ? "image/x-icon"
                    : "application/octet-stream";
      const blob = new Blob([uint8], { type: mime });
      src = URL.createObjectURL(blob);
    } catch (e) {
      console.error("Failed to load image:", e);
    }
  }

  onMount(() => {
    loadImage();
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  });
</script>

<div class="image-viewer">
  {#if src}
    <img {src} alt={path} />
  {:else}
    <span class="loading">Loading...</span>
  {/if}
</div>

<style>
  .image-viewer {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    padding: 16px;
    background: var(--bg-panel, #1e1e1e);
  }

  .image-viewer img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 6px;
    box-shadow: 0 18px 36px rgba(0, 0, 0, 0.38);
  }

  .loading {
    color: var(--text-muted, #888);
    font-size: 13px;
  }
</style>

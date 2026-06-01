<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from "svelte";
  import { t } from "$lib/i18n";
  import { MusicNotes } from "phosphor-svelte";

  let { path }: { path: string } = $props();
  let src = $state<string>("");
  let fileName = $derived(path.split(/[\\/]/).pop() ?? path);

  async function loadAudio() {
    try {
      const bytes: number[] = await invoke("read_file_bytes", { path });
      const uint8 = new Uint8Array(bytes);
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      const mime = ext === "mp3"
        ? "audio/mpeg"
        : ext === "wav"
          ? "audio/wav"
          : ext === "ogg"
            ? "audio/ogg"
            : ext === "flac"
              ? "audio/flac"
              : ext === "m4a"
                ? "audio/mp4"
                : ext === "aac"
                  ? "audio/aac"
                  : ext === "opus"
                    ? "audio/opus"
                    : "audio/mpeg";
      const blob = new Blob([uint8], { type: mime });
      src = URL.createObjectURL(blob);
    } catch (e) {
      console.error("Failed to load audio:", e);
    }
  }

  onMount(() => {
    loadAudio();
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  });
</script>

<div class="audio-player">
  <div class="info">
    <span class="icon"><MusicNotes size={32} /></span>
    <span class="name">{fileName}</span>
  </div>
  {#if src}
    <audio controls {src} preload="metadata">
      <track kind="captions" />
    </audio>
  {:else}
    <span class="loading">{t("mediaLoading")}</span>
  {/if}
</div>

<style>
  .audio-player {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: var(--bg-panel, #1e1e1e);
    padding: 24px;
  }

  .info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-color, #ccc);
  }

  .icon {
    font-size: 20px;
  }

  .name {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  audio {
    width: 100%;
    max-width: 400px;
  }

  .loading {
    color: var(--text-muted, #888);
    font-size: 13px;
  }
</style>

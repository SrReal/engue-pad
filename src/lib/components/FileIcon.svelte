<script lang="ts">
  import { getMaterialIconUrl } from "$lib/icons/material";
  import { CaretRight, CaretDown } from "phosphor-svelte";

  let {
    path,
    size = 16,
    type,
    weight = "regular",
  }: {
    path?: string;
    name?: string;
    size?: number;
    type?: "folder" | "folder-open" | "terminal" | "preview" | "file";
    weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  } = $props();

  function getIconSrc(): string {
    if (type === "terminal") return "/icons/material/console.svg";
    if (type === "preview") return "/icons/material/globe.svg";
    if (!path) return "/icons/material/file.svg";

    const parts = path.split(/[\\/]/);
    const fileName = parts[parts.length - 1] ?? "";
    const isDir = type === "folder" || type === "folder-open";
    const expanded = type === "folder-open";

    return getMaterialIconUrl(fileName, isDir, expanded);
  }

  const iconSrc = $derived(getIconSrc());
  const isFolder = $derived(type === "folder" || type === "folder-open");
</script>

<span class="file-icon">
  {#if isFolder}
    {#if type === "folder-open"}
      <CaretDown size={12} />
    {:else}
      <CaretRight size={12} />
    {/if}
  {/if}
  <img src={iconSrc} alt="" width={size} height={size} loading="lazy" />
</span>

<style>
  .file-icon {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    user-select: none;
    -webkit-user-select: none;
  }

  .file-icon img {
    display: block;
    flex-shrink: 0;
    filter: none;
  }
</style>

<script lang="ts">
  import type { LayoutNode } from "$lib/layout/types";
  import SplitContainer from "./SplitContainer.svelte";
  import TabPanel from "./TabPanel.svelte";

  let { node }: { node: LayoutNode } = $props();
</script>

{#if node.kind === "split"}
  <SplitContainer {node} />
{:else}
  <TabPanel {node} />
{/if}

<script lang="ts">
  import ProcessFooter from "./ProcessFooter.svelte";
  import StatusBar from "./StatusBar.svelte";

  let { toggleProblems, showProblems }: { toggleProblems: () => void; showProblems: boolean } = $props();
</script>

<div class="app-footer">
  <ProcessFooter />
  <StatusBar {toggleProblems} {showProblems} />
</div>

<style>
  .app-footer {
    flex-shrink: 0;
    overflow: hidden;
    border: 1px solid var(--border-color, #333);
    border-radius: 8px;
    background: var(--bg-tab-bar, #252526);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  }

  .app-footer :global(.process-footer) {
    border-top: none;
  }
</style>

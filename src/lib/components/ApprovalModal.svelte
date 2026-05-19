<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from "svelte";

  let { requestId, message, onClose }: { requestId: string; message: string; onClose: () => void } = $props();
  let remaining = $state(30);

  function respond(approved: boolean) {
    invoke("respond_approval", { requestId, approved }).catch(console.error);
    onClose();
  }

  onMount(() => {
    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 1000);
    return () => clearInterval(interval);
  });
</script>

<div class="modal-backdrop">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">Solicitud de aprobación</span>
      <span class="timeout">{remaining}s</span>
    </div>
    <div class="modal-body">
      <p>{message}</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick={() => respond(false)} type="button">No</button>
      <button class="btn btn-primary" onclick={() => respond(true)} type="button">Sí</button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .modal {
    background: var(--bg-panel, #1e1e1e);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    width: 400px;
    max-width: 90vw;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color, #333);
  }

  .modal-title {
    font-weight: 600;
    font-size: 14px;
  }

  .timeout {
    font-size: 12px;
    color: var(--text-muted, #888);
    font-variant-numeric: tabular-nums;
  }

  .modal-body {
    padding: 16px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-color, #ccc);
  }

  .modal-body p {
    margin: 0;
    word-break: break-word;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--border-color, #333);
  }

  .btn {
    padding: 6px 16px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    border: none;
  }

  .btn-primary {
    background: var(--accent-color, #4a9eff);
    color: white;
  }

  .btn-secondary {
    background: var(--bg-tab, #2d2d2d);
    color: var(--text-color, #ccc);
    border: 1px solid var(--border-color, #333);
  }

  .btn:hover {
    opacity: 0.9;
  }
</style>

<script lang="ts">
  export let text = "Cargando proyecto...";
</script>

<div class="loading-screen">
  <div class="loading-content">
    <div class="spinner"></div>
    <div class="loading-text">{text}</div>
  </div>
</div>

<style>
  .loading-screen {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-app, #1a1a1a);
    color: var(--text-color, #ccc);
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--border-color, #333);
    border-top-color: var(--accent-color, #4a9eff);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-muted, #888);
    user-select: none;
    -webkit-user-select: none;
  }
</style>

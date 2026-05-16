<script lang="ts">
  import { todoStore, toggleTodoTask } from "$lib/todo/store.svelte";
  import type { TodoDocument } from "$lib/todo/parser";

  let { path }: { path?: string } = $props();

  $effect(() => {
    if (path && todoStore.path !== path) {
      import("$lib/todo/store.svelte").then(({ loadTodoFile }) => loadTodoFile(path));
    }
  });

  function handleToggle(lineIndex: number) {
    toggleTodoTask(lineIndex);
  }

  function progressPercent(doc: TodoDocument): number {
    if (doc.total === 0) return 0;
    return Math.round((doc.completed / doc.total) * 100);
  }
</script>

<div class="todo-panel">
  {#if todoStore.loading}
    <div class="loading">Loading...</div>
  {:else if todoStore.parsed.sections.length === 0}
    <div class="empty">
      <span class="empty-icon">📝</span>
      <span class="empty-text">No tasks found</span>
      <span class="empty-hint">Add checkboxes to your todo.md</span>
    </div>
  {:else}
    <div class="header">
      <span class="progress-bar">
        <span class="progress-fill" style:width="{progressPercent(todoStore.parsed)}%"></span>
      </span>
      <span class="progress-text">{todoStore.parsed.completed} / {todoStore.parsed.total}</span>
    </div>
    <div class="sections">
      {#each todoStore.parsed.sections as section}
        <div class="section">
          <div class="section-title" style:padding-left="{(section.level - 1) * 8}px">
            {section.title}
          </div>
          {#each section.tasks as task}
            <label class="task" class:checked={task.checked}>
              <input
                type="checkbox"
                checked={task.checked}
                onchange={() => handleToggle(task.lineIndex)}
              />
              <span class="task-text">{task.text}</span>
            </label>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .todo-panel {
    flex: 1;
    overflow: auto;
    padding: 16px;
    background: var(--bg-panel, #1e1e1e);
    color: var(--text-color, #ccc);
    font-size: 13px;
    display: flex;
    flex-direction: column;
  }

  .loading,
  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--text-muted, #888);
  }

  .empty-icon {
    font-size: 32px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 14px;
  }

  .empty-hint {
    font-size: 12px;
    opacity: 0.6;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color, #333);
    flex-shrink: 0;
  }

  .progress-bar {
    flex: 1;
    height: 6px;
    background: var(--bg-sidebar, #252526);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    display: block;
    height: 100%;
    background: var(--accent-color, #4a9eff);
    border-radius: 3px;
    transition: width 0.2s ease;
  }

  .progress-text {
    font-size: 12px;
    color: var(--text-muted, #888);
    white-space: nowrap;
  }

  .sections {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .section-title {
    font-weight: 600;
    font-size: 13px;
    color: var(--text-color, #ccc);
    padding: 4px 0;
    border-bottom: 1px solid var(--border-color, #333);
    margin-bottom: 4px;
  }

  .task {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.1s;
    user-select: none;
    -webkit-user-select: none;
  }

  .task:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .task input[type="checkbox"] {
    margin-top: 2px;
    accent-color: var(--accent-color, #4a9eff);
    cursor: pointer;
  }

  .task-text {
    flex: 1;
    line-height: 1.4;
    word-break: break-word;
  }

  .task.checked .task-text {
    text-decoration: line-through;
    color: var(--text-muted, #888);
  }
</style>

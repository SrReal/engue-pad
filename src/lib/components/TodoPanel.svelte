<script lang="ts">
  import {
    todoStore,
    toggleTodoTask,
    addTodoTask,
    editTodoTask,
    deleteTodoTask,
    addTodoSection,
    editTodoSectionTitle,
    deleteTodoSection,
  } from "$lib/todo/store.svelte";
  import type { TodoDocument, TodoSection, TodoTask } from "$lib/todo/parser";
  import { t } from "$lib/i18n";
  import { NotePencil, PencilSimple, X } from "phosphor-svelte";

  let editingTaskLine = $state<number | null>(null);
  let editingTaskValue = $state("");
  let editingSectionStart = $state<number | null>(null);
  let editingSectionValue = $state("");
  let newTaskInputs = $state<Record<number, string>>({});
  let newSectionValue = $state("");
  let addingSection = $state(false);

  function progressPercent(doc: TodoDocument): number {
    if (doc.total === 0) return 0;
    return Math.round((doc.completed / doc.total) * 100);
  }

  function startEditTask(task: TodoTask) {
    editingTaskLine = task.lineIndex;
    editingTaskValue = task.text;
  }

  function submitEditTask() {
    if (editingTaskLine !== null) {
      editTodoTask(editingTaskLine, editingTaskValue);
    }
    editingTaskLine = null;
    editingTaskValue = "";
  }

  function cancelEditTask() {
    editingTaskLine = null;
    editingTaskValue = "";
  }

  function startEditSection(section: TodoSection) {
    editingSectionStart = section.startLine;
    editingSectionValue = section.title;
  }

  function submitEditSection() {
    if (editingSectionStart !== null) {
      editTodoSectionTitle(editingSectionStart, editingSectionValue);
    }
    editingSectionStart = null;
    editingSectionValue = "";
  }

  function cancelEditSection() {
    editingSectionStart = null;
    editingSectionValue = "";
  }

  function handleNewTaskKeydown(e: KeyboardEvent, sectionEndLine: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      const text = newTaskInputs[sectionEndLine] ?? "";
      if (text.trim()) {
        addTodoTask(sectionEndLine, text.trim());
        newTaskInputs[sectionEndLine] = "";
      }
    }
    if (e.key === "Escape") {
      newTaskInputs[sectionEndLine] = "";
    }
  }

  function handleAddSection() {
    if (newSectionValue.trim()) {
      addTodoSection(newSectionValue.trim());
      newSectionValue = "";
      addingSection = false;
    }
  }

  function handleSectionKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSection();
    }
    if (e.key === "Escape") {
      addingSection = false;
      newSectionValue = "";
    }
  }
</script>

<div class="todo-panel">
  {#if todoStore.loading}
    <div class="loading">Loading...</div>
  {:else if todoStore.parsed.sections.length === 0}
    <div class="empty">
      <span class="empty-icon"><NotePencil size={24} /></span>
      <span class="empty-text">No tasks yet</span>
      <button class="add-section-btn" onclick={() => addingSection = true}>Add section</button>
    </div>
  {:else}
    <div class="header">
      <span class="progress-bar" title="{progressPercent(todoStore.parsed)}% complete">
        <span class="progress-fill" style:width="{progressPercent(todoStore.parsed)}%"></span>
      </span>
      <span class="progress-text">{todoStore.parsed.completed}/{todoStore.parsed.total}</span>
    </div>

    <div class="sections">
      {#each todoStore.parsed.sections as section}
        <div class="section">
          <div class="section-header">
            {#if editingSectionStart === section.startLine}
              <input
                class="section-title-input"
                type="text"
                bind:value={editingSectionValue}
                onkeydown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); submitEditSection(); }
                  if (e.key === "Escape") cancelEditSection();
                }}
                onblur={submitEditSection}
                autofocus
              />
            {:else}
              <span
                class="section-title"
                style:padding-left="{(section.level - 1) * 8}px"
                ondblclick={() => startEditSection(section)}
              >
                {section.title}
              </span>
              <div class="section-actions">
                <button class="action-btn" title="Rename" onclick={() => startEditSection(section)}><PencilSimple size={14} /></button>
                <button class="action-btn danger" title="Delete section" onclick={() => deleteTodoSection(section.startLine, section.endLine)}><X size={14} /></button>
              </div>
            {/if}
          </div>

          {#each section.tasks as task}
            {#if editingTaskLine === task.lineIndex}
              <div class="task editing">
                <input
                  type="checkbox"
                  checked={task.checked}
                  disabled
                />
                <input
                  class="task-edit-input"
                  type="text"
                  bind:value={editingTaskValue}
                  onkeydown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); submitEditTask(); }
                    if (e.key === "Escape") cancelEditTask();
                  }}
                  onblur={submitEditTask}
                  autofocus
                />
              </div>
            {:else}
              <div class="task-row">
                <label class="task" class:checked={task.checked}>
                  <input
                    type="checkbox"
                    checked={task.checked}
                    onchange={() => toggleTodoTask(task.lineIndex)}
                  />
                  <span
                    class="task-text editable"
                    onclick={(e) => { e.preventDefault(); e.stopPropagation(); startEditTask(task); }}
                  >{task.text}</span>
                </label>
                <div class="task-actions">
                  <button class="action-btn danger" title="Delete" onclick={() => deleteTodoTask(task.lineIndex)}><X size={14} /></button>
                </div>
              </div>
            {/if}
          {/each}

          <div class="new-task-row">
            <span class="new-task-prefix">+</span>
            <input
              class="new-task-input"
              type="text"
              placeholder={t("todoAddTaskPlaceholder")}
              bind:value={newTaskInputs[section.endLine]}
              onkeydown={(e) => handleNewTaskKeydown(e, section.endLine)}
            />
          </div>
        </div>
      {/each}
    </div>

    <div class="add-section-area">
      {#if addingSection}
        <input
          class="new-section-input"
          type="text"
          placeholder={t("todoSectionPlaceholder")}
          bind:value={newSectionValue}
          onkeydown={handleSectionKeydown}
          onblur={() => { if (!newSectionValue.trim()) addingSection = false; }}
          autofocus
        />
      {:else}
        <button class="add-section-btn" onclick={() => addingSection = true}>+ New section</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .todo-panel {
    flex: 1;
    overflow: auto;
    padding: 14px 10px;
    background: transparent;
    color: var(--text-color, #ccc);
    font-size: 13px;
    display: flex;
    flex-direction: column;
    min-height: 0;
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
    padding: 24px 8px;
  }

  .empty-icon {
    font-size: 28px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: 13px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
    padding: 0 4px 12px;
    border-bottom: 1px solid var(--border-color, #333);
    flex-shrink: 0;
  }

  .progress-bar {
    flex: 1;
    height: 6px;
    background: var(--bg-panel, #1e1e1e);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--accent-color, #4a9eff), var(--accent-cyan, #00e5ff));
    border-radius: 3px;
    transition: width 0.2s ease;
  }

  .progress-text {
    font-size: 11px;
    color: var(--text-muted, #888);
    white-space: nowrap;
  }

  .sections {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    padding: 6px 4px;
    border-bottom: 1px solid var(--border-color, #333);
    margin-bottom: 2px;
  }

  .section-title {
    font-weight: 600;
    font-size: 12px;
    color: #cbd5e1;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
  }

  .section-title-input {
    flex: 1;
    background-color: var(--bg-surface, #1e1e1e);
    border: 1px solid var(--accent-color, #4a9eff);
    color: var(--text-color, #ccc);
    min-height: 28px;
    padding: 5px 9px;
    font-size: 12px;
    border-radius: 5px;
    outline: none;
    font-weight: 600;
  }

  .section-actions,
  .task-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.1s;
  }

  .section-header:hover .section-actions,
  .task-row:hover .task-actions {
    opacity: 1;
  }

  .task-row {
    display: flex;
    align-items: center;
    gap: 2px;
    border-radius: 6px;
    transition: background 0.1s;
  }

  .task-row:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .task {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 3px 4px;
    border-radius: 5px;
    cursor: pointer;
    flex: 1;
    min-width: 0;
    user-select: none;
    -webkit-user-select: none;
  }

  .task input[type="checkbox"] {
    margin-top: 1px;
    accent-color: var(--accent-color, #4a9eff);
    cursor: pointer;
    flex-shrink: 0;
  }

  .task-text {
    flex: 1;
    line-height: 1.35;
    word-break: break-word;
    font-size: 13px;
  }

  .task-text.editable {
    cursor: text;
    border-radius: 5px;
    padding: 1px 2px;
    margin: -1px -2px;
  }

  .task-text.editable:hover {
    background: var(--bg-tab-hover, #3d3d3d);
  }

  .task.checked .task-text {
    text-decoration: line-through;
    color: var(--text-muted, #888);
  }

  .task.editing {
    padding: 2px 4px;
    gap: 6px;
  }

  .task-edit-input {
    flex: 1;
    background-color: var(--bg-surface, #1e1e1e);
    border: 1px solid var(--accent-color, #4a9eff);
    color: var(--text-color, #ccc);
    min-height: 28px;
    padding: 5px 9px;
    font-size: 13px;
    border-radius: 5px;
    outline: none;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    background: transparent;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    font-size: 12px;
    border-radius: 5px;
    padding: 0;
    line-height: 1;
  }

  .action-btn:hover {
    background: var(--bg-tab-hover, #3d3d3d);
    color: var(--text-color, #ccc);
  }

  .action-btn.danger:hover {
    background: var(--error-color, #c44);
    color: white;
  }

  .new-task-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px 2px 22px;
    opacity: 0.5;
    transition: opacity 0.15s;
  }

  .new-task-row:hover,
  .new-task-row:focus-within {
    opacity: 1;
  }

  .new-task-prefix {
    color: var(--text-muted, #888);
    font-size: 12px;
    flex-shrink: 0;
  }

  .new-task-input {
    flex: 1;
    background-color: transparent;
    border: none;
    border-bottom: 1px solid transparent;
    color: var(--text-color, #ccc);
    padding: 2px 0;
    font-size: 13px;
    outline: none;
  }

  .new-task-input::placeholder {
    color: var(--text-muted, #888);
    font-size: 12px;
  }

  .new-task-input:focus {
    border-bottom-color: var(--accent-color, #4a9eff);
    box-shadow: none;
  }

  .add-section-area {
    padding: 8px 4px;
    flex-shrink: 0;
  }

  .add-section-btn {
    width: 100%;
    padding: 6px;
    background: var(--bg-surface, #111827);
    border: 1px solid var(--border-color, #333);
    color: var(--text-color, #ccc);
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.15s;
  }

  .add-section-btn:hover {
    border-color: var(--accent-color, #4a9eff);
    color: var(--accent-color, #4a9eff);
  }

  .new-section-input {
    width: 100%;
    background-color: var(--bg-surface, #1e1e1e);
    border: 1px solid var(--accent-color, #4a9eff);
    color: var(--text-color, #ccc);
    min-height: 30px;
    padding: 5px 9px;
    font-size: 13px;
    border-radius: 6px;
    outline: none;
  }
</style>

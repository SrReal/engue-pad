export let editorJumpState = $state<{ line: number; nonce: number } | null>(null);

export function requestEditorJump(line: number) {
  editorJumpState = { line, nonce: Date.now() };
}

export function clearEditorJumpRequest() {
  editorJumpState = null;
}

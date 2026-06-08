export const editorJumpRequest = $state<{ line: number; nonce: number }> | null>(null);

export function requestEditorJump(line: number) {
  editorJumpRequest = { line, nonce: Date.now() };
}

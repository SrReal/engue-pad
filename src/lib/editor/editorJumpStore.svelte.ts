export const editorJump = $state({ line: 0, nonce: 0, active: false });

export function requestEditorJump(line: number) {
  editorJump.line = line;
  editorJump.nonce = Date.now();
  editorJump.active = true;
}

export function clearEditorJumpRequest() {
  editorJump.active = false;
}

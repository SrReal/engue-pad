export interface SymbolInfo {
  name: string;
  type: "function" | "class" | "method" | "arrow";
  line: number;
}

export function extractJsTsSymbols(content: string): SymbolInfo[] {
  const symbols: SymbolInfo[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and blank lines
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

    // Function declaration: function name(
    const funcMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
    if (funcMatch) {
      symbols.push({ name: funcMatch[1], type: "function", line: i + 1 });
      continue;
    }

    // Class declaration: class Name
    const classMatch = trimmed.match(/^(?:export\s+)?class\s+(\w+)/);
    if (classMatch) {
      symbols.push({ name: classMatch[1], type: "class", line: i + 1 });
      continue;
    }

    // Arrow function assignment: const name = (...) =>
    const arrowMatch = trimmed.match(
      /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/
    );
    if (arrowMatch) {
      symbols.push({ name: arrowMatch[1], type: "arrow", line: i + 1 });
      continue;
    }

    // Method-like: name(...) { (skip control flow keywords)
    const methodMatch = trimmed.match(/^(\w+)\s*\([^)]*\)\s*\{/);
    if (methodMatch) {
      const name = methodMatch[1];
      if (!["if", "while", "for", "switch", "catch"].includes(name)) {
        symbols.push({ name, type: "method", line: i + 1 });
      }
    }
  }

  return symbols;
}

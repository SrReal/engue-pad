import { invoke } from "@tauri-apps/api/core";
import { linter as cmLinter, setDiagnostics, type Diagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import { setProblemsForPath } from "./problems.svelte";
import { linterConfig } from "$lib/workspace/store.svelte";

export type LinterSeverity = "error" | "warning" | "info";

export interface LinterResult {
  from: number;
  to: number;
  severity: LinterSeverity;
  message: string;
}

async function runCommand(
  command: string,
  args: string[],
  cwd?: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>(
      "run_command",
      { command, args, cwd, stdin: null }
    );
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exit_code };
  } catch (e) {
    return { stdout: "", stderr: String(e), exitCode: -1 };
  }
}

function lineColToOffset(content: string, line: number, column: number): number {
  const lines = content.split("\n");
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1;
  }
  return offset + Math.max(0, column - 1);
}

function biomeAdapter(content: string, stdout: string): LinterResult[] {
  try {
    const data = JSON.parse(stdout);
    const diagnostics: LinterResult[] = [];
    for (const d of data.diagnostics || []) {
      const span = d.location?.span;
      let from = 0;
      let to = 1;
      if (Array.isArray(span) && span.length === 2) {
        from = span[0];
        to = span[1];
      }
      diagnostics.push({
        from,
        to: Math.max(from + 1, to),
        severity: d.severity === "error" ? "error" : "warning",
        message: d.description ? `${d.description} (${d.category})` : d.category,
      });
    }
    return diagnostics;
  } catch {
    return [];
  }
}

async function biomeLint(path: string, content: string): Promise<LinterResult[]> {
  const result = await runCommand("biome", ["check", "--json", path]);
  if (result.exitCode !== 0 && result.exitCode !== 1) return [];
  return biomeAdapter(content, result.stdout);
}

function eslintAdapter(content: string, stdout: string): LinterResult[] {
  try {
    const data = JSON.parse(stdout);
    const results: LinterResult[] = [];
    for (const file of data) {
      for (const m of file.messages || []) {
        const from = lineColToOffset(content, m.line ?? 1, m.column ?? 1);
        const to = m.endLine != null && m.endColumn != null
          ? lineColToOffset(content, m.endLine, m.endColumn)
          : from + 1;
        results.push({
          from,
          to: Math.max(from + 1, to),
          severity: m.severity === 2 ? "error" : "warning",
          message: `${m.message} (${m.ruleId ?? "eslint"})`,
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function eslintLint(path: string, content: string): Promise<LinterResult[]> {
  const result = await runCommand("npx", ["eslint", "--format", "json", path]);
  if (result.exitCode !== 0 && result.exitCode !== 1) return [];
  return eslintAdapter(content, result.stdout);
}

function ruffAdapter(content: string, stdout: string): LinterResult[] {
  try {
    const data = JSON.parse(stdout);
    return (data || []).map((m: any) => {
      const from = lineColToOffset(content, m.location?.row ?? 1, m.location?.column ?? 1);
      const to = lineColToOffset(content, m.end_location?.row ?? 1, m.end_location?.column ?? 1);
      return {
        from,
        to: Math.max(from + 1, to),
        severity: (m.fix ? "warning" : "error") as LinterSeverity,
        message: `${m.message} (${m.code})`,
      };
    });
  } catch {
    return [];
  }
}

async function ruffLint(path: string, content: string): Promise<LinterResult[]> {
  const result = await runCommand("ruff", ["check", "--output-format", "json", path]);
  if (result.exitCode !== 0 && result.exitCode !== 1) return [];
  return ruffAdapter(content, result.stdout);
}

function psAdapter(content: string, stdout: string): LinterResult[] {
  try {
    const data = JSON.parse(stdout);
    const items = Array.isArray(data) ? data : [data];
    return items.map((m: any) => {
      const from = lineColToOffset(content, m.Line ?? 1, m.Column ?? 1);
      return {
        from,
        to: from + 1,
        severity: (m.Severity === "Error" ? "error" : "warning") as LinterSeverity,
        message: `${m.Message} (${m.RuleName})`,
      };
    });
  } catch {
    return [];
  }
}

async function psLint(path: string, content: string): Promise<LinterResult[]> {
  const result = await runCommand("pwsh", [
    "-Command",
    `Invoke-ScriptAnalyzer -Path "${path}" | ConvertTo-Json -Depth 3`,
  ]);
  if (result.exitCode !== 0 && result.exitCode !== 1) return [];
  return psAdapter(content, result.stdout);
}

type LinterFn = (path: string, content: string) => Promise<LinterResult[]>;

const lintersByLanguage: Record<string, LinterFn[]> = {
  javascript: [biomeLint, eslintLint],
  typescript: [biomeLint, eslintLint],
  json: [biomeLint],
  python: [ruffLint],
  shell: [ruffLint],
  powershell: [psLint],
};

const linterCommandsByLanguage: Record<string, string[]> = {
  javascript: ["biome", "npx"],
  typescript: ["biome", "npx"],
  json: ["biome"],
  python: ["ruff"],
  shell: ["ruff"],
  powershell: ["pwsh"],
};

export async function checkLinterAvailability(language: string): Promise<boolean> {
  const commands = linterCommandsByLanguage[language];
  if (!commands || commands.length === 0) return false;
  for (const cmd of commands) {
    const result = await runCommand(cmd, ["--version"]);
    if (result.exitCode === 0) return true;
  }
  return false;
}

export async function runLinters(
  language: string,
  path: string,
  content: string
): Promise<LinterResult[]> {
  const linters = lintersByLanguage[language];
  if (!linters || linters.length === 0) return [];

  const preferred = linterConfig.languages?.[language];
  if (preferred) {
    const map: Record<string, LinterFn> = {
      biome: biomeLint,
      eslint: eslintLint,
      ruff: ruffLint,
      psscriptanalyzer: psLint,
    };
    const linter = map[preferred.toLowerCase()];
    if (linter) {
      try {
        const results = await linter(path, content);
        if (results.length > 0) return results;
      } catch {
        // fallback to default chain
      }
    }
  }

  for (const linter of linters) {
    try {
      const results = await linter(path, content);
      if (results.length > 0) return results;
    } catch {
      // try next linter
    }
  }
  return [];
}

function toCmDiagnostics(results: LinterResult[], docLength: number): Diagnostic[] {
  return results.map((r) => ({
    from: Math.min(r.from, docLength),
    to: Math.min(r.to, docLength),
    severity: r.severity,
    message: r.message,
  }));
}

export async function forceLint(view: EditorView, path: string, language: string) {
  const content = view.state.doc.toString();
  if (!content.trim()) {
    view.dispatch(setDiagnostics(view.state, []));
    setProblemsForPath(path, []);
    return;
  }
  try {
    const results = await runLinters(language, path, content);
    view.dispatch(setDiagnostics(view.state, toCmDiagnostics(results, view.state.doc.length)));
    setProblemsForPath(
      path,
      results.map((r) => ({ path, from: r.from, to: r.to, severity: r.severity, message: r.message }))
    );
  } catch {
    view.dispatch(setDiagnostics(view.state, []));
    setProblemsForPath(path, []);
  }
}

export function linterFor(path: string, language: string) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return cmLinter(async (view: EditorView) => {
    const content = view.state.doc.toString();
    if (!content.trim()) return [];

    return new Promise((resolve) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          const results = await runLinters(language, path, content);
          setProblemsForPath(
            path,
            results.map((r) => ({ path, from: r.from, to: r.to, severity: r.severity, message: r.message }))
          );
          resolve(toCmDiagnostics(results, view.state.doc.length));
        } catch {
          setProblemsForPath(path, []);
          resolve([]);
        }
      }, 800);
    });
  });
}

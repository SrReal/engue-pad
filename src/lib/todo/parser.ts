export type TodoTask = {
  text: string;
  checked: boolean;
  lineIndex: number;
};

export type TodoSection = {
  title: string;
  level: number;
  startLine: number;
  endLine: number;
  tasks: TodoTask[];
};

export type TodoDocument = {
  sections: TodoSection[];
  total: number;
  completed: number;
};

export function parseTodoMarkdown(source: string): TodoDocument {
  const lines = source.split(/\r?\n/);
  const sections: TodoSection[] = [];
  let currentSection: TodoSection | null = null;
  let total = 0;
  let completed = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      if (currentSection) {
        currentSection.endLine = i - 1;
        sections.push(currentSection);
      }
      currentSection = {
        title: headerMatch[2].trim(),
        level: headerMatch[1].length,
        startLine: i,
        endLine: i,
        tasks: [],
      };
      continue;
    }

    const checkboxMatch = line.match(/^[\s]*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (checkboxMatch) {
      const checked = checkboxMatch[1].toLowerCase() === "x";
      const text = checkboxMatch[2].trim();
      if (!currentSection) {
        currentSection = {
          title: "General",
          level: 2,
          startLine: i,
          endLine: i,
          tasks: [],
        };
      }
      currentSection.tasks.push({ text, checked, lineIndex: i });
      total++;
      if (checked) completed++;
    }
  }

  if (currentSection) {
    currentSection.endLine = lines.length - 1;
    sections.push(currentSection);
  }

  return { sections, total, completed };
}

export function toggleTaskInMarkdown(source: string, lineIndex: number): string {
  const lines = source.split(/\r?\n/);
  if (lineIndex < 0 || lineIndex >= lines.length) return source;
  const line = lines[lineIndex];
  const toggled = line.replace(/^(\s*[-*]\s+\[)([ xX])(\]\s+.*)$/, (_, prefix, checked, suffix) => {
    const newChecked = checked.toLowerCase() === "x" ? " " : "x";
    return prefix + newChecked + suffix;
  });
  lines[lineIndex] = toggled;
  return lines.join("\n");
}

export function addTaskInMarkdown(source: string, sectionEndLine: number, text: string): string {
  const lines = source.split(/\r?\n/);
  const insertIndex = Math.min(sectionEndLine + 1, lines.length);
  lines.splice(insertIndex, 0, `- [ ] ${text}`);
  return lines.join("\n");
}

export function editTaskInMarkdown(source: string, lineIndex: number, newText: string): string {
  const lines = source.split(/\r?\n/);
  if (lineIndex < 0 || lineIndex >= lines.length) return source;
  const line = lines[lineIndex];
  const updated = line.replace(/^(\s*[-*]\s+\[[ xX]\]\s+).*$/, `$1${newText}`);
  lines[lineIndex] = updated;
  return lines.join("\n");
}

export function deleteTaskInMarkdown(source: string, lineIndex: number): string {
  const lines = source.split(/\r?\n/);
  if (lineIndex < 0 || lineIndex >= lines.length) return source;
  lines.splice(lineIndex, 1);
  return lines.join("\n");
}

export function addSectionInMarkdown(source: string, title: string, level = 2): string {
  const lines = source.split(/\r?\n/);
  // Remove trailing empty lines then add one blank line + header
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }
  const prefix = "#".repeat(level);
  lines.push("", `${prefix} ${title}`, "");
  return lines.join("\n");
}

export function editSectionTitleInMarkdown(source: string, startLine: number, newTitle: string): string {
  const lines = source.split(/\r?\n/);
  if (startLine < 0 || startLine >= lines.length) return source;
  const line = lines[startLine];
  const updated = line.replace(/^(#{1,6})\s+.*$/, `$1 ${newTitle}`);
  lines[startLine] = updated;
  return lines.join("\n");
}

export function deleteSectionInMarkdown(source: string, startLine: number, endLine: number): string {
  const lines = source.split(/\r?\n/);
  const start = Math.max(0, startLine);
  const end = Math.min(lines.length - 1, endLine);
  if (start > end) return source;
  lines.splice(start, end - start + 1);
  // Remove trailing blank lines
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }
  return lines.join("\n");
}

import { t } from "../i18n";

export function getDefaultTodoTemplate(): string {
  return `# ${t("appName")} ${t("todoProgress")}

## ${t("todoSectionTodo")}
- [ ] ${t("todoTaskFirst")}

## ${t("todoSectionInProgress")}
- [ ] ${t("todoTaskWorking")}

## ${t("todoSectionDone")}
- [x] ${t("todoTaskCompleted")}
`;
}

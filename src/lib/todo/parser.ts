export type TodoTask = {
  text: string;
  checked: boolean;
  lineIndex: number;
};

export type TodoSection = {
  title: string;
  level: number;
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

    // Header line: ## Title or # Title
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: headerMatch[2].trim(),
        level: headerMatch[1].length,
        tasks: [],
      };
      continue;
    }

    // Checkbox line: - [ ] text or - [x] text or * [ ] text
    const checkboxMatch = line.match(/^[\s]*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (checkboxMatch) {
      const checked = checkboxMatch[1].toLowerCase() === "x";
      const text = checkboxMatch[2].trim();
      if (!currentSection) {
        currentSection = {
          title: "General",
          level: 2,
          tasks: [],
        };
      }
      currentSection.tasks.push({ text, checked, lineIndex: i });
      total++;
      if (checked) completed++;
    }
  }

  if (currentSection) {
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

export const DEFAULT_TODO_TEMPLATE = `# Project Tasks

## Todo
- [ ] First task

## In Progress
- [ ] Working on something

## Done
- [x] Completed task
`;

export function fenceFor(content: string, language = ""): string[] {
  const maxRun = Math.max(3, ...[...content.matchAll(/`+/g)].map((match) => match[0].length + 1));
  const fence = "`".repeat(maxRun);
  return [`${fence}${language}`, content, fence];
}

export function fencedOrFallback(content: string | null | undefined, language = "", fallback = "_(empty)_"): string[] {
  if (!content) return [fallback];
  return fenceFor(content, language);
}

export function markdownTable(headers: readonly string[], rows: readonly (readonly unknown[])[]): string[] {
  const escape = (value: unknown): string => String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  return [
    `| ${headers.map(escape).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escape).join(" | ")} |`),
  ];
}

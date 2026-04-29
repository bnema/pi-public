import { readFileSync } from "node:fs";

export function parseJson<T>(raw: string, label: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label} is not valid JSON: ${message}`);
  }
}

export function readJsonFile<T>(path: string): T {
  return parseJson<T>(readFileSync(path, "utf8"), path);
}

export function readJsonlFile<T>(path: string): T[] {
  const raw = readFileSync(path, "utf8");
  const rows: T[] = [];
  raw.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    rows.push(parseJson<T>(line, `${path}:${index + 1}`));
  });
  return rows;
}

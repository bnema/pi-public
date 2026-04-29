import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function defaultOutputPath(ownerRepo: string, prNumber: number, label = "review-comments"): string {
  const safeRepo = ownerRepo.replace(/[^A-Za-z0-9_.-]+/g, "-").replace(/^-+|-+$/g, "");
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const basename = `${safeRepo}-pr-${prNumber}-${label}-${timestamp}`;
  const directory = mkdtempSync(join(tmpdir(), `${basename}-`));
  return join(directory, `${basename}.md`);
}

export function siblingPath(path: string, suffix: string): string {
  return path.endsWith(".md") ? path.replace(/\.md$/, suffix) : `${path}${suffix}`;
}

export function writePrivateFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
}

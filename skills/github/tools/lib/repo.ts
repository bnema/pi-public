import { run } from "./command.js";

export function parsePositiveInteger(raw: string, name: string): number {
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be a positive integer, got ${JSON.stringify(raw)}`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer, got ${JSON.stringify(raw)}`);
  return value;
}

export function splitOwnerRepo(ownerRepo: string): [owner: string, repo: string] {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(ownerRepo)) {
    throw new Error(`--repo must be exactly OWNER/REPO, got ${JSON.stringify(ownerRepo)}`);
  }
  return ownerRepo.split("/", 2) as [string, string];
}

export function detectRepo(cwd: string): string {
  return run("git", ["remote", "get-url", "origin"], cwd)
    .replace(/^git@github\.com:/, "")
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/^\/+|\/+$/g, "");
}

export function detectPr(cwd: string): number {
  return parsePositiveInteger(run("gh", ["pr", "view", "--json", "number", "--jq", ".number"], cwd), "detected PR number");
}

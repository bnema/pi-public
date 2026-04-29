import { run, runAllowFailure } from "./command.js";
import { parseJson } from "./json.js";

export type PrFile = { path: string; additions: number; deletions: number; changeType: string };
export type PrCommit = { oid: string; abbreviatedOid?: string; messageHeadline: string; committedDate?: string; authors?: { name?: string; email?: string; login?: string }[] };

export type PullRequestView = {
  number: number;
  title: string;
  url: string;
  state: string;
  author?: { login?: string };
  baseRefName: string;
  headRefName: string;
  baseRefOid: string;
  headRefOid: string;
  mergeStateStatus?: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  commits: PrCommit[];
  files: PrFile[];
};

export type CheckRun = {
  bucket: string;
  completedAt: string;
  description: string;
  event: string;
  link: string;
  name: string;
  startedAt: string;
  state: string;
  workflow: string;
};

const PR_VIEW_FIELDS = [
  "number", "title", "url", "state", "author", "baseRefName", "headRefName", "baseRefOid", "headRefOid",
  "mergeStateStatus", "changedFiles", "additions", "deletions", "commits", "files",
].join(",");

const PR_CHECK_FIELDS = "name,state,link,startedAt,completedAt,workflow,bucket,description,event";

export function ghPrView(prNumber: number, cwd?: string, ownerRepo?: string): PullRequestView {
  const args = ["pr", "view", String(prNumber)];
  if (ownerRepo) args.push("-R", ownerRepo);
  args.push("--json", PR_VIEW_FIELDS);
  return parseJson<PullRequestView>(run("gh", args, cwd), "gh pr view");
}

export function ghPrChecks(prNumber: number, cwd?: string, ownerRepo?: string): CheckRun[] {
  const args = ["pr", "checks", String(prNumber)];
  if (ownerRepo) args.push("-R", ownerRepo);
  args.push("--json", PR_CHECK_FIELDS);
  const result = runAllowFailure("gh", args, cwd);
  if (result.stdout.trim()) return parseJson<CheckRun[]>(result.stdout, "gh pr checks");
  if (result.status !== 0) {
    const stderr = result.stderr.toLowerCase();
    if (stderr.includes("no checks") || stderr.includes("no status checks") || stderr.includes("checks have not")) return [];
    throw new Error(`gh pr checks failed (${result.status ?? "unknown"}):\n${result.stderr}`);
  }
  return [];
}

export function localGitDiff(baseOid: string, headOid: string, cwd: string): string {
  return run("git", ["diff", "--no-ext-diff", `${baseOid}..${headOid}`], cwd);
}

export function localGitDiffStat(baseOid: string, headOid: string, cwd: string): string {
  return run("git", ["diff", "--stat", `${baseOid}..${headOid}`], cwd);
}

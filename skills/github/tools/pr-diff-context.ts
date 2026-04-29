#!/usr/bin/env bun
/** Produce compact GitHub PR diff context for agents. */

import { parseArgs, type StdoutMode } from "./lib/args.js";
import { fenceFor, markdownTable } from "./lib/markdown-common.js";
import { defaultOutputPath, siblingPath, writePrivateFile } from "./lib/output.js";
import { ghPrView, localGitDiff, localGitDiffStat, type PullRequestView } from "./lib/pr.js";
import { detectPr, detectRepo, splitOwnerRepo } from "./lib/repo.js";

type Args = { repo?: string; pr?: number; cwd: string; out?: string; jsonOut?: string; stdout: StdoutMode; maxDiffBytes: number };

type DiffContext = {
  ok: true;
  repo: string;
  pr: number;
  title: string;
  url: string;
  state: string;
  mergeStateStatus?: string;
  refs: { baseRefName: string; headRefName: string; baseRefOid: string; headRefOid: string };
  counts: { changedFiles: number; additions: number; deletions: number; commits: number };
  changedFiles: PullRequestView["files"];
  commits: PullRequestView["commits"];
  diffStat: string;
  diff: string;
  truncated: boolean;
  warnings: string[];
};

function usage(): never {
  console.log(`Usage: pr-diff-context.ts [options]

Options:
  --repo OWNER/REPO       GitHub repository. Default: parsed from git origin.
  --pr NUMBER             Pull request number. Default: gh pr view for current branch.
  --cwd PATH              Local checkout for git diff. Default: current directory.
  --out PATH              Markdown output path. Default: private /tmp/.../*.md
  --json-out PATH         Full JSON output path. Default: same basename with .json suffix.
  --stdout MODE           summary, json, or none. Default: summary.
  --max-diff-bytes N      Max diff bytes included in outputs. Default: 200000.
  -h, --help              Show this help.
`);
  process.exit(0);
}

function parse(argv: readonly string[]): Args {
  const parsed = parseArgs(argv, {
    string: ["--repo", "--cwd", "--out", "--json-out"],
    number: ["--pr", "--max-diff-bytes"],
    stdout: ["summary", "json", "none"],
  });
  if (parsed.booleans["--help"]) usage();
  return {
    repo: parsed.strings["--repo"],
    pr: parsed.numbers["--pr"],
    cwd: parsed.strings["--cwd"] ?? process.cwd(),
    out: parsed.strings["--out"],
    jsonOut: parsed.strings["--json-out"],
    stdout: parsed.stdout ?? "summary",
    maxDiffBytes: parsed.numbers["--max-diff-bytes"] ?? 200_000,
  };
}

function truncate(text: string, maxBytes: number): { text: string; truncated: boolean } {
  const bytes = Buffer.from(text, "utf8");
  if (bytes.byteLength <= maxBytes) return { text, truncated: false };
  return { text: `${bytes.subarray(0, maxBytes).toString("utf8")}\n\n[diff truncated at ${maxBytes} bytes]\n`, truncated: true };
}

function renderMarkdown(context: DiffContext): string {
  const out: string[] = [];
  out.push(`# PR diff context: ${context.repo}#${context.pr}`, "");
  out.push(`- Title: ${context.title}`);
  out.push(`- URL: ${context.url}`);
  out.push(`- State: ${context.state}`);
  if (context.mergeStateStatus) out.push(`- Merge state: ${context.mergeStateStatus}`);
  out.push(`- Base: ${context.refs.baseRefName} (${context.refs.baseRefOid})`);
  out.push(`- Head: ${context.refs.headRefName} (${context.refs.headRefOid})`);
  out.push(`- Changed files: ${context.counts.changedFiles} (+${context.counts.additions}/-${context.counts.deletions})`);
  out.push(`- Commits: ${context.counts.commits}`);
  out.push(`- Diff truncated: ${context.truncated}`);
  if (context.warnings.length) out.push("", "## Warnings", ...context.warnings.map((warning) => `- ${warning}`));

  out.push("", "## Files", ...markdownTable(["Path", "Change", "+", "-"], context.changedFiles.map((file) => [file.path, file.changeType, file.additions, file.deletions])));
  out.push("", "## Commits", ...markdownTable(["OID", "Message"], context.commits.map((commit) => [commit.abbreviatedOid ?? commit.oid.slice(0, 12), commit.messageHeadline])));
  out.push("", "## Diff stat", ...fenceFor(context.diffStat, "text"));
  out.push("", "## Bounded diff", ...fenceFor(context.diff, "diff"), "");
  return out.join("\n");
}

function main(): number {
  const args = parse(process.argv.slice(2));
  const repo = args.repo ?? detectRepo(args.cwd);
  splitOwnerRepo(repo);
  const prNumber = args.pr ?? detectPr(args.cwd);
  const pr = ghPrView(prNumber, args.cwd, repo);
  const warnings: string[] = [];

  let diffStat = "";
  let diff = "";
  try {
    diffStat = localGitDiffStat(pr.baseRefOid, pr.headRefOid, args.cwd);
    diff = localGitDiff(pr.baseRefOid, pr.headRefOid, args.cwd);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Local git diff unavailable: ${message.split("\n")[0]}`);
  }

  const bounded = truncate(diff, args.maxDiffBytes);
  const context: DiffContext = {
    ok: true,
    repo,
    pr: pr.number,
    title: pr.title,
    url: pr.url,
    state: pr.state,
    mergeStateStatus: pr.mergeStateStatus,
    refs: { baseRefName: pr.baseRefName, headRefName: pr.headRefName, baseRefOid: pr.baseRefOid, headRefOid: pr.headRefOid },
    counts: { changedFiles: pr.changedFiles, additions: pr.additions, deletions: pr.deletions, commits: pr.commits.length },
    changedFiles: pr.files,
    commits: pr.commits,
    diffStat,
    diff: bounded.text,
    truncated: bounded.truncated,
    warnings,
  };

  const markdownPath = args.out ?? defaultOutputPath(repo, pr.number, "diff-context");
  const jsonPath = args.jsonOut ?? siblingPath(markdownPath, ".json");
  writePrivateFile(jsonPath, `${JSON.stringify(context, null, 2)}\n`);
  writePrivateFile(markdownPath, renderMarkdown(context));

  const summary = { ...context, diff: undefined, diffStat: undefined, files: { markdown: markdownPath, json: jsonPath } };
  if (args.stdout === "summary") console.log(JSON.stringify(summary, null, 2));
  else if (args.stdout === "json") console.log(JSON.stringify(context, null, 2));
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

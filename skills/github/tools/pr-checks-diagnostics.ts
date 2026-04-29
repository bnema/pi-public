#!/usr/bin/env bun
/** Summarize GitHub PR checks as diagnostic data. */

import { parseArgs, type StdoutMode } from "./lib/args.js";
import { markdownTable } from "./lib/markdown-common.js";
import { defaultOutputPath, siblingPath, writePrivateFile } from "./lib/output.js";
import { ghPrChecks, type CheckRun } from "./lib/pr.js";
import { detectPr, detectRepo, splitOwnerRepo } from "./lib/repo.js";

type Args = { repo?: string; pr?: number; cwd: string; out?: string; jsonOut?: string; stdout: StdoutMode };

type CheckDiagnostic = CheckRun & { suggestedCommands: string[] };
type Report = {
  ok: true;
  repo: string;
  pr: number;
  counts: Record<string, number> & { total: number };
  buckets: Record<string, CheckDiagnostic[]>;
  failing: CheckDiagnostic[];
  pending: CheckDiagnostic[];
  passing: CheckDiagnostic[];
  warnings: string[];
};

function usage(): never {
  console.log(`Usage: pr-checks-diagnostics.ts [options]

Options:
  --repo OWNER/REPO   GitHub repository. Default: parsed from git origin.
  --pr NUMBER         Pull request number. Default: gh pr view for current branch.
  --cwd PATH          Checkout for auto-detection. Default: current directory.
  --out PATH          Markdown output path. Default: private /tmp/.../*.md
  --json-out PATH     Full checks JSON output path. Default: same basename with .json suffix.
  --stdout MODE       summary, json, or none. Default: summary.
`);
  process.exit(0);
}

function parse(argv: readonly string[]): Args {
  const parsed = parseArgs(argv, {
    string: ["--repo", "--cwd", "--out", "--json-out"],
    number: ["--pr"],
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
  };
}

function runIdFromLink(link: string): string | undefined {
  return link.match(/\/actions\/runs\/(\d+)/)?.[1];
}

function diagnosticFor(repo: string, check: CheckRun): CheckDiagnostic {
  const suggestedCommands: string[] = [];
  const runId = runIdFromLink(check.link);
  if (runId && (check.bucket === "fail" || check.bucket === "pending" || check.state === "FAILURE" || check.state === "IN_PROGRESS")) {
    suggestedCommands.push(`gh run view ${runId} -R ${repo} --log-failed`);
    suggestedCommands.push(`gh run view ${runId} -R ${repo} --web`);
  }
  return { ...check, suggestedCommands };
}

function groupByBucket(checks: CheckDiagnostic[]): Record<string, CheckDiagnostic[]> {
  const buckets: Record<string, CheckDiagnostic[]> = {};
  for (const check of checks) {
    const bucket = check.bucket || "unknown";
    buckets[bucket] ??= [];
    buckets[bucket].push(check);
  }
  return buckets;
}

function countBuckets(buckets: Record<string, CheckDiagnostic[]>): Report["counts"] {
  const counts: Report["counts"] = { total: 0 };
  for (const [bucket, checks] of Object.entries(buckets)) {
    counts[bucket] = checks.length;
    counts.total += checks.length;
  }
  return counts;
}

function renderMarkdown(report: Report): string {
  const out: string[] = [];
  out.push(`# PR checks diagnostics: ${report.repo}#${report.pr}`, "");
  out.push(`- Total checks: ${report.counts.total}`);
  for (const [bucket, count] of Object.entries(report.counts)) {
    if (bucket !== "total") out.push(`- ${bucket}: ${count}`);
  }
  if (report.warnings.length) out.push("", "## Warnings", ...report.warnings.map((warning) => `- ${warning}`));

  for (const [bucket, checks] of Object.entries(report.buckets)) {
    out.push("", `## ${bucket}`);
    out.push(...markdownTable(["Name", "State", "Workflow", "Started", "Completed", "Link"], checks.map((check) => [check.name, check.state, check.workflow, check.startedAt, check.completedAt, check.link])));
    for (const check of checks) {
      if (check.suggestedCommands.length) out.push("", `### ${check.name} suggested commands`, ...check.suggestedCommands.map((cmd) => `- \`${cmd}\``));
    }
  }

  out.push("");
  return out.join("\n");
}

function withoutFull(report: Report): Omit<Report, "buckets"> & { buckets: Record<string, { name: string; state: string; workflow: string; link: string; suggestedCommands: string[] }[]> } {
  const buckets: Record<string, { name: string; state: string; workflow: string; link: string; suggestedCommands: string[] }[]> = {};
  for (const [bucket, checks] of Object.entries(report.buckets)) {
    buckets[bucket] = checks.map((check) => ({ name: check.name, state: check.state, workflow: check.workflow, link: check.link, suggestedCommands: check.suggestedCommands }));
  }
  return { ...report, buckets };
}

function main(): number {
  const args = parse(process.argv.slice(2));
  const repo = args.repo ?? detectRepo(args.cwd);
  splitOwnerRepo(repo);
  const pr = args.pr ?? detectPr(args.cwd);
  const warnings: string[] = [];
  const checks = ghPrChecks(pr, args.cwd, repo).map((check) => diagnosticFor(repo, check));
  if (checks.length === 0) warnings.push("No PR checks were returned by gh pr checks.");
  const buckets = groupByBucket(checks);
  const report: Report = {
    ok: true,
    repo,
    pr,
    counts: countBuckets(buckets),
    buckets,
    failing: checks.filter((check) => check.bucket === "fail" || check.state === "FAILURE"),
    pending: checks.filter((check) => check.bucket === "pending" || check.state === "PENDING" || check.state === "IN_PROGRESS"),
    passing: checks.filter((check) => check.bucket === "pass" || check.state === "SUCCESS"),
    warnings,
  };
  const markdownPath = args.out ?? defaultOutputPath(repo, pr, "checks-diagnostics");
  const jsonPath = args.jsonOut ?? siblingPath(markdownPath, ".json");
  writePrivateFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writePrivateFile(markdownPath, renderMarkdown(report));

  const summary = { ...withoutFull(report), files: { markdown: markdownPath, json: jsonPath } };
  if (args.stdout === "summary") console.log(JSON.stringify(summary, null, 2));
  else if (args.stdout === "json") console.log(JSON.stringify(report, null, 2));
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

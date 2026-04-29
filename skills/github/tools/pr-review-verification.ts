#!/usr/bin/env bun
/** Build a local evidence worksheet for PR review findings. */

import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, relative } from "node:path";
import { parseArgs, type StdoutMode } from "./lib/args.js";
import { fencedOrFallback, markdownTable } from "./lib/markdown-common.js";
import { defaultOutputPath, siblingPath, writePrivateFile } from "./lib/output.js";
import { readJsonFile, readJsonlFile } from "./lib/json.js";
import { detectPr, detectRepo, splitOwnerRepo } from "./lib/repo.js";
import type { FlatComment } from "./lib/review-comments.js";

type Category = "must_fix" | "verify_first" | "probably_duplicate" | "informational" | "needs_human_decision";
type VerificationStatus = "current_line_inspected" | "original_line_reference_only" | "location_missing" | "no_location" | "cannot_verify_location";

type FindingLike = FlatComment & { category?: Category; derivedSeverity?: string; rationale?: string; duplicateOfId?: string };
type TriageJson = { findings: FindingLike[] };

type Args = {
  index?: string;
  triageJson?: string;
  cwd: string;
  repo?: string;
  pr?: number;
  includeCategories: Category[];
  out?: string;
  jsonOut?: string;
  stdout: StdoutMode;
};

type VerificationItem = {
  id: string;
  category?: Category;
  status: VerificationStatus;
  path?: string | null;
  requestedLine?: number | null;
  originalLine?: number | null;
  inspectedLine?: number | null;
  snippet?: string;
  url: string;
  author: string;
  bodyPreview: string;
  rationale: string;
  warnings: string[];
  finding: FindingLike;
};

type VerificationReport = {
  ok: true;
  repo?: string;
  pr?: number;
  cwd: string;
  source: { index?: string; triageJson?: string };
  includeCategories: Category[];
  counts: Record<VerificationStatus, number> & { total: number };
  items: VerificationItem[];
  warnings: string[];
};

const DEFAULT_CATEGORIES: Category[] = ["must_fix", "verify_first", "needs_human_decision"];
const ALL_CATEGORIES: Category[] = ["must_fix", "verify_first", "probably_duplicate", "informational", "needs_human_decision"];

function usage(): never {
  console.log(`Usage: pr-review-verification.ts (--triage-json PATH | --index PATH) [options]

Options:
  --triage-json PATH       Triage JSON from pr-finding-triage.
  --index PATH             Raw commentIndexJsonl from pr-review-comments.
  --include-categories CSV Categories to include. Default: must_fix,verify_first,needs_human_decision.
  --cwd PATH               Local checkout to inspect. Default: current directory.
  --repo OWNER/REPO        Optional metadata. Default: parsed from git origin when possible.
  --pr NUMBER              Optional metadata. Default: gh pr view when possible.
  --out PATH               Markdown output path. Default: private /tmp/.../*.md
  --json-out PATH          Full worksheet JSON output path. Default: same basename with .json suffix.
  --stdout MODE            summary, json, or none. Default: summary.
`);
  process.exit(0);
}

function parse(argv: readonly string[]): Args {
  const parsed = parseArgs(argv, {
    string: ["--index", "--triage-json", "--cwd", "--repo", "--include-categories", "--out", "--json-out"],
    number: ["--pr"],
    stdout: ["summary", "json", "none"],
  });
  if (parsed.booleans["--help"]) usage();
  const index = parsed.strings["--index"];
  const triageJson = parsed.strings["--triage-json"];
  if (!index && !triageJson) throw new Error("One of --triage-json or --index is required");
  const includeRaw = parsed.strings["--include-categories"];
  const includeCategories = includeRaw ? includeRaw.split(",").map((item) => parseCategory(item.trim())) : DEFAULT_CATEGORIES;
  return {
    index,
    triageJson,
    cwd: parsed.strings["--cwd"] ?? process.cwd(),
    repo: parsed.strings["--repo"],
    pr: parsed.numbers["--pr"],
    includeCategories,
    out: parsed.strings["--out"],
    jsonOut: parsed.strings["--json-out"],
    stdout: parsed.stdout ?? "summary",
  };
}

function parseCategory(value: string): Category {
  if ((ALL_CATEGORIES as string[]).includes(value)) return value as Category;
  throw new Error(`Unknown category ${JSON.stringify(value)}; expected one of ${ALL_CATEGORIES.join(",")}`);
}

function loadFindings(args: Args): FindingLike[] {
  if (args.triageJson) return readJsonFile<TriageJson>(args.triageJson).findings;
  if (args.index) return readJsonlFile<FindingLike>(args.index);
  return [];
}

function safeLocalPath(cwd: string, relativePath: string): string {
  if (relativePath.startsWith("/") || relativePath.split(/[\\/]+/).includes("..")) {
    throw new Error(`Unsafe finding path outside checkout: ${relativePath}`);
  }
  const root = realpathSync(cwd);
  const target = join(root, relativePath);
  if (lstatSync(target).isSymbolicLink()) throw new Error(`Refusing to follow symlink finding path: ${relativePath}`);
  const resolved = realpathSync(target);
  const rel = relative(root, resolved);
  if (rel === ".." || rel.startsWith("../") || rel.startsWith("/")) {
    throw new Error(`Resolved finding path escapes checkout: ${relativePath}`);
  }
  return resolved;
}

function snippet(lines: string[], line: number, radius = 3): string {
  const start = Math.max(1, line - radius);
  const end = Math.min(lines.length, line + radius);
  const out: string[] = [];
  for (let number = start; number <= end; number += 1) {
    const marker = number === line ? ">" : " ";
    out.push(`${marker} ${String(number).padStart(5, " ")} | ${lines[number - 1] ?? ""}`);
  }
  return out.join("\n");
}

function verifyFinding(finding: FindingLike, cwd: string): VerificationItem {
  const warnings: string[] = [];
  const base = {
    id: finding.id,
    category: finding.category,
    path: finding.path,
    requestedLine: finding.line ?? null,
    originalLine: finding.originalLine ?? null,
    url: finding.url,
    author: finding.author,
    bodyPreview: finding.bodyPreview,
    finding,
    warnings,
  };

  if (!finding.path) {
    return { ...base, status: "no_location", inspectedLine: null, rationale: "Finding has no file path/line metadata; inspect discussion manually." };
  }

  if (finding.line === null || finding.line === undefined) {
    if (finding.originalLine !== null && finding.originalLine !== undefined) {
      return { ...base, status: "original_line_reference_only", inspectedLine: null, rationale: "Only originalLine is available; current checkout cannot prove that historical diff location." };
    }
    return { ...base, status: "no_location", inspectedLine: null, rationale: "Finding has a path but no current line number." };
  }

  try {
    const content = readFileSync(safeLocalPath(cwd, finding.path), "utf8");
    const lines = content.split(/\r?\n/);
    if (finding.line < 1 || finding.line > lines.length) {
      return { ...base, status: "location_missing", inspectedLine: null, rationale: `Current line ${finding.line} is outside file range 1-${lines.length}.` };
    }
    return { ...base, status: "current_line_inspected", inspectedLine: finding.line, snippet: snippet(lines, finding.line), rationale: "Current file line exists and snippet was captured. This is evidence for human verification, not proof the reviewer claim is true." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ...base, status: message.includes("ENOENT") ? "location_missing" : "cannot_verify_location", inspectedLine: null, rationale: `Could not inspect local location: ${message}` };
  }
}

function counts(items: VerificationItem[]): VerificationReport["counts"] {
  const result: VerificationReport["counts"] = { total: 0, current_line_inspected: 0, original_line_reference_only: 0, location_missing: 0, no_location: 0, cannot_verify_location: 0 };
  for (const item of items) {
    result.total += 1;
    result[item.status] += 1;
  }
  return result;
}

function renderMarkdown(report: VerificationReport): string {
  const out: string[] = [];
  out.push(`# PR review verification worksheet${report.repo && report.pr ? `: ${report.repo}#${report.pr}` : ""}`, "");
  out.push(`- Checkout: ${report.cwd}`);
  out.push(`- Included categories: ${report.includeCategories.join(", ")}`);
  out.push(`- Total items: ${report.counts.total}`);
  out.push("", "## Summary", ...markdownTable(["Status", "Count"], Object.entries(report.counts)));

  for (const item of report.items) {
    out.push("", `## ${item.category ?? "uncategorized"} — ${item.status} — ${item.id}`);
    out.push(`- URL: ${item.url}`);
    out.push(`- Path: ${item.path ?? "none"}`);
    out.push(`- Requested line: ${item.requestedLine ?? "none"}`);
    out.push(`- Original line: ${item.originalLine ?? "none"}`);
    out.push(`- Author: ${item.author}`);
    out.push(`- Preview: ${item.bodyPreview}`);
    out.push(`- Rationale: ${item.rationale}`);
    out.push("", "Human verification:", "- [ ] Read reviewer comment", "- [ ] Compare snippet/current code against claim", "- [ ] Decide: valid / false positive / obsolete / needs discussion");
    if (item.snippet) out.push("", ...fencedOrFallback(item.snippet, "text"));
  }
  out.push("");
  return out.join("\n");
}

function withoutBodies(report: VerificationReport): Omit<VerificationReport, "items"> & { items: (Omit<VerificationItem, "finding"> & { findingId: string })[] } {
  return { ...report, items: report.items.map(({ finding, ...item }) => ({ ...item, findingId: finding.id })) };
}

function main(): number {
  const args = parse(process.argv.slice(2));
  let repo = args.repo;
  let pr = args.pr;
  try { if (!repo) repo = detectRepo(args.cwd); } catch { /* optional metadata */ }
  if (repo) splitOwnerRepo(repo);
  try { if (!pr) pr = detectPr(args.cwd); } catch { /* optional metadata */ }

  const findings = loadFindings(args).filter((finding) => !finding.category || args.includeCategories.includes(finding.category));
  const items = findings.map((finding) => verifyFinding(finding, args.cwd));
  const report: VerificationReport = { ok: true, repo, pr, cwd: args.cwd, source: { index: args.index, triageJson: args.triageJson }, includeCategories: args.includeCategories, counts: counts(items), items, warnings: [] };
  const markdownPath = args.out ?? defaultOutputPath(repo ?? "unknown-repo", pr ?? 0, "review-verification");
  const jsonPath = args.jsonOut ?? siblingPath(markdownPath, ".json");
  writePrivateFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writePrivateFile(markdownPath, renderMarkdown(report));

  const summary = { ...withoutBodies(report), files: { markdown: markdownPath, json: jsonPath } };
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

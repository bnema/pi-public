#!/usr/bin/env node
/** Classify PR review comments into an action queue. */

import { parseArgs, type StdoutMode } from "./lib/args.js";
import { markdownTable } from "./lib/markdown-common.js";
import { defaultOutputPath, siblingPath, writePrivateFile } from "./lib/output.js";
import { readJsonlFile } from "./lib/json.js";
import { detectPr, detectRepo, splitOwnerRepo } from "./lib/repo.js";
import type { FlatComment } from "./lib/review-comments.js";

type Category = "must_fix" | "verify_first" | "probably_duplicate" | "informational" | "needs_human_decision";
type Severity = "critical" | "major" | "minor" | "trivial" | "info" | "unknown";
type Confidence = "high" | "medium" | "low";

type Args = { index: string; repo?: string; pr?: number; cwd: string; out?: string; jsonOut?: string; stdout: StdoutMode };

type TriagedFinding = FlatComment & {
  category: Category;
  derivedSeverity: Severity;
  confidence: Confidence;
  classificationBasis: string[];
  rationale: string;
  duplicateOfId?: string;
};

type TriageReport = {
  ok: true;
  repo?: string;
  pr?: number;
  sourceIndex: string;
  counts: Record<Category, number> & { total: number };
  categoryIds: Record<Category, string[]>;
  findings: TriagedFinding[];
  warnings: string[];
};

function usage(): never {
  console.log(`Usage: pr-finding-triage.js --index PATH [options]

Options:
  --index PATH       JSONL comment index from pr-review-comments. Required.
  --repo OWNER/REPO  Optional repository metadata. Default: parsed from git origin when possible.
  --pr NUMBER        Optional PR metadata. Default: gh pr view when possible.
  --cwd PATH         Checkout for auto-detection. Default: current directory.
  --out PATH         Markdown output path. Default: private /tmp/.../*.md
  --json-out PATH    Full triage JSON output path. Default: same basename with .json suffix.
  --stdout MODE      summary, json, or none. Default: summary.
`);
  process.exit(0);
}

function parse(argv: readonly string[]): Args {
  const parsed = parseArgs(argv, {
    string: ["--index", "--repo", "--cwd", "--out", "--json-out"],
    number: ["--pr"],
    stdout: ["summary", "json", "none"],
  });
  if (parsed.booleans["--help"]) usage();
  const index = parsed.strings["--index"];
  if (!index) throw new Error("--index is required");
  return {
    index,
    repo: parsed.strings["--repo"],
    pr: parsed.numbers["--pr"],
    cwd: parsed.strings["--cwd"] ?? process.cwd(),
    out: parsed.strings["--out"],
    jsonOut: parsed.strings["--json-out"],
    stdout: parsed.stdout ?? "summary",
  };
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[`*_~>#\[\]().,!?;:|\-]/g, " ").replace(/\s+/g, " ").trim();
}

function severityFor(body: string): { severity: Severity; basis: string[] } {
  const normalized = normalize(body);
  if (/\b(critical|security|vulnerability|data loss|panic|crash|deadlock|race)\b/.test(normalized)) return { severity: "critical", basis: ["critical/security/crash keyword"] };
  if (/\b(major|bug|broken|incorrect|fail|failing|regression|unsafe|leak)\b/.test(normalized)) return { severity: "major", basis: ["major/bug/failure keyword"] };
  if (/\b(minor|edge case|potential issue)\b/.test(normalized)) return { severity: "minor", basis: ["minor/potential issue keyword"] };
  if (/\b(nitpick|trivial|style|format|cleanup)\b/.test(normalized)) return { severity: "trivial", basis: ["nitpick/trivial/style keyword"] };
  if (/\b(info|informational|note)\b/.test(normalized)) return { severity: "info", basis: ["info keyword"] };
  return { severity: "unknown", basis: [] };
}

function classify(comment: FlatComment): Omit<TriagedFinding, keyof FlatComment | "duplicateOfId"> {
  const body = `${comment.bodyPreview}\n${comment.body}`;
  const normalized = normalize(body);
  const { severity, basis } = severityFor(body);
  const classificationBasis = [...basis];

  if (comment.threadResolved) {
    classificationBasis.push("thread already resolved");
    return { category: "informational", derivedSeverity: severity, confidence: "medium", classificationBasis, rationale: "Thread is already marked resolved; keep as context unless new evidence says it still applies." };
  }

  if (comment.threadOutdated) {
    classificationBasis.push("thread is outdated");
    return { category: "verify_first", derivedSeverity: severity, confidence: "medium", classificationBasis, rationale: "Thread is outdated; verify against current code before treating it as actionable." };
  }

  if (comment.isReply) {
    classificationBasis.push("reply comment");
    return { category: "needs_human_decision", derivedSeverity: severity, confidence: "medium", classificationBasis, rationale: "Replies often depend on thread context; inspect the discussion before acting." };
  }

  if (comment.kind === "review") {
    classificationBasis.push("review summary/body, not an inline finding");
    return { category: normalized ? "needs_human_decision" : "informational", derivedSeverity: severity, confidence: "medium", classificationBasis, rationale: "Review bodies can summarize state or request broader judgment; inspect manually before acting." };
  }

  if (severity === "critical" || severity === "major") {
    return { category: "must_fix", derivedSeverity: severity, confidence: "high", classificationBasis, rationale: "Reviewer text contains high-severity correctness/failure language. Treat as a reviewer claim requiring verification and likely action." };
  }

  if (severity === "trivial" || severity === "info") {
    return { category: "informational", derivedSeverity: severity, confidence: "high", classificationBasis, rationale: "Reviewer text appears informational, stylistic, or low-impact." };
  }

  if (/\b(consider|tradeoff|should we|decision|api|ux|product|behavior)\b/.test(normalized)) {
    classificationBasis.push("decision/tradeoff keyword");
    return { category: "needs_human_decision", derivedSeverity: severity, confidence: "medium", classificationBasis, rationale: "Finding appears to require product/API/design judgment rather than a mechanical fix." };
  }

  if (/\b(potential issue|verify|check|ensure|might|could|seems|looks like)\b/.test(normalized) || comment.path) {
    classificationBasis.push("potential/verify wording or inline code location");
    return { category: "verify_first", derivedSeverity: severity, confidence: "medium", classificationBasis, rationale: "Reviewer claim needs code verification before implementation." };
  }

  return { category: "needs_human_decision", derivedSeverity: severity, confidence: "low", classificationBasis, rationale: "No strong automatic category signal." };
}

function duplicateKey(finding: TriagedFinding): string {
  return [finding.path ?? "", finding.line ?? finding.originalLine ?? "", finding.derivedSeverity, normalize(finding.bodyPreview)].join("|");
}

function triage(comments: FlatComment[]): TriagedFinding[] {
  const seen = new Map<string, string>();
  return comments.map((comment) => {
    const classified: TriagedFinding = { ...comment, ...classify(comment) };
    const key = duplicateKey(classified);
    const duplicateOfId = key.trim() ? seen.get(key) : undefined;
    if (duplicateOfId) {
      classified.category = "probably_duplicate";
      classified.duplicateOfId = duplicateOfId;
      classified.classificationBasis.push("same normalized path/line/severity/bodyPreview as earlier finding");
      classified.rationale = `Likely duplicate of ${duplicateOfId}; verify before ignoring.`;
    } else {
      seen.set(key, classified.id);
    }
    return classified;
  });
}

function emptyCounts(): Record<Category, number> & { total: number } {
  return { total: 0, must_fix: 0, verify_first: 0, probably_duplicate: 0, informational: 0, needs_human_decision: 0 };
}

function buildReport(args: Args, repo: string | undefined, pr: number | undefined, findings: TriagedFinding[]): TriageReport {
  const counts = emptyCounts();
  const categoryIds: Record<Category, string[]> = { must_fix: [], verify_first: [], probably_duplicate: [], informational: [], needs_human_decision: [] };
  for (const finding of findings) {
    counts.total += 1;
    counts[finding.category] += 1;
    categoryIds[finding.category].push(finding.id);
  }
  return { ok: true, repo, pr, sourceIndex: args.index, counts, categoryIds, findings, warnings: [] };
}

function renderMarkdown(report: TriageReport): string {
  const out: string[] = [];
  out.push(`# PR finding triage${report.repo && report.pr ? `: ${report.repo}#${report.pr}` : ""}`, "");
  out.push(`- Source index: ${report.sourceIndex}`);
  out.push(`- Total: ${report.counts.total}`);
  out.push(`- must_fix: ${report.counts.must_fix}`);
  out.push(`- verify_first: ${report.counts.verify_first}`);
  out.push(`- probably_duplicate: ${report.counts.probably_duplicate}`);
  out.push(`- informational: ${report.counts.informational}`);
  out.push(`- needs_human_decision: ${report.counts.needs_human_decision}`);
  out.push("", "## Findings", ...markdownTable(["Category", "Severity", "Path", "Line", "Author", "Preview", "Rationale"], report.findings.map((finding) => [finding.category, finding.derivedSeverity, finding.path ?? "", finding.line ?? finding.originalLine ?? "", finding.author, finding.bodyPreview, finding.rationale])));
  out.push("");
  return out.join("\n");
}

function withoutBodies(report: TriageReport): Omit<TriageReport, "findings"> & { findings: Omit<TriagedFinding, "body">[] } {
  return { ...report, findings: report.findings.map(({ body: _body, ...finding }) => finding) };
}

function main(): number {
  const args = parse(process.argv.slice(2));
  let repo = args.repo;
  let pr = args.pr;
  try { if (!repo) repo = detectRepo(args.cwd); } catch { /* optional metadata */ }
  if (repo) splitOwnerRepo(repo);
  try { if (!pr) pr = detectPr(args.cwd); } catch { /* optional metadata */ }

  const findings = triage(readJsonlFile<FlatComment>(args.index));
  const report = buildReport(args, repo, pr, findings);
  const ownerRepo = repo ?? "unknown-repo";
  const prNumber = pr ?? 0;
  const markdownPath = args.out ?? defaultOutputPath(ownerRepo, prNumber, "finding-triage");
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

#!/usr/bin/env bun
/** Fetch GitHub PR review feedback with one GraphQL operation. */

import { detectPr, detectRepo, parsePositiveInteger, splitOwnerRepo } from "./lib/repo.js";
import { defaultOutputPath, siblingPath, writePrivateFile } from "./lib/output.js";
import { renderReviewCommentsMarkdown } from "./lib/markdown.js";
import {
  fetchPullRequestReviewData,
  flattenComments,
  paginationGaps,
  reviewCounts,
  type FlatComment,
} from "./lib/review-comments.js";

type StdoutMode = "summary" | "index" | "none";

type Args = {
  repo?: string;
  pr?: number;
  cwd: string;
  out?: string;
  jsonOut?: string;
  indexOut?: string;
  stdout: StdoutMode;
  allowPartial: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { cwd: process.cwd(), stdout: "summary", allowPartial: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = (): string => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      index += 1;
      return value;
    };

    switch (arg) {
      case "--repo": args.repo = nextValue(); break;
      case "--pr": args.pr = parsePositiveInteger(nextValue(), "--pr"); break;
      case "--cwd": args.cwd = nextValue(); break;
      case "--out": args.out = nextValue(); break;
      case "--json-out": args.jsonOut = nextValue(); break;
      case "--index-out": args.indexOut = nextValue(); break;
      case "--stdout": {
        const mode = nextValue();
        if (mode !== "summary" && mode !== "index" && mode !== "none") {
          throw new Error(`--stdout must be one of summary, index, none; got ${JSON.stringify(mode)}`);
        }
        args.stdout = mode;
        break;
      }
      case "--allow-partial": args.allowPartial = true; break;
      case "-h":
      case "--help": printHelpAndExit();
      default: throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelpAndExit(): never {
  console.log(`Usage: pr-review-comments.ts [options]

Options:
  --repo OWNER/REPO     GitHub repository. Default: parsed from git origin.
  --pr NUMBER           Pull request number. Default: gh pr view for current branch.
  --cwd PATH            Repository directory for auto-detection. Default: current directory.
  --out PATH            Markdown output path. Default: private /tmp/.../*.md
  --json-out PATH       Raw GraphQL JSON output path. Default: same basename with .graphql.json suffix.
  --index-out PATH      Flattened JSONL comment index path. Default: same basename with .comments.jsonl suffix.
  --stdout MODE         Print parseable JSON to stdout: summary, index, or none. Default: summary.
  --allow-partial       Exit 0 even if pagination says the one-response result is incomplete.
  -h, --help            Show this help.

Exit codes:
  0 complete, or partial with --allow-partial
  1 invalid args / command / GraphQL error
  2 incomplete pagination without --allow-partial
`);
  process.exit(0);
}

function withoutBodies(comments: FlatComment[]): Omit<FlatComment, "body">[] {
  return comments.map(({ body: _body, ...comment }) => comment);
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  const ownerRepo = args.repo ?? detectRepo(args.cwd);
  const [owner, repo] = splitOwnerRepo(ownerRepo);
  const prNumber = args.pr ?? detectPr(args.cwd);
  const pr = fetchPullRequestReviewData(owner, repo, prNumber);
  const gaps = paginationGaps(pr);
  const flatComments = flattenComments(pr);

  const markdownPath = args.out ?? defaultOutputPath(ownerRepo, prNumber, "review-comments");
  const jsonPath = args.jsonOut ?? siblingPath(markdownPath, ".graphql.json");
  const indexPath = args.indexOut ?? siblingPath(markdownPath, ".comments.jsonl");

  const jsonl = flatComments.map((comment) => JSON.stringify(comment)).join("\n");
  writePrivateFile(jsonPath, `${JSON.stringify({ data: { repository: { pullRequest: pr } } }, null, 2)}\n`);
  writePrivateFile(markdownPath, renderReviewCommentsMarkdown(ownerRepo, pr, gaps));
  writePrivateFile(indexPath, jsonl ? `${jsonl}\n` : "");

  const summary = {
    ok: gaps.length === 0,
    partial: gaps.length > 0,
    repo: ownerRepo,
    pr: pr.number,
    url: pr.url,
    files: { markdown: markdownPath, rawGraphQL: jsonPath, commentIndexJsonl: indexPath },
    counts: reviewCounts(pr, flatComments),
    paginationGaps: gaps,
    warnings: gaps.length > 0 ? ["One GraphQL response is incomplete; pagination is required for listed connections."] : [],
    indexPreview: withoutBodies(flatComments),
    jqExamples: [
      `jq -r 'select(.kind == "review-thread-comment") | [.path, .line, .author, .bodyPreview] | @tsv' ${indexPath}`,
      `rg -n "Potential issue|Critical|TODO" ${indexPath}`,
    ],
  };

  if (args.stdout === "summary") console.log(JSON.stringify(summary, null, 2));
  else if (args.stdout === "index") console.log(JSON.stringify(flatComments, null, 2));

  if (gaps.length > 0 && !args.allowPartial) {
    console.error("ERROR: single GraphQL response is partial because pagination is required:");
    for (const gap of gaps) console.error(`- ${gap}`);
    return 2;
  }

  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

---
name: github-pr-review-comments
description: Use when retrieving GitHub pull request review feedback, inline review comments, review replies, review threads, CodeRabbit comments, or converting PR review discussions to Markdown or searchable JSONL.
---

# GitHub PR Review Comments

## Overview

Use the shared Bun/TypeScript tool to retrieve PR conversation comments, review bodies, review-level comments, and review threads. It performs one GitHub GraphQL review-data request and proves whether the response is complete.

**Core rule:** never claim “all review comments” unless every relevant `pageInfo.hasNextPage` is `false`.

## Command

From any checkout with `gh` authenticated:

```bash
bun $HOME/.agents/skills/github/tools/pr-review-comments.ts --repo OWNER/REPO --pr PR_NUMBER
```

For the current branch, you may omit `--repo` and `--pr`; that uses extra `git`/`gh pr view` detection calls before the one review-data GraphQL request.

Default behavior:

- writes Markdown, raw GraphQL JSON, and flattened JSONL under a private `/tmp/...` directory
- files are created `0600` with no overwrite
- stdout is a parseable JSON summary with counts, paths, pagination gaps, and jq/rg examples
- exits `2` when any connection requires pagination, unless `--allow-partial` is explicit

Useful modes:

```bash
# Summary JSON on stdout (default)
bun $HOME/.agents/skills/github/tools/pr-review-comments.ts --repo OWNER/REPO --pr PR

# Full flattened comments on stdout
bun $HOME/.agents/skills/github/tools/pr-review-comments.ts --repo OWNER/REPO --pr PR --stdout index

# Write files only
bun $HOME/.agents/skills/github/tools/pr-review-comments.ts --repo OWNER/REPO --pr PR --stdout none
```

## Search the JSONL first

Use the summary’s `files.commentIndexJsonl` path for fast agent work:

```bash
jq -r 'select(.kind == "review-thread-comment") | [.path, .line, .author, .bodyPreview] | @tsv' /tmp/...comments.jsonl
rg -n "Potential issue|Critical|TODO" /tmp/...comments.jsonl
```

JSONL records include stable IDs, author, full body, body preview, URL, file path, line/originalLine, reply relationship, review ID/state, thread ID, resolved/outdated flags.

Privacy: review data can contain private code, diffs, and reviewer comments. Prefer targeted `jq`/`rg` excerpts and summaries; do not paste full raw JSON or Markdown unless necessary.

## What the GraphQL request fetches

| Need | GraphQL field | Why |
|---|---|---|
| General PR conversation comments | `pullRequest.comments(first:100)` | PR timeline comments not tied to a review |
| Review summary/body | `pullRequest.reviews(first:100).nodes.body` | Submitted review body/status |
| Inline comments per review | `reviews.nodes.comments(first:100)` | Maps comments to the review that submitted them |
| Inline threads and replies | `pullRequest.reviewThreads(first:100).nodes.comments(first:100)` | Canonical threaded code comments and replies |
| Reply relationship | `PullRequestReviewComment.replyTo` | Identifies replies; there is no `replies` child connection |
| Completeness | every `pageInfo.hasNextPage` | GitHub caps each connection at `first:100` |

## Completeness checklist

Before summarizing or acting on review feedback, verify the summary JSON:

1. `ok` is `true` and `partial` is `false`.
2. `paginationGaps` is empty.
3. Counts match expectations: PR comments, reviews, review comments, review threads, thread comments/replies.
4. If exit code is `2`, the one-query result is incomplete; paginate separately or state that it is partial.

A single GraphQL request cannot guarantee unbounded “all comments” for huge PRs. The safe one-query pattern is: fetch up to 100 on every relevant connection and fail loudly if any `hasNextPage` is true.

## Common mistakes

- `gh pr view --json comments,reviews` is insufficient: it misses inline thread comments/replies.
- REST requires multiple endpoints (`pulls/{n}/reviews`, `pulls/{n}/comments`, `issues/{n}/comments`), so it violates a one-query review-data requirement.
- `reviews.comments` alone is not enough for threaded rendering; use `reviewThreads.comments` for replies and thread state.
- Do not double-count: comments can appear through both `reviews.comments` and `reviewThreads.comments`; the tool deduplicates JSONL by GitHub node ID and prefers thread-enriched records.
- Do not silently ignore pagination. Partial review retrieval is worse than no retrieval because it looks authoritative.

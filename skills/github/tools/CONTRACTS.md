# GitHub PR tools contracts

Shared conventions:

- Runtime: `bun $HOME/.agents/skills/github/tools/<tool>.ts`.
- Repo/PR args: `--repo OWNER/REPO --pr NUMBER`; tools that need local files also accept `--cwd PATH` and default to current directory.
- Output: stdout is JSON unless `--stdout none`; default artifacts are written under `/tmp` using 0700 directories and 0600 files. Explicit `--out`/`--json-out`/similar paths are allowed only as deliberate overrides; they are still created with 0600 and parent directories with 0700 when possible.
- No build step. Typecheck with `rtk tsc --project $HOME/.agents/skills/github/tools/tsconfig.json`.
- Exit 0 for successful output, including PR checks that are failing/pending as data. Exit 1 for CLI/gh/local IO errors. Exit 2 only for explicitly documented incomplete remote data such as pagination gaps.
- Tools must not claim a human judgment was verified automatically. Machine verification means location/snippet evidence only.

## pr-diff-context

Purpose: compact PR context for agents before review/verification.

Inputs:

- `--repo OWNER/REPO`, `--pr NUMBER`, `--cwd PATH`
- `--out PATH`, `--json-out PATH`, `--stdout summary|json|none`
- optional `--max-diff-bytes N` (default conservative)

Stdout summary:

```json
{
  "ok": true,
  "repo": "OWNER/REPO",
  "pr": 123,
  "url": "...",
  "files": { "markdown": "/tmp/...md", "json": "/tmp/...json" },
  "counts": { "changedFiles": 3, "additions": 10, "deletions": 2, "commits": 1 },
  "refs": { "baseRefName": "main", "headRefName": "branch", "baseRefOid": "...", "headRefOid": "..." },
  "changedFiles": [{ "path": "...", "changeType": "MODIFIED", "additions": 1, "deletions": 1 }],
  "truncated": false
}
```

Data sources: `gh pr view --json ...` for metadata/files/commits, local `git diff baseRefOid..headRefOid` when available for diff/stat. Bounded diff truncation is represented as `truncated: true` and still exits 0 because it is an intentional local size limit, not remote incompleteness.

Artifacts include full JSON context and Markdown with metadata, file table, commits, diff stat, and bounded diff.

## pr-finding-triage

Purpose: classify review comment JSONL into an action queue.

Inputs:

- `--index PATH` comment JSONL from `pr-review-comments`
- `--repo OWNER/REPO`, `--pr NUMBER` optional metadata
- `--out PATH`, `--json-out PATH`, `--stdout summary|json|none`

Categories:

- `must_fix`: critical/high/major/blocking/security/broken/failing issues.
- `verify_first`: potential issues, unclear correctness claims, or findings that mention current behavior.
- `probably_duplicate`: same path/line/derivedSeverity/bodyPreview normalized as an earlier finding.
- `informational`: nitpick/trivial/info/style-only docs.
- `needs_human_decision`: product/API/UX/tradeoff requests or low-confidence classification.

This tool classifies reviewer claims, not truth. Each item must include `classificationBasis`, `confidence`, `rationale`, and `derivedSeverity`. Stable item IDs come from GitHub node IDs when available. General PR comments/review bodies are included but usually classified as `informational` or `needs_human_decision` unless their text clearly asks for code changes. Stdout summary reports counts, files, category IDs, and warnings. JSON artifact includes full item bodies.

## pr-review-verification

Purpose: create an evidence worksheet against the local checkout. It does not decide whether comments are true.

Inputs:

- `--index PATH` or `--triage-json PATH`
- `--cwd PATH`
- `--out PATH`, `--json-out PATH`, `--stdout summary|json|none`
- optional `--include-categories must_fix,verify_first,...`; default `must_fix,verify_first,needs_human_decision`

Statuses:

- `current_line_inspected`: current file exists and current `line` can be inspected.
- `original_line_reference_only`: only `originalLine`/`originalStartLine` is available; local current checkout cannot prove the historical diff line.
- `location_missing`: file missing or referenced current line is outside range.
- `no_location`: finding has no path/line.
- `cannot_verify_location`: IO/parsing limitation.

Artifacts include JSON worksheet and Markdown with snippets around target lines and checkboxes for human verification.

## pr-checks-diagnostics

Purpose: summarize PR checks without noisy logs.

Inputs:

- `--repo OWNER/REPO`, `--pr NUMBER`, `--cwd PATH`
- `--out PATH`, `--json-out PATH`, `--stdout summary|json|none`

Data source: `gh pr checks --json name,state,link,startedAt,completedAt,workflow,bucket,description,event`. Failing, pending, or missing checks are diagnostic data, not tool failure; parse stdout and exit 0 unless `gh` truly failed to fetch/serialize data.

Stdout summary groups checks by `bucket` (`fail`, `pending`, `pass`, `skipping`, etc.), includes links, and suggests next commands. Actions run URL parsing is best-effort; when a run ID cannot be extracted, keep the raw link fallback.

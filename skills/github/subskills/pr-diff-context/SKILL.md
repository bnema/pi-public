---
name: github-pr-diff-context
description: Use when gathering compact GitHub pull request diff context, changed files, refs, commits, or a bounded diff for review/verification work.
---

# GitHub PR Diff Context

Use this before reviewing or verifying PR feedback when you need a compact, reproducible view of what changed.

## Command

```bash
# Build step (one-time or when tools change):
rtk tsc --project $HOME/.agents/skills/github/tools/tsconfig.json

# Then run:
node $HOME/.agents/skills/github/tools/dist/pr-diff-context.js --repo OWNER/REPO --pr PR_NUMBER --cwd /path/to/checkout
```

Defaults:

- `--repo` from git origin
- `--pr` from `gh pr view`
- `--cwd` current directory
- private `/tmp` artifacts with 0600 files
- JSON summary on stdout

Useful options:

```bash
# Full JSON context on stdout
node $HOME/.agents/skills/github/tools/dist/pr-diff-context.js --repo OWNER/REPO --pr PR --stdout json

# Smaller or larger bounded diff
node $HOME/.agents/skills/github/tools/dist/pr-diff-context.js --repo OWNER/REPO --pr PR --max-diff-bytes 50000
```

## Output

Stdout summary includes:

- PR URL, title, state, merge state
- base/head refs and SHAs
- changed file counts and file table
- commit headlines
- artifact paths for Markdown and JSON
- `truncated: true` if the diff was intentionally size-limited
- warnings if local git diff is unavailable

Artifacts:

- Markdown report for humans
- JSON report for tools/agents

## Important limits

`truncated: true` is not a GitHub data-completeness error; it only means the local diff text was clipped by `--max-diff-bytes`. Increase the limit if you need more context.

The tool uses `gh pr view` for PR metadata and local `git diff base..head` for diff text. If the local checkout does not have both SHAs, the metadata is still useful but the diff section may be empty with a warning.

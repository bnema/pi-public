---
name: github-pr-checks-diagnostics
description: Use when summarizing GitHub PR checks, pending/failing CI status, check links, and suggested gh run commands without downloading noisy logs by default.
---

# GitHub PR Checks Diagnostics

Use when you need a compact status report for PR checks/CI.

Failing or pending checks are **data**, not a tool failure. The tool exits 0 when it successfully retrieves check status, even if CI is red or pending.

## Command

```bash
# Build step (one-time or when tools change):
tsc --project $HOME/.agents/skills/github/tools/tsconfig.json

# Then run:
node $HOME/.agents/skills/github/tools/dist/pr-checks-diagnostics.js --repo OWNER/REPO --pr PR_NUMBER
```

Defaults:

- `--repo` from git origin
- `--pr` from current branch via `gh pr view`
- private `/tmp` Markdown and JSON artifacts
- JSON summary on stdout

## Output

The summary groups checks by GitHub CLI bucket, usually:

- `fail`
- `pending`
- `pass`
- `skipping`

Each check includes name, state, workflow, link, timestamps, and best-effort suggested commands. For GitHub Actions links, suggestions may include:

```bash
gh run view RUN_ID -R OWNER/REPO --log-failed
gh run view RUN_ID -R OWNER/REPO --web
```

If no run ID can be extracted, use the raw link in the report directly rather than copy/pasting generated shell commands.

## Recommended workflow

1. Run this tool to get the compact status.
2. If checks are pending, wait or inspect the linked run.
3. If checks failed, run only the suggested `gh run view ... --log-failed` for targeted logs.
4. Do not paste full logs unless needed; summarize relevant failing excerpts.

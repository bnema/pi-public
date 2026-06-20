---
name: github
description: Use when working with GitHub Actions workflows, reusable workflows, Dependabot, pull requests, PR review comments, CodeRabbit review feedback, PR checks, PR diff context, or GitHub GraphQL/API data.
---

# GitHub Router

Load only the matching sub-skill:

| Trigger | Read |
|---|---|
| Add or modify GitHub Actions workflows, reusable workflows, CI, releases, Dependabot updates, Dependabot auto-merge, or Discord notifications | `github/subskills/shared-actions/SKILL.md` |
| Retrieve all PR review comments, review replies, review threads, CodeRabbit inline comments, or convert review discussions to Markdown/JSONL | `github/subskills/pr-review-comments/SKILL.md` |
| Gather compact PR diff context, changed files, refs, commits, or bounded diff | `github/subskills/pr-diff-context/SKILL.md` |
| Triage review comments/CodeRabbit findings from the review-comments JSONL into action buckets | `github/subskills/pr-finding-triage/SKILL.md` |
| Verify PR review findings against local checkout snippets without claiming automatic truth | `github/subskills/pr-review-verification/SKILL.md` |
| Summarize GitHub PR checks/CI status, pending/failing checks, and suggested gh run commands | `github/subskills/pr-checks-diagnostics/SKILL.md` |

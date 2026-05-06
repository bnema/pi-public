---
name: shared-actions
description: Use when adding or modifying GitHub Actions workflows, reusable workflows, CI, Go releases, frontend checks, Dependabot updates, Dependabot auto-merge, or Discord notifications in Alex's repositories.
---

# Shared GitHub Actions

Alex maintains reusable GitHub Actions workflows here:

- Local repo: `$HOME/dev/projects/gh-actions`
- GitHub repo: `bnema/gh-actions`

Before creating bespoke workflow logic in Alex's repositories, check this repo and prefer calling its reusable workflows.

## Reusable workflows

Use this form from other repos:

```yaml
jobs:
  ci:
    uses: bnema/gh-actions/.github/workflows/<workflow>.yml@main
```

Available workflows:

| Workflow | Use for |
|---|---|
| `go-ci.yml` | Go lint/test CI. Supports `go-version`, `lint-version`, `lint-command`, `test-flags`, `test-command`, `pre-command`, containers, package installs, and path filtering. |
| `go-release.yml` | GoReleaser releases on `v*` tags. |
| `frontend-ci.yml` | npm/bun frontend checks: Svelte, TypeScript, ESLint. |
| `dependabot-auto-merge.yml` | Auto-merge Dependabot patch/minor PRs. Majors stay manual. |
| `discord-notify.yml` | Discord webhook notifications. |

## Dependabot for GitHub Actions

For repos that should keep Actions updated, add:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

If auto-merge is wanted and GitHub repo settings allow auto-merge, add a caller workflow:

```yaml
name: Dependabot Auto-Merge
on: pull_request

jobs:
  auto-merge:
    if: github.event.pull_request.user.login == 'dependabot[bot]'
    permissions:
      contents: write
      pull-requests: write
    uses: bnema/gh-actions/.github/workflows/dependabot-auto-merge.yml@main
```

## Common mistakes

- Do not duplicate CI/release workflow internals before checking `$HOME/dev/projects/gh-actions/README.md`.
- For reusable workflow callers, put `permissions` on the calling job when the called workflow needs write access.
- `dependabot-auto-merge.yml` uses GitHub auto-merge; required checks and branch protection still decide when the PR actually merges.

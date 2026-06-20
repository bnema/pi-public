---
name: coderabbit
description: Use when running CodeRabbit CLI code reviews, reviewing uncommitted or committed changes, comparing branches, or authenticating with CodeRabbit. Triggers on "code review", "cr review", "coderabbit", "review my changes", "review this branch".
disable-model-invocation: true
---

# CodeRabbit CLI

**Required baseline:** CodeRabbit feedback must be interpreted through `code-review-release/subskills/thermo-nuclear-code-quality-review/SKILL.md` first. Whether CodeRabbit focuses on bugs, security, or style, the main agent must still check for ambitious structural simplification/code-judo opportunities, file-size blowups, spaghetti branching, boundary/type cleanliness, canonical helper reuse, and unnecessary abstraction/cast churn.

AI code review from the terminal. The command is `cr` (alias for `coderabbit`).

## When to Use

- Review uncommitted or committed changes before push
- Compare current branch against a base branch
- Get AI feedback on bugs, security, and code quality
- Apply the thermo-nuclear maintainability bar to the findings before deciding whether the branch is review-clean
- Ready-for-PR: require a fully committed branch, clean working tree, and review against the default branch resolved from `origin/HEAD` with `main`/`master` fallback

## Setup

```bash
cr auth login                    # OAuth login (opens browser)
cr auth login --api-key <key>    # API key auth (non-interactive)
cr auth status                   # Check auth state
cr auth org                      # Switch organization
cr auth logout                   # Log out
```

## Review

**Reviews take 2-10+ minutes. Set tool timeout to at least 600000ms (10 min).**

```bash
# All changes (committed + uncommitted) — the default
cr review

# Uncommitted changes only (staged + unstaged)
cr review -t uncommitted

# Committed changes only
cr review -t committed

# Compare against a base branch
cr review --base <default-branch>

# Compare against a specific commit
cr review --base-commit abc123

# Feed project instructions to the reviewer
cr review -c .claude/CLAUDE.md -c .coderabbit.yaml
```

## Agent Usage

When calling `cr review` from a tool or subagent:

1. **Set timeout to 600000ms or higher** — reviews are slow
2. Use `--agent` for structured JSON findings
3. Default output (`--plain`) is human-readable text
4. After results return, verify them against code and apply the thermo-nuclear baseline before calling the review complete

```bash
cr review --agent -t uncommitted
```

Ready-for-PR/finalize loop:
1. Confirm wrap-up review has completed and findings were handled.
2. Confirm branch is fully committed and working tree is clean.
3. Resolve base from `origin/HEAD` with `main`/`master` fallback.
4. Run `cr review --agent --base <base>`.
5. If critical/major/minor findings are applied, recommit, confirm clean tree, rerun wrap-up review and CodeRabbit.

## Quick Reference

| Task | Command |
|------|---------|
| Review everything | `cr review` |
| Uncommitted only | `cr review -t uncommitted` |
| Committed only | `cr review -t committed` |
| Against default branch | `cr review --base <default-branch>` |
| Against a commit | `cr review --base-commit <sha>` |
| With context files | `cr review -c file1 -c file2` |
| Agent output | `cr review --agent` |
| Interactive mode | `cr review --interactive` |
| Check auth | `cr auth status` |
| Login | `cr auth login` |
| Switch org | `cr auth org` |
| Update CLI | `cr update` |

## Common Mistakes

**Timeout too short.** Default 2-minute timeouts kill the review mid-flight. Always set 10+ minutes (600000ms).

**Wrong review type.** `cr review` includes both committed and uncommitted changes. Use `-t uncommitted` to review only working-tree changes.

**No context files.** Without `-c`, the reviewer lacks project conventions. Pass your CLAUDE.md or coderabbit.yaml for better results.

**Treating CodeRabbit as sufficient by itself.** CodeRabbit output is one review input, not the approval bar. Always apply the thermo-nuclear code-quality baseline before declaring the branch clean.

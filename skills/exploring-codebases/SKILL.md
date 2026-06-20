---
name: exploring-codebases
description: Use when starting work in an unfamiliar repository, onboarding to a codebase, doing repository reconnaissance, or needing project-wide context before planning, editing, debugging, refactoring, or review.
---

# Exploring Codebases

Principle: map first, edit later. Spend enough context to avoid blind patches; do not read everything line by line.

## Workflow

1. Check repo state: branch/status, README/docs, package/build files, recent commits if relevant.
2. Visualize the tree before detailed reading: run a bounded tree command to see structure, naming, generated/vendor dirs, app boundaries, and test layout.
   - Prefer: `tree -L 3 -I 'node_modules|.git|dist|build|target|vendor|coverage' .`
   - If `tree` is unavailable: `find . -maxdepth 3 -type d`.
3. Identify purpose: app/lib/service, users/domain, main entrypoints.
4. Map architecture: top-level dirs, core modules, boundaries, data/control flow.
5. Find hot paths: entrypoints, handlers, commands, shared utilities, large/high-churn files, tests around likely changes.
6. Note external surfaces: APIs, database, auth, queues, files, env/config, network, trust boundaries.
7. Map verification: build/test/lint commands, test layout, fastest relevant checks.
8. Report before acting: context map, important files, risks, unknowns, recommended next step.

## Depth

- Tiny targeted change: short pass over README/config, touched file, neighbors/callers/tests.
- New feature, bug hunt, refactor, review, unfamiliar repo: full workflow.
- Stop expanding when another scan is unlikely to change the next decision.

## Output

Return:
- what the project does
- architecture map
- hot paths/hotspots
- verification commands
- risks/unknowns

## Common mistakes

- Editing the first obvious file.
- Trusting "tiny change" without checking callers/tests.
- Skipping the tree view and losing project-shape context.
- Producing a directory tour instead of decision-useful context.
- Hiding uncertainty.

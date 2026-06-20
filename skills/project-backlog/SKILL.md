---
name: project-backlog
description: Use when managing per-project backlog folders, feature queues, async agent work items, lifecycle status updates, PR/done/blocked transitions, or status reviews inside an Obsidian vault.
---

# Project Backlog

## Overview

Use a project-local `backlog/` folder as the source of truth for backlog item status. Work with the Obsidian vault as plain Markdown files; follow `../infra-personnel/subskills/obsidian-vault/SKILL.md` for filesystem, link, frontmatter, and destructive-action rules.

Lifecycle hook: if work starts, pauses, resumes, opens PR, or completes, update the matching backlog item.

## Folder Convention

Each project folder may contain:

```text
backlog/
  intake/
  next/
  ongoing/
  paused/
  done/
  canceled/
```

Before filing or moving backlog items, create the project `backlog/` directory and any missing status subdirectories from the project folder.

Copyable initializer:

```bash
mkdir -p backlog/{intake,next,ongoing,paused,done,canceled}
```

Status is canonical from the folder name. A backlog item must live in exactly one status folder.

| Folder | Meaning | Move here when |
|---|---|---|
| `intake/` | Raw ideas, requests, bugs, or feature notes not yet triaged | Capturing unsorted work |
| `next/` | Accepted, scoped, and ready for an agent or human to pick up | The item has enough context and success criteria |
| `ongoing/` | Actively assigned or being implemented | Work starts, including async subagent runs |
| `paused/` | Intentionally stopped but may resume | Blocked, waiting, deferred, or interrupted |
| `done/` | Completed and verified | The feature/fix is accepted, cleaned up, and no follow-up is needed |
| `canceled/` | Intentionally not doing | The item is rejected, obsolete, duplicated, or no longer wanted |

Do not create alternate status folders such as `todo/`, `active/`, `blocked/`, `archive/`, or `shipped/`. Use tags/properties for metadata only, not as competing status systems. If a note has a `status` property, keep it synchronized with the containing folder or remove it only with permission.

## Item Format

One Markdown note per item. Keep filenames short/stable, e.g. `add-search.md`. Folder = status; do not add a `status` property.

```markdown
---
tags: [backlog]
type: feature # feature | bug | chore | research
priority: P2 # P0 | P1 | P2 | P3
description: One concise sentence explaining the item.
created: 2026-06-19
updated: 2026-06-19
due:
agent_run:
---

# Title

## Request
## Context / Links
## Acceptance Criteria
- [ ]
## Activity Log
- 2026-06-19 — Created.
```

Preserve frontmatter, wikilinks, and Markdown when moving or editing notes.

## Async Agent Workflow

1. **Capture**: create or move new requests into `backlog/intake/`.
2. **Triage**: clarify scope, deduplicate, add acceptance criteria, then move to `next/`, `canceled/`, or leave in `intake/`.
3. **Assign**: before starting an async agent or human work session, move the item to `ongoing/` and add a brief activity-log entry with date, owner, and run/session identifier if useful.
4. **Track**: update the item with links to branches, PRs, review notes, blockers, and decisions. Do not mark a note done just because an agent reported completion.
5. **Finish**: after verification and cleanup, move completed feature/fix notes to `done/`. If work is blocked or intentionally stopped, move to `paused/`; if abandoned or rejected, move to `canceled/`.

## Housekeeping

On request, perform safe maintenance:

- ensure `backlog/` and all six status subdirectories exist before filing items;
- list duplicate or near-duplicate backlog items before merging them;
- identify stale `ongoing/` items with no recent activity;
- identify `paused/` items missing blocker/resume notes;
- move verified completed items from `ongoing/` or `paused/` to `done/`;
- move rejected, obsolete, or duplicate items to `canceled/`;
- normalize filenames only when links/backlinks can be preserved;
- ask before deleting files, bulk-moving notes, overwriting frontmatter, or changing wikilinks.

## Backlog Tree Helper

For a quick read-only snapshot by unique project folder name, run from this skill directory:

```bash
./backlog-project-tree "projectName"
```

The helper defaults to `VAULT=$HOME/obsidian`; override when needed:

```bash
VAULT=/path/to/vault ./backlog-project-tree "projectName"
```

It prints Markdown files under `intake/`, `next/`, `ongoing/`, `paused/`, `done/`, and `canceled/`, with best-effort metadata (`type`, `priority`, `description`, `updated`, `due`, `agent_run`). It reports missing categories without creating, moving, or deleting anything.

## Backlog State Review

When asked for a backlog review, scan only the requested project unless told otherwise:

1. Confirm the project folder and vault path.
2. Count items in each status folder.
3. Summarize `intake/` triage candidates, `next/` ready work, stale `ongoing/`, and blocked `paused/` items.
4. Recommend specific moves or edits, grouped by status.
5. Ask for confirmation before applying bulk moves or destructive cleanup.
6. After approved changes, report the final counts and notable remaining risks.

## Common Mistakes

- Creating both `blocked/` and `paused/`; blocked work belongs in `paused/` with a blocker note.
- Treating `done/` as an archive for canceled work; rejected work belongs in `canceled/`.
- Moving async agent output to `done/` without human/agent verification.
- Deleting old backlog notes during cleanup without explicit confirmation.
- Rewriting notes instead of using small edits that preserve Obsidian links and properties.

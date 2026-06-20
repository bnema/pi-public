---
name: simplify
description: Use as the default instruction set for simplification review subagents after code changes. Dispatches focused reviewers for reuse, quality, and efficiency so changed code gets cleaned up before completion.
disable-model-invocation: true
---

# Simplify: Parallel Cleanup Review

**Required baseline:** this simplification pass always starts from `code-review-release/subskills/thermo-nuclear-code-quality-review/SKILL.md`. The thermo-nuclear standard is the first-priority review bar: ambitious code-judo simplification, deletion of incidental complexity, file-size threshold checks, spaghetti-condition growth, boundary/type cleanliness, canonical helper reuse, and skepticism toward wrappers/casts/magic.

Use this skill whenever changed code needs a simplification pass, especially after implementing a feature/fix and before saying the work is done.

This is primarily a **subagent briefing pattern**: do not keep the whole simplification review in the main agent's head. Split it into focused review lenses and give each subagent a narrow job.

## Phase 1: Gather the review packet

Build a compact packet for all reviewers:

1. Current goal / user request.
2. Changed files.
3. Diff (`git diff`, or `git diff HEAD` if staged changes exist).
4. Any important constraints: project style, tests already run, files not to touch.

If there are no git changes, review the recently modified files the user mentioned or that you edited in this conversation.

## Phase 2: Dispatch focused simplification reviewers

Launch reviewers in parallel. Each reviewer gets the same packet but only one lens.

Minimum set:

| Reviewer | Lens | Prompt focus |
|---|---|---|
| Reuse reviewer | Existing code reuse | “Find newly written code that duplicates existing helpers, utilities, components, constants, types, or patterns.” |
| Quality reviewer | Thermo-nuclear maintainability | “Apply the thermo-nuclear code-quality baseline: find structural simplification/code-judo opportunities, spaghetti branching, file-size blowups, redundant state, parameter sprawl, copy-paste, leaky abstractions, stringly typing, unnecessary wrappers/comments, casts, and weak boundaries.” |
| Efficiency reviewer | Performance and unnecessary work | “Find redundant work, missed concurrency, hot-path bloat, recurring no-op updates, TOCTOU existence checks, leaks, or overly broad operations.” |

For larger diffs, split further by area **and** lens. Examples:

- “Reuse review for backend files only”
- “Quality review for Svelte components only”
- “Efficiency review for data-loading paths only”

Do not ask every reviewer to do everything. Narrow lenses produce better findings.

## Subagent prompt template

```text
Review this change using ONLY the <reuse|quality|efficiency> simplification lens.

Context:
<goal and constraints>

Changed files:
<file list>

Diff:
<diff>

Instructions:
- Apply the thermo-nuclear code-quality baseline first, then your assigned lens.
- Look for concrete simplification opportunities in your assigned lens only.
- Prefer findings that remove code, reuse existing code, reduce state, or reduce repeated work.
- For each finding, include: file/path, exact issue, why it matters, suggested fix.
- Mark likely false positives or trade-offs explicitly.
- Do not implement changes; report findings for the main agent to verify.
```

## Review lenses

### Reuse reviewer

For each change:

1. Search for existing utilities, helpers, components, constants, or types that could replace newly written code.
2. Flag any new function that duplicates existing functionality.
3. Flag inline logic that could use an existing utility: string manipulation, path handling, environment checks, type guards, formatting, validation, date handling, and similar patterns.

### Quality reviewer

Apply the full thermo-nuclear baseline before local cleanup concerns. Prioritize structural regressions, missed code-judo simplifications, spaghetti branching, boundary/type-contract problems, file-size decomposition issues, and unnecessary abstraction churn.

Look for:

1. **Redundant state**: duplicated state, cached values that could be derived, observers/effects that could be direct calls.
2. **Parameter sprawl**: adding parameters instead of generalizing or restructuring.
3. **Copy-paste with slight variation**: near-duplicate blocks that should be unified.
4. **Leaky abstractions**: exposing internals or breaking existing seams.
5. **Stringly-typed code**: raw strings where constants, enums/string unions, or branded types already exist.
6. **Unnecessary UI nesting**: wrappers that add no layout or semantic value.
7. **Unnecessary comments**: comments explaining WHAT, narrating the task, or referencing the caller. Keep only non-obvious WHY.

### Efficiency reviewer

Look for:

1. **Unnecessary work**: redundant computations, repeated file reads, duplicate network/API calls, N+1 patterns.
2. **Missed concurrency**: independent operations run sequentially.
3. **Hot-path bloat**: blocking work added to startup, per-request, per-render, or tight loops.
4. **Recurring no-op updates**: unconditional state/store updates in polling, intervals, event handlers, or reducer/updater wrappers that ignore same-reference no-op returns.
5. **TOCTOU existence checks**: pre-checking file/resource existence before operating; operate directly and handle errors.
6. **Memory/resource leaks**: unbounded structures, missing cleanup, listener leaks.
7. **Overly broad operations**: loading all items/files when filtering or reading a small portion would do.

## Phase 3: Main-agent verification and fixes

When findings come back:

1. Verify each finding against the code. Do not accept subagent output blindly.
2. Fix concrete issues directly.
3. Skip false positives or changes not worth the trade-off, and note why briefly.
4. Run the relevant verification command before claiming completion.

Final response: summarize what simplification issues were fixed, what was intentionally skipped, and what verification ran.

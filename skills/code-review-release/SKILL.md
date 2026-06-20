---
name: code-review-release
description: Use when requesting or receiving code review, dispatching review subagents, running CodeRabbit, deep reviews, simplification/cleanup passes, local branch review, ready-for-PR/finalize intent, finalizer workflow, or preparing work for merge.
---

# Code Review Release Router

Universal rule for every review path: apply `code-review-release/subskills/thermo-nuclear-code-quality-review/SKILL.md` as the first-priority maintainability baseline. Language-specific, security, correctness, release, CodeRabbit, finalizer, and simplification reviews add extra lenses; they do not replace the thermo-nuclear code-quality bar.

Hooks: if documented behavior changed, run `documentation-pass`. If work starts/pauses/opens PR/completes, update `project-backlog` when present.

Ready-for-PR hook: when work is complete, fully committed, and the working tree is clean, resolve the default branch from `origin/HEAD` with `main`/`master` fallback, then autonomously run `wrap-up-review` first. Only after wrap-up finishes and findings are handled, run `coderabbit` against the same base. If critical/major/minor findings are applied, recommit, confirm clean tree, then rerun both before declaring ready.

Finalize-intent hook: near PR time, approval + finalize wording (e.g. `LGTM lets finalize`, `good for me, finalize`) means the ready-for-PR hook above; do not start CodeRabbit until wrap-up subagents finish.

Load only the matching sub-skill:

| Trigger | Read |
|---|---|
| CodeRabbit, cr review, coderabbit CLI, review my changes | `code-review-release/subskills/coderabbit/SKILL.md` |
| thermo-nuclear review, thermonuclear review, harsh maintainability review, deep code quality audit | `code-review-release/subskills/thermo-nuclear-code-quality-review/SKILL.md` |
| deep review, security audit, thorough review, pre-merge review | `code-review-release/subskills/deepreview/SKILL.md` |
| simplify changed code, cleanup after implementation, reuse/quality/efficiency review, or dispatching parallel review subagents with simplification lenses | `code-review-release/subskills/simplify/SKILL.md` |
| finalizer workflow, finalize branch through finalizer subagent | `code-review-release/subskills/finalizer/SKILL.md` |
| ready for PR, approval + finalize intent, LGTM lets finalize, good for me finalize, wrap up review, finishing an implementation or plan phase, adaptive final review before done | `code-review-release/subskills/wrap-up-review/SKILL.md` |

---
name: wrap-up-review
description: Use when finishing an implementation or plan phase and you want an adaptive workflow-driven review before calling the work done, especially to catch logic bugs, legacy/YAGNI leftovers, DI boundary leaks, weak tests, or hot-path waste without launching unnecessary reviewers.
disable-model-invocation: true
---

# Wrap Up Review

**Required baseline:** every adaptive wrap-up review applies `code-review-release/subskills/thermo-nuclear-code-quality-review/SKILL.md` first. Triage and reviewers must treat structural simplification/code-judo opportunities, spaghetti-condition growth, file-size blowups, boundary/type cleanliness, canonical helper reuse, and unnecessary abstraction/cast churn as first-class concerns across all languages.

Use when implementation is done enough to review. Near PR time, approval + finalize wording (e.g. `LGTM lets finalize`, `good for me, finalize`) means ready-for-PR mode: require a fully committed branch and clean working tree, compare against the default branch resolved from `origin/HEAD` with `main`/`master` fallback, run wrap-up first, then CodeRabbit only after wrap-up findings are handled.

Default mode: run one `lazy_subagents` workflow, not a fixed `parallel` fan-out. Start with cheap triage, launch only necessary review jobs with `fanOutFrom`, then synthesize the aggregated `review` group result. Reviewers compare the current branch against the base ref from the repo checkout themselves. The main agent still verifies findings before editing or claiming completion.

## Inputs

Provide only:
- goal
- repo root / cwd
- base ref if known; for ready-for-PR resolve from `origin/HEAD` with `main`/`master` fallback
- constraints: compatibility promises/version windows, active migration or rollback requirements, no-touch files, tests already run, token/context budget
- fallback files or diff slices only when git metadata is unavailable or a hotspot follow-up needs them

## Workflow

`review` is a logical group barrier. Downstream steps depend on `review`, not on expanded ids like `review[logic]`.

```text
lazy_subagents action=workflow maxConcurrency=2 steps=[
  {id:"triage",agent:"reviewer",outputMode:"json",outputSchema:"{ summary: string, runReviews: boolean, baseRef: string, reviewJobs: Array<{ id: string, lens: \"logic\" | \"yagni\" | \"simplify\" | \"architecture-boundaries\" | \"test-quality\" | \"efficiency\" | \"security\" | \"api-contracts\" | \"dependencies\", scope: string, reason: string }> }",prompt:"Inspect the current branch against <known base ref if provided; otherwise resolve the default branch>. Apply the thermo-nuclear code-quality baseline first. Gather only useful context: changed files, full changed-file content when risk requires it, one-level local imports, project conventions, and cheap installed static analysis scoped to changed files. Skip missing/heavy tools; do not run gitleaks. Choose only review jobs worth the token cost. Cap jobs at 4. Bias toward `yagni` for compatibility/deprecated/temporary paths, migration shims, fallback logic, or `v0.x` cleanup. Set runReviews false if none are worth launching."},
  {id:"review",agent:"reviewer",dependsOn:["triage"],when:"{{triage.structured.runReviews}}",fanOutFrom:{step:"triage",path:"structured.reviewJobs",idField:"id",maxItems:4},prompt:"Review the current branch against {{triage.structured.baseRef}} using the thermo-nuclear code-quality baseline first, then ONLY {{item.lens}} on {{item.scope}}. Reason: {{item.reason}}. Resolve changed files and diff yourself. Return findings as `SEVERITY LENS | file | issue | evidence | fix`, where severity is CRITICAL/HIGH/MEDIUM/LOW. If `yagni`, flag legacy/fallback/deprecated/temporary paths and ask whether removal is safer. Return `No findings` if clean."},
  {id:"synth",agent:"reviewer",dependsOn:["review"],when:"{{triage.structured.runReviews}}",prompt:"Deduplicate and prioritize findings from {{review.json}}. Return must-fix vs optional items plus `Found: N CRITICAL | N HIGH | N MEDIUM | N LOW`."}
]
```

If triage finds no worthwhile jobs, `runReviews` should be false and the workflow ends after triage.

## Triage contract

Return JSON with:
- `summary`
- `runReviews`
- `baseRef`
- `reviewJobs[]` where each job has `id`, `lens`, `scope`, `reason`

Prefer 1-3 jobs. Use 4 only for clearly risky branches.

Scope should be `full branch` only when the branch is small. Otherwise scope by package, directory, service, layer, test subset, or hotspot.

Triage may gather changed files, full changed-file content, one-level local imports, project conventions, and cheap installed static analysis. Keep it scoped; skip missing/heavy tools and secret scanners.

## Lens selection

Always consider `logic` first for correctness, invariants, edge cases, error paths, partial updates, and ordering bugs.

Always consider `yagni` first for dead code, stale compat shims, old+new paths, speculative abstractions, and leftovers that should be deleted.
Use this reviewer to hunt old compatibility branches, migration shims, defensive fallback logic, dead transitional paths, deprecated code, and "keep for now" code that may no longer be needed.
It must explicitly challenge the main review flow to justify why each such path still exists, especially for `v0.x` releases where aggressive cleanup may be safer, simpler, or more correct than carrying compatibility baggage forward.
Before release, require this reviewer to ask whether removal is the better option; if the code stays, demand a concrete reason such as an active compatibility promise, live migration window, rollback requirement, or currently exercised path.

Add `simplify` when the branch adds helpers, duplication, abstraction, parameter sprawl, wrapper churn, stringly plumbing, obvious code-quality cleanup, spaghetti special cases, file-size growth, or visible code-judo opportunities. This lens covers reuse, maintainability, structural simplification, and the thermo-nuclear baseline.

Add `architecture-boundaries` when the branch touches DI wiring, domain/application/infra seams, imports across layers, framework type leaks, or missing ports/interfaces.

Add `test-quality` when tests changed or behavior is risky. Cross-language: weak assertions, over-mocking, fake proliferation, and wiring-only spies. Go: repeated cases that should be table-driven. TypeScript: module-level over-mocking and magic helpers. Rust: missing `Err`-path coverage and deep mock chains over trait seams.

Add `efficiency` only for hot paths, rendering, queries, I/O, concurrency, polling, caching, startup, or broad data-loading.

Add `security` for auth, injection, untrusted input, SSRF, path traversal, XSS/CSRF, secret exposure, or trust-boundary changes.

Add `api-contracts` for public interfaces, validation boundaries, type mismatches, breaking changes, or undocumented behavior changes.

Add `dependencies` for new/updated packages, known CVEs, license risk, unnecessary deps, or supply-chain-sensitive changes.

## Finding contract

Reviewer findings use severity by impact: CRITICAL, HIGH, MEDIUM, LOW. Synth deduplicates, sorts by severity, and ends with `Found: N CRITICAL | N HIGH | N MEDIUM | N LOW`.

## Token rules

- default: pass repo root + base ref, not raw diff
- triage should minimize job count
- keep `maxConcurrency` low: 2 by default, 3 only for clearly independent high-risk jobs
- prefer narrow scopes over full-branch review when possible
- use fallback files or diff slices only when git metadata is unavailable or a hotspot follow-up needs them
- state what was not reviewed

## Aggregation

Use the logical `review` group result in downstream steps:
- `{{review.summary}}`
- `{{review.output}}`
- `{{review.json}}`
- `{{review.structured.children}}`

Use `{{review.json}}` when you need deduplication, counts, failures, child summaries, or structured outputs.

## Main-agent verification

After the workflow:
1. verify synthesized findings against the code before acting
2. for CRITICAL/HIGH, run at most 2 focused commands per finding; prefer `rg`, `ast-grep`, or `git log`, with short timeouts
3. drop contradicted findings entirely; attach evidence to confirmed findings
4. fix confirmed issues or skip with a brief reason under the thermo-nuclear quality bar
5. never silence refactoring/cleanup findings merely for convenience
6. rerun relevant verification
7. ready-for-PR / finalize intent: run wrap-up review to completion before CodeRabbit; after any critical/major/minor finding is applied by a worker/subagent, recommit, confirm clean tree, then rerun wrap-up review and CodeRabbit against the resolved default branch
8. summarize: fixed, skipped, verified

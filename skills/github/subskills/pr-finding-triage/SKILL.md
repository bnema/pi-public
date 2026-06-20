---
name: github-pr-finding-triage
description: Use when turning the github-pr-review-comments JSONL index, including CodeRabbit PR review comments captured there, into an action queue with must-fix, verify-first, duplicate, informational, and human-decision buckets.
---

# GitHub PR Finding Triage

Use after `github-pr-review-comments` has produced a `commentIndexJsonl` file.

This is **classification of reviewer claims**, not proof that the claims are valid. Verify code before changing behavior.

Do not downgrade refactoring, cleanup, or maintainability findings merely because they are inconvenient or behavior still works; apply `code-review-release/subskills/thermo-nuclear-code-quality-review/SKILL.md` before dismissing them.

## Command

```bash
# Build step (one-time or when tools change):
tsc --project $HOME/.agents/skills/github/tools/tsconfig.json

# Then run:
node $HOME/.agents/skills/github/tools/dist/pr-finding-triage.js --index /tmp/...comments.jsonl --repo OWNER/REPO --pr PR_NUMBER
```

Outputs:

- JSON summary on stdout
- private Markdown report in `/tmp`
- private full JSON report in `/tmp`

## Categories

- `must_fix`: reviewer text claims critical/major/security/failing/broken behavior.
- `verify_first`: inline or uncertain findings that need local code verification before action.
- `probably_duplicate`: same normalized path/line/severity/body preview as an earlier finding.
- `informational`: nitpick/trivial/info/style-only comments. Not for structural maintainability findings unless verified against the thermo-nuclear quality bar.
- `needs_human_decision`: API/product/UX/tradeoff or low-confidence comments.

Each finding includes:

- `derivedSeverity`
- `confidence`
- `classificationBasis`
- `rationale`
- original GitHub node ID, body, URL, path/line metadata

## Recommended workflow

1. Run `pr-review-comments` and confirm it is complete (`ok: true`, no pagination gaps).
2. Run this triage tool on the JSONL index.
3. Start with `must_fix`, then `verify_first`, then `needs_human_decision`.
4. Do not skip `probably_duplicate` without checking `duplicateOfId` and context.
5. Feed the triage JSON into `pr-review-verification` before implementing fixes.

## Caveats

The classifier is heuristic. It prioritizes actionability and safety over cleverness. A `must_fix` means “reviewer appears to claim this is important,” not “the code is definitely wrong.”

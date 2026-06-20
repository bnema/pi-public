---
name: github-pr-review-verification
description: Use when verifying PR review findings against the local checkout by producing snippets and a human verification worksheet without claiming automatic truth.
---

# GitHub PR Review Verification

Use after `github-pr-finding-triage` when you need local evidence for review comments before editing code.

This tool does **not** decide whether a reviewer is correct. It only checks whether the referenced local file/line can be inspected and captures snippets for a human/agent workflow.

## Command

```bash
# Build step (one-time or when tools change):
tsc --project $HOME/.agents/skills/github/tools/tsconfig.json

# Then run:
node $HOME/.agents/skills/github/tools/dist/pr-review-verification.js \
  --triage-json /tmp/...finding-triage.json \
  --cwd /path/to/checkout \
  --repo OWNER/REPO --pr PR_NUMBER
```

You can also pass raw review comment JSONL:

```bash
node $HOME/.agents/skills/github/tools/dist/pr-review-verification.js --index /tmp/...comments.jsonl --cwd /path/to/checkout
```

Default categories from triage JSON:

```text
must_fix,verify_first,needs_human_decision
```

Override:

```bash
--include-categories must_fix,verify_first,probably_duplicate
```

## Statuses

- `current_line_inspected`: current file exists and the current line was captured.
- `original_line_reference_only`: only historical `originalLine` is available; current checkout cannot prove that exact diff line.
- `location_missing`: file missing or current line outside range.
- `no_location`: no path/line metadata.
- `cannot_verify_location`: IO or path safety limitation.

## Output

- JSON summary on stdout
- private Markdown worksheet in `/tmp`
- private full JSON worksheet in `/tmp`

The Markdown includes checkboxes:

- read reviewer comment
- compare snippet/current code against claim
- decide valid / false positive / obsolete / needs discussion

## Safety rules

Do not treat `current_line_inspected` as “finding is valid.” It only means the local line exists. Always inspect the full reviewer comment and nearby code before changing behavior.

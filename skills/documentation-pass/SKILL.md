---
name: documentation-pass
description: Use when a documentation pass is needed or docs, README, guides, examples, changelogs, or public explanations may be stale before PR.
---

# Documentation Pass

Rule: documentation must match current implementation before PR.

Loop:
1. Map implementation and docs.
2. Delegate bounded scans if useful: stale claims, missing docs, broken examples.
3. Update docs.
4. Verify docs against code/tests/commands.
5. Open PR.

Main agent owns edits, verification, and PR. Subagents only find, critique, or verify.

Stop when docs reflect implementation and verification passes.

Output: changed docs, evidence, PR link.

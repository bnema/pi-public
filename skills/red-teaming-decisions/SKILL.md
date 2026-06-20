---
name: red-teaming-decisions
description: Use before committing to architecture, interface, migration, rollout, or consequential decisions, especially for critic/red-team passes.
---

# Red-Teaming Decisions

Rule: no major decision without a critic pass.

Log: `.agent-reviews/redteam.md`

Loop:
1. Builder states decision.
2. Critic/subagent lists objections: impact, evidence, status.
3. Builder fixes/verifies high-impact objections or accepts with rationale.
4. Critic may reopen unsupported answers.

Stop when no high-impact objection remains, or issues repeat for 2 rounds without new evidence.

Output: decision, resolved objections, accepted risks, evidence, stalemate if any.

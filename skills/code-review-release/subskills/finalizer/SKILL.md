---
name: finalizer
description: Use when the user asks to run the Finalizer workflow, execute the finalizer skill, or finalize a branch through the finalizer subagent. Gathers the exact checkout context and then invokes the `finalizer` subagent correctly.
disable-model-invocation: true
---

# Finalizer Skill

This skill is a wrapper around the `finalizer` subagent.

Use it when the user asks for any of these:
- run finalizer
- execute the finalizer skill
- finalize this branch
- do the finalizer pass

## Goal

Avoid the two common failure modes:
1. treating Finalizer like a skillless concept search instead of a subagent workflow
2. invoking `finalizer` without the exact checkout context it requires

## Required procedure

### 1. Resolve the exact checkout context first

Before invoking the `finalizer` subagent, determine all four values it requires:

- exact working directory to use
- repo root for that working directory
- current branch for that working directory
- base branch to compare against

Use focused git commands in the intended repo, for example:

```bash
rtk git branch --show-current
rtk git rev-parse --show-toplevel
rtk proxy git merge-base --fork-point origin/main HEAD 2>/dev/null
rtk proxy git merge-base --fork-point main HEAD 2>/dev/null
```

Prefer the repo path explicitly given by the user. If the user did not provide one and the repo is ambiguous, ask.

### 2. Invoke the `finalizer` subagent explicitly

Do **not** output plain text like `subagent finalizer`.
Do **not** search the filesystem for a SKILL named Finalizer once this skill is loaded.

Call the `subagent` tool in SINGLE mode with:
- `agent: "finalizer"`
- `agentScope: "user"`
- `cwd`: the exact working directory
- `task`: a prompt that includes all four required values verbatim

### 3. Task template to send to the subagent

Use this structure in the `task` field:

```text
Run the full finalization pass for this exact checkout.

Required context:
- exact working directory to use: <WORKDIR>
- repo root for that working directory: <REPO_ROOT>
- current branch for that working directory: <CURRENT_BRANCH>
- base branch to compare against: <BASE_BRANCH>

Stay pinned to that exact checkout.
```

### 4. Let Finalizer orchestrate the rest

The `finalizer` subagent is responsible for launching the required child subagents.
Its configuration expects parallel `general` subagents with these explicit skills:
- `hexarch`
- `simplify`
- `coderabbit`
- `vibesec`

Do not replace that with manual review unless the user asks.

## Success criteria

A correct run means:
- the `finalizer` subagent is invoked through the tool, not as free text
- all four checkout values are passed in the task
- the finalizer can then spawn the required subagents automatically

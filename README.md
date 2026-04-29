# pi-public

Public-safe export of a Pi coding-agent configuration and reusable skills.

This repository is generated from a private local Pi setup. The private sync tooling is intentionally not included in this public repository.

## Layout

- `pi/` — public Pi configuration snippets (`AGENTS.md`, agents, themes, sanitized settings/MCP config).
- `skills/` — reusable public skills.

## Context7 API key

The exported MCP configuration does **not** include an API key. Set it in the environment before running Pi:

```sh
export CONTEXT7_API_KEY="your-context7-key"
```

The local Context7 MCP server reads `CONTEXT7_API_KEY` directly, so the public `pi/mcp.json` does not pass `--api-key`.

## Safety policy

The export excludes, at minimum:

- Pi auth/session/runtime files (`auth.json`, `sessions/`, `run-history.jsonl`, MCP caches, local git cache, progress state).
- Local-only package paths from `settings.json`.
- Context7 inline API keys from `mcp.json`.
- Personal/private skills such as `infra-personnel` and all skill backups.
- Symlinks, absolute home paths, and common secret-token patterns.

License: MIT.

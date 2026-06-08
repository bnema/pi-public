# pi-public

Public-safe Pi configuration and reusable skills.

This repository is generated from a private local Pi setup. Private sync tooling is intentionally not included.

## What it includes

- `pi/` — sanitized Pi config snippets, agents, themes, settings, and MCP config.
- `skills/` — reusable public skills exported from the local skills directory.

## Use

Clone the repo and copy or symlink the pieces you want into your own Pi configuration.

```bash
git clone https://github.com/bnema/pi-public.git
```

The exported Context7 MCP config does not include an API key. Set it in the environment before running Pi:

```bash
export CONTEXT7_API_KEY="your-context7-key"
```

## License

MIT

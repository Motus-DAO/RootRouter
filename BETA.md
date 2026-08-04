# Beta

RootRouter **0.2.0-beta.1** is early beta software.

- APIs, CLI flags, and config may change before 1.0.
- Self-hosted SDK, proxy, and MCP are MIT-licensed; use at your own risk.
- No SLA, uptime guarantee, or production warranty.
- Cost and token savings shown in demos and docs are **benchmark results**, not guarantees for your workload.
- Hosted cloud and x402 billing are **not available yet**. See [COMMERCIAL.md](./COMMERCIAL.md).

## 0.2.0-beta.1 notes

- **Motus / production storage:** use `rootrouter init cursor --project-store` so each repo gets `~/.rootrouter/<slug>/cursor-store.json`. Global `~/.rootrouter/store.json` is demos only.
- MCP env `ROOTROUTER_DEFAULT_AGENT_ID` scopes `index_repo` / `select_*` when `agentId` is omitted.
- `rootrouter doctor` flags global-store and multi-`repoRoot` stews. See [insight 009](./docs/insights/009-cursor-project-store-parity.md).

Report issues: https://github.com/RootRouter/RootRouter/issues

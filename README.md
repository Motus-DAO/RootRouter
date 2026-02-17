<div align="center">

# 🌿 RootRouter

### Algebraic Agent Infrastructure for AI Swarms

**Cut your agent's LLM costs 40–70% with root-pair telemetry,
interaction graphs, and symmetry-aware context filtering.**

*Verifiable on-chain analytics on Celo · ERC-8004 compatible*

[![Celo Hackathon](https://img.shields.io/badge/Celo-Hackathon_2026-35D07F?style=for-the-badge&logo=celo)](https://celo.org)
[![Track](https://img.shields.io/badge/Track-Best_Agent_Infra-blue?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)]()

</div>

---

## The Problem

AI agents are expensive. Every autonomous agent burns tokens sending **full conversation history** on every LLM call. A typical agent session accumulates 50K+ tokens of context, but most of it is irrelevant to the current query.

**OpenRouter** routes between models but doesn't optimize *what gets sent*.
**Agent frameworks** orchestrate tasks but don't structure the data.
**Nobody** uses the mathematical properties of the interaction space itself.

The result: agents waste 40–70% of their token budget on irrelevant context, use expensive models for simple tasks, and have no way to verify their decision-making on-chain.

## The Solution

RootRouter is middleware that sits between your agents and their LLM providers. It does three things:

### 1. 📡 Root-Pair Telemetry
Every interaction produces a **root pair**: the gap between what was intended (query embedding) and what was executed (response embedding). The root vector `r = intent − execution` measures how well the agent fulfilled the request. Collect enough root pairs and **geometric structure emerges** — the interaction space has preferred directions, natural regions, and algebraic symmetry.

### 2. 🔬 Algebraic Context Filtering
Using PCA, we find the **root directions** — principal axes of variation in the interaction space. These define **chambers** (regions where the agent performs similarly). For context retrieval, we use three strategies:

- **Chamber retrieval**: only include history from the same/adjacent chambers
- **Graph retrieval**: traverse the interaction knowledge graph for related context
- **Reflection retrieval**: algebraically reflect the query through root direction hyperplanes to find complementary information

This replaces "send everything" with "send exactly what's relevant."

### 3. 🧠 Intelligent Model Routing
Each chamber has a historical difficulty score (average root norm). Easy chambers route to fast cheap models. Hard chambers route to powerful expensive models. For swarms, the agent topology graph tracks which agent specializes in which chamber — tasks are routed to the specialist, not broadcast to everyone.

All telemetry is logged on **Celo** for verifiable, auditable agent infrastructure.

## Results

```
 Metric              Baseline         RootRouter       Savings
 ─────────────────────────────────────────────────────────────
 Total Cost           ~$1.00           ~$0.51           ~49%
 Context Tokens       27,245           filtered         36,317 saved
 Quality (norm)       1.3043           1.3043           ~same
 Active Chambers      —                ~19              auto-discovered
 Root Directions      —                5                ~50% variance
 Graph Edges          —                ~81              ~4.0 avg degree
```

*Run `npx tsx demo/benchmark.ts` to reproduce. Numbers from 50-query benchmark, TF-IDF embeddings, simulated LLM. Cost savings vary ±5% between runs due to random output token simulation. Quality measured by root norm (intent-execution alignment) — lower is better, same means no quality loss.*

## Quick Start

```bash
# Clone and install
git clone https://github.com/gerryalvarez/rootrouter.git
cd rootrouter
npm install

# Run the demo (works offline — no API keys needed!)
npx tsx demo/basic.ts

# Run the benchmark
npx tsx demo/benchmark.ts

# Run the multi-agent swarm demo
npx tsx demo/swarm.ts
```

To see **live telemetry from Celo**, use the dashboard (see [Dashboard](#dashboard) below).

### Configuration

- **Offline demos:** No API keys required; demos use a simulated LLM.
- **Real LLM + Celo:** Copy `.env.example` to `.env` and set at least:
  - `LLM_BASE_URL`, `LLM_API_KEY` (e.g. OpenAI or OpenRouter)
  - `CELO_RPC_URL`, `CELO_PRIVATE_KEY`, `TELEMETRY_CONTRACT_ADDRESS`
  For mainnet, use `CELO_RPC_URL_MAINNET`, `CELO_PRIVATE_KEY_MAINNET`, and `TELEMETRY_CONTRACT_ADDRESS_MAINNET`. Deployed mainnet contract: [`0x91aB56AbB4577B2B61Eed9A727cCb0D39896f0Ab`](https://explorer.celo.org/mainnet/address/0x91aB56AbB4577B2B61Eed9A727cCb0D39896f0Ab).

**Lighter / cheaper runs:** Set `DEMO_QUICK=true` to reduce interactions (basic: 15, benchmark: 15, swarm: 21). Use a single cheap model for all tiers (e.g. `MODEL_FAST=gpt-4o-mini`, `MODEL_BALANCED=gpt-4o-mini`, `MODEL_POWERFUL=gpt-4o-mini`) to keep real-LLM tests affordable.

### Use in Your Agent

Install from the repo (e.g. `npm install /path/to/RootRouter` or from GitHub), run `npm run build` in RootRouter to generate `dist/`, then in your bot:

```typescript
import { RootRouter } from 'rootrouter';

const router = new RootRouter({
  llmBaseUrl: 'https://openrouter.ai/api/v1',
  llmApiKey: process.env.OPENROUTER_KEY,
  celoRpcUrl: process.env.CELO_RPC_URL,
  celoPrivateKey: process.env.CELO_PRIVATE_KEY,
  telemetryContractAddress: process.env.TELEMETRY_CONTRACT_ADDRESS,
});

// Wrap your existing chat calls
const result = await router.chat({
  agentId: 'my-agent',
  messages: [{ role: 'user', content: 'Write a sorting algorithm' }],
});

console.log(result.response);
console.log(`Saved ${result.telemetry.tokensSaved} tokens ($${result.telemetry.costSaved.toFixed(4)})`);
console.log(`Chamber: ${result.telemetry.chamberUsed}, Model: ${result.telemetry.modelUsed}`);
```

### Dashboard

Run the Next.js dashboard to view on-chain telemetry:

```bash
npm run dashboard
```

Open [http://localhost:3000](http://localhost:3000), enter the **agent address** (wallet that sends telemetry, e.g. your deployer address), and click **Load from Celo** to fetch stats and recent entries from the contract.

## Architecture

```
                    ┌──────────────┐
                    │   User/Agent │
                    └──────┬───────┘
                           │ query
                    ┌──────▼───────┐
                    │  RootRouter  │
                    │  Orchestrator│
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
  │   Embed &   │  │  Classify   │  │   Filter    │
  │  Compute    │  │  into Weyl  │  │   Context   │
  │  Root Pair  │  │  Chamber    │  │(Chamber+    │
  │             │  │  (PCA sign  │  │ Graph+      │
  │  TF-IDF or  │  │  patterns)  │  │ Reflection) │
  │  API embed  │  │             │  │             │
  └─────────────┘  └─────────────┘  └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │   Route to  │
                                    │   Optimal   │
                                    │   Model     │
                                    └──────┬──────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                        │                  │                  │
                 ┌──────▼──┐       ┌──────▼──┐       ┌──────▼──────┐
                 │  Fast   │       │Balanced │       │  Powerful   │
                 │ (Haiku) │       │(Sonnet) │       │   (Opus)    │
                 └─────────┘       └─────────┘       └─────────────┘
                                           │
                                    ┌──────▼──────┐
                                    │  Telemetry  │──→ Celo (on-chain)
                                    └─────────────┘
```

### Key Components

| Component | What It Does | Why It Matters |
|-----------|-------------|----------------|
| **Root Pair Collector** | Records intent/execution vectors for every interaction | The raw telemetry data |
| **Structured Vector Space** | PCA → root directions → chambers via sign patterns | Algebraic structure of interaction space |
| **Interaction Graph** | Knowledge graph of interaction relationships | Relational context beyond vector similarity |
| **Agent Topology Graph** | Tracks agent specializations and delegation patterns | Swarm coordination and task routing |
| **Context Filter** | Chamber + Graph + Reflection retrieval | The money-saving mechanism |
| **Model Router** | Chamber difficulty → model tier selection | Pay for quality only when needed |
| **Celo Telemetry** | On-chain performance logging | Verifiable, auditable agent infra |

## The Math

RootRouter is inspired by **root systems** from Lie algebra — mathematical structures that describe symmetry in physics. The key insight:

1. **Root vectors** (intent − execution) live in a high-dimensional space
2. **PCA** finds the principal directions of variation ≈ "simple roots"
3. **Sign patterns** relative to these directions define **chambers** ≈ "Weyl chambers"
4. **Reflections** through root direction hyperplanes find complementary information
5. The **interaction graph** captures relational structure that geometry alone misses

This gives us a principled way to decompose the agent interaction space — not arbitrary k-means clusters, but algebraically-motivated regions with well-defined adjacency and reflection operations.

For the full mathematical treatment, see:
- Alvarez, G. (2026). *Algebraic Structures of Collective Consciousness*. Working Paper.
- Alvarez, G. (2026). *Root-Structured Intelligence: An E8 Framework for Symmetry-Aware AI*. Working Paper.

## Celo Integration

RootRouter logs telemetry on Celo for three reasons:

1. **Verifiability**: Other agents can audit RootRouter's performance on-chain
2. **Cost efficiency**: Celo's sub-cent fees make high-frequency logging practical
3. **ERC-8004**: RootRouter registers as a Trustless Agent, discoverable by the ecosystem

### On-Chain Data
- Chamber classification for each interaction
- Root norm (performance metric)
- Model tier used
- Tokens saved

### ERC-8004 Registration
RootRouter registers on the ERC-8004 Identity Registry on Celo, with capabilities:
- `context-optimization`: Algebraic context filtering
- `model-routing`: Chamber-based model selection
- `telemetry-logging`: Verifiable performance analytics

## Tech Stack

- **TypeScript** — zero external ML libraries, all math from scratch
- **PCA, K-Means** — implemented with power iteration, no NumPy/sklearn
- **TF-IDF** — local embeddings that work offline (API embeddings optional)
- **ethers.js** — Celo blockchain interaction
- **Solidity** — RootRouterTelemetry contract (contracts/)

## Project Structure

```
src/
├── types.ts              # All type definitions
├── config.ts             # Configuration with sensible defaults
├── math/                 # Pure math (vectors, PCA, k-means)
├── embeddings/           # TF-IDF (local) + API embeddings
├── core/                 # Collector, VectorSpace, Graph, AgentGraph,
│                         # ContextFilter, Router
├── celo/                 # On-chain telemetry + ERC-8004
├── rootRouter.ts         # Main orchestrator
└── index.ts              # Public API
app/                      # Next.js dashboard (live Celo telemetry)
├── layout.tsx
├── page.tsx
└── globals.css
demo/
├── basic.ts              # 40 interactions, single agent
├── swarm.ts              # Multi-agent swarm coordination
└── benchmark.ts          # Baseline vs RootRouter comparison
contracts/
└── RootRouterTelemetry.sol  # On-chain telemetry contract
```

Run `npm run build` to produce `dist/` for the library; required when installing RootRouter as a dependency in another project.

## Roadmap

| Phase | What |
|-------|------|
| **1. Open Source** | Core library, demos, Celo integration ✅ |
| **2. Dashboard** | Next.js app for live on-chain telemetry (chambers, model routing, recent entries) ✅ |
| **3. Router-as-a-Service** | Drop-in replacement for OpenRouter with algebraic routing |
| **4. Enterprise** | Root system analytics for any paired data streams |

## Team

**Gerry Alvarez** — Independent researcher in systems psychology and applied mathematics. Mexico City. Building [MotusDAO](https://motusdao.org) (decentralized mental health) and the E8 Systems Framework (algebraic models of collective intelligence).

## License

MIT — use it, fork it, build on it.

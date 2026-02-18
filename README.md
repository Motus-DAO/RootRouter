<p align="center">
  <img src="RootRouter/public/RootRouter.gif" alt="RootRouter" width="480">
</p>

# 🌿 RootRouter - SDK

### Algebraic Agent Infrastructure for AI Swarms

**Cut your agent's LLM costs 40–70% with root-pair telemetry,
interaction graphs, and symmetry-aware context filtering.**

*Verifiable on-chain analytics on Celo · ERC-8004 compatible*

[![Celo Hackathon](https://img.shields.io/badge/Celo-Hackathon_2026-35D07F?style=for-the-badge&logo=celo)](https://celo.org)
[![Track](https://img.shields.io/badge/Track-Best_Agent_Infra-blue?style=for-the-badge)](https://github.com/Motus-DAO/RootRouter)
[![npm version](https://img.shields.io/npm/v/rootrouter?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/rootrouter)
[![npm downloads](https://img.shields.io/npm/dm/rootrouter?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/rootrouter)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://github.com/Motus-DAO/RootRouter/blob/main/LICENSE)
[![Live Demo](https://img.shields.io/badge/Live-root--router.vercel.app-black?style=for-the-badge)](https://root-router.vercel.app)

📄 **Backed by two working papers on algebraic AI architecture** — see [The Math](#the-math).

---

<!-- Replace with your actual demo GIF once recorded -->
<p align="center">
  <img src="./demo/demo.gif" alt="RootRouter Demo" width="800">
</p>

---

## The Problem

AI agents are expensive. Every autonomous agent burns tokens sending **full conversation history** on every LLM call. A typical agent session accumulates 50K+ tokens of context, but most of it is irrelevant to the current query.

**OpenRouter** routes between models but doesn't optimize *what gets sent*.  
**Agent frameworks** orchestrate tasks but don't structure the data.  
**Nobody** uses the mathematical properties of the interaction space itself.

The result: agents waste 40–70% of their token budget on irrelevant context, use expensive models for simple tasks, and have no way to verify their decision-making on-chain.

---

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

Each chamber has a historical difficulty score (average root norm). Easy chambers route to fast, cheap models. Hard chambers route to powerful, expensive models. For swarms, the agent topology graph tracks which agent specializes in which chamber — tasks are routed to the specialist, not broadcast to everyone.

All telemetry is logged on **Celo** for verifiable, auditable agent infrastructure.

---

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

---

## Install

```bash
npm install rootrouter
```

> Also available on npm: [npmjs.com/package/rootrouter](https://www.npmjs.com/package/rootrouter)

## Usage

```typescript
import { RootRouter } from 'rootrouter';

const router = new RootRouter({
  llmBaseUrl: 'https://openrouter.ai/api/v1',
  llmApiKey: process.env.OPENROUTER_KEY,
  celoRpcUrl: process.env.CELO_RPC_URL,
  celoPrivateKey: process.env.CELO_PRIVATE_KEY,
  telemetryContractAddress: process.env.TELEMETRY_CONTRACT_ADDRESS,
});

const result = await router.chat({
  agentId: 'my-agent',
  messages: [{ role: 'user', content: 'Write a sorting algorithm' }],
});

console.log(result.response);
console.log(`Saved ${result.telemetry.tokensSaved} tokens ($${result.telemetry.costSaved.toFixed(4)})`);
console.log(`Chamber: ${result.telemetry.chamberUsed}, Model: ${result.telemetry.modelUsed}`);
```

That's it. Wire in your LLM and Celo env vars, then use `router.chat()` instead of calling the LLM directly. Telemetry is written on-chain; no extra backend required unless you want the Topology view (see [Dashboard](#dashboard)).

---

## Quick Start

```bash
git clone https://github.com/Motus-DAO/RootRouter.git
cd RootRouter
npm install

# Offline demos (no API keys needed)
npx tsx demo/basic.ts
npx tsx demo/benchmark.ts
npx tsx demo/swarm.ts
```

To see **live telemetry from Celo**, use the [dashboard](#dashboard).

### Configuration

**Offline demos** require no API keys — demos use a simulated LLM.

**Real LLM + Celo:** Copy `.env.example` to `.env` and set at least:
- `LLM_BASE_URL`, `LLM_API_KEY` (e.g. OpenAI or OpenRouter)
- `CELO_RPC_URL`, `CELO_PRIVATE_KEY`, `TELEMETRY_CONTRACT_ADDRESS`

For mainnet, use `CELO_RPC_URL_MAINNET`, `CELO_PRIVATE_KEY_MAINNET`, and `TELEMETRY_CONTRACT_ADDRESS_MAINNET`. Deployed mainnet contract: [`0x91aB56AbB4577B2B61Eed9A727cCb0D39896f0Ab`](https://explorer.celo.org/mainnet/address/0x91aB56AbB4577B2B61Eed9A727cCb0D39896f0Ab).

**Lighter / cheaper runs:** Set `DEMO_QUICK=true` to reduce interactions. Use a single cheap model for all tiers (e.g. `MODEL_FAST=gpt-4o-mini`) to keep real-LLM tests affordable.

**Using both xAI and OpenAI:** Set OpenRouter as `LLM_BASE_URL` and pick models per tier in `.env` (e.g. `MODEL_FAST=x-ai/grok-3-mini`, `MODEL_POWERFUL=openai/gpt-4o`). RootRouter selects the tier by chamber difficulty.

---

## Dashboard

Run the Next.js dashboard to view on-chain telemetry:

```bash
npm run dashboard
```

Open <http://localhost:3000>, enter the **agent address** (wallet that sends telemetry), and click **Load from Celo** to fetch stats and recent entries from the contract.

Or visit the live deployment: **[root-router.vercel.app](https://root-router.vercel.app)**

### Convex (optional — Topology view)

The **Topology** tab (chambers, agent graph, vector space) uses [Convex](https://convex.dev) to store run snapshots.

- **Use our shared backend:** Point your dashboard at the project's Convex deployment (`NEXT_PUBLIC_CONVEX_URL` in the repo). No setup needed.
- **Use your own DB (private):** Run `npx convex dev` once. It creates `.env.local` with your own `NEXT_PUBLIC_CONVEX_URL`. Your snapshots stay private.

To push a snapshot from a demo: set `DASHBOARD_URL=http://localhost:3000` in `.env`, start the dashboard, then run e.g. `npm run demo:basic`. The script POSTs the run to the dashboard; refresh Topology to see it.

---

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
|---|---|---|
| **Root Pair Collector** | Records intent/execution vectors for every interaction | The raw telemetry data |
| **Structured Vector Space** | PCA → root directions → chambers via sign patterns | Algebraic structure of interaction space |
| **Interaction Graph** | Knowledge graph of interaction relationships | Relational context beyond vector similarity |
| **Agent Topology Graph** | Tracks agent specializations and delegation patterns | Swarm coordination and task routing |
| **Context Filter** | Chamber + Graph + Reflection retrieval | The money-saving mechanism |
| **Model Router** | Chamber difficulty → model tier selection | Pay for quality only when needed |
| **Celo Telemetry** | On-chain performance logging | Verifiable, auditable agent infra |

---

## The Math

RootRouter is inspired by **root systems** from Lie algebra — mathematical structures that describe symmetry in physics. The key insight:

1. **Root vectors** (intent − execution) live in a high-dimensional space
2. **PCA** finds the principal directions of variation ≈ "simple roots"
3. **Sign patterns** relative to these directions define **chambers** ≈ "Weyl chambers"
4. **Reflections** through root direction hyperplanes find complementary information
5. The **interaction graph** captures relational structure that geometry alone misses

This gives us a principled way to decompose the agent interaction space — not arbitrary k-means clusters, but algebraically-motivated regions with well-defined adjacency and reflection operations.

### Reference Papers

| Document | Description |
|----------|-------------|
| [**E8 Systems Framework** (version 2)](docs/E8_Systems_Framework_Paper%20(version%202).pdf) | *Algebraic Structures of Collective Consciousness*. Working Paper. Algebraic models of collective intelligence and the E8 root system as a framework for symmetry in interaction spaces. |
| [**E8 AI Architecture**](docs/E8_AI_Architecture_Paper.pdf) | *Root-Structured Intelligence: An E8 Framework for Symmetry-Aware AI*. Working Paper. Architecture for symmetry-aware AI: root pairs, Weyl chambers, and context filtering. |

Both papers are in [`docs/`](docs/). The Systems Framework paper grounds the algebraic semantics; the AI Architecture paper describes how RootRouter implements them.

---

## Celo Mainnet Integration

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

### Why Celo?

Celo's mobile-first, low-fee architecture makes it uniquely suited for high-frequency agent telemetry. Sub-cent transaction costs mean logging every single agent interaction on-chain is economically viable — something that would be prohibitive on Ethereum mainnet. For agent infrastructure meant to run at scale, Celo's throughput and fee structure are a natural fit.

---

## Tech Stack

- **TypeScript** — zero external ML libraries, all math from scratch
- **PCA, K-Means** — implemented with power iteration, no NumPy/sklearn
- **TF-IDF** — local embeddings that work offline (API embeddings optional)
- **ethers.js** — Celo blockchain interaction
- **Solidity** — RootRouterTelemetry contract (`contracts/`)
- **Next.js** — Dashboard for live on-chain telemetry
- **Convex** — Optional real-time topology view

---

## Project Structure

```
docs/
├── E8_Systems_Framework_Paper (version 2).pdf
└── E8_AI_Architecture_Paper.pdf
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

---

## Roadmap

| Phase | What | Status |
|---|---|---|
| **1. Open Source** | Core library, demos, Celo integration | ✅ Done |
| **2. Dashboard** | Next.js app for live on-chain telemetry | ✅ Done |
| **3. Router-as-a-Service** | Drop-in replacement for OpenRouter with algebraic routing | 🔜 Next |
| **4. Enterprise** | Root system analytics for any paired data streams | 🔜 Planned |

---

## Real-World Usage

[MotusDAO](https://app.motusdao.org) will run RootRouter in production: a decentralized mental health platform connecting Spanish-speaking psychologists and patients globally, using it as the agent layer for routing and analyzing therapeutic interaction data at scale.

Dominant agent routing stacks (e.g. [OpenRouter](https://openrouter.ai)) are widely adopted, but they push full context on every call — so automated workloads and multi-agent swarms burn token budgets fast, and orchestration at scale gets prohibitively expensive. RootRouter cuts that cost by sending only algebraically relevant context and routing by chamber.

---

## Team

**Gerry Alvarez** — Independent researcher in systems psychology and applied mathematics. Mexico City. Building [MotusDAO](https://motusdao.org) (decentralized mental health) and the E8 Systems Framework (algebraic models of collective intelligence).

---

## License

MIT — use it, fork it, build on it.
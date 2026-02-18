<p align="center">
  <img src="RootRouter/public/RootRouter.gif" alt="RootRouter" width="800">
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

> 📄 Backed by two working papers on algebraic AI architecture and graph-theoretic agent topology — see [The Math](#the-math)

---

## The Problem

AI agents are expensive. Every autonomous agent burns tokens sending **full conversation history** on every LLM call. A typical agent session accumulates 50K+ tokens of context, but most of it is irrelevant to the current query.

**OpenRouter** routes between models but doesn't optimize *what gets sent*.  
**Agent frameworks** orchestrate tasks but don't structure the interaction space.  
**Nobody** uses the mathematical properties of the interaction graph itself.

The result: agents waste 40–70% of their token budget on irrelevant context, use expensive models for simple tasks, and have no verifiable record of their decision-making.

---

## The Solution

RootRouter is middleware that fuses **three mathematical layers** — algebraic geometry, graph theory, and distributed systems — into a single drop-in SDK. It sits between your agents and their LLM providers and does three things:

### 1. 📡 Root-Pair Telemetry

Every interaction produces a **root pair**: the gap between what was intended (query embedding) and what was executed (response embedding). The root vector `r = intent − execution` measures alignment. Collect enough root pairs and **geometric structure emerges** — the interaction space has preferred directions, natural regions, and algebraic symmetry.

### 2. 🔬 Multi-Layer Context Filtering

RootRouter builds a **three-layer representation** of the agent's interaction history and uses all three simultaneously for context retrieval:

**Layer 1 — Algebraic (Weyl Chambers)**  
PCA identifies the *root directions* — principal axes of variation in the interaction space. These define **Weyl chambers**: regions where the agent performs similarly. Context from the same or adjacent chambers is most relevant to the current query.

**Layer 2 — Topological (Interaction Knowledge Graph)**  
Every interaction becomes a node. Edges encode semantic relatedness, chamber adjacency, and temporal proximity. The resulting knowledge graph typically reaches ~81 edges and ~4.0 average degree per session. **Graph traversal** surfaces contextually related history that pure vector similarity misses — capturing second-order and third-order relational structure that linear retrieval cannot.

**Layer 3 — Geometric (Reflection Retrieval)**  
Algebraically reflecting the query through root direction hyperplanes finds *complementary* information across chamber boundaries — context that contrasts with the current query in structured ways.

This replaces "send everything" with "send exactly what's relevant" — from three different structural perspectives simultaneously.

### 3. 🧠 Intelligent Model Routing

Each chamber has a historical difficulty score (average root norm). Easy chambers → fast, cheap models. Hard chambers → powerful, expensive models.

For **multi-agent swarms**, RootRouter builds an **Agent Topology Graph**: a directed graph where nodes are agents and weighted edges encode delegation relationships and chamber specializations. Each agent accumulates a *chamber profile* over time. When a new task arrives, RootRouter performs **weighted shortest-path routing** on the topology graph to find the specialist agent whose chamber profile best matches the task's geometric signature. The topology is self-organizing — it improves as the swarm grows.

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

*Run `npx tsx demo/benchmark.ts` to reproduce. Numbers from 50-query benchmark, TF-IDF embeddings, simulated LLM. Cost savings vary ±5% between runs. Quality measured by root norm — lower is better, same means no quality loss.*

---

## Install

```bash
npm install rootrouter
```

> Also available on npm: [npmjs.com/package/rootrouter](https://www.npmjs.com/package/rootrouter)

The published package includes the built SDK (`dist/`), TypeScript types, and this README. Demos and dashboard live in the [GitHub repo](https://github.com/Motus-DAO/RootRouter); run them after cloning.

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

That's it. Wire in your LLM and Celo env vars, then use `router.chat()` instead of calling the LLM directly. The algebraic filtering, graph traversal, and on-chain telemetry all happen transparently.

---

## Quick Start

```bash
git clone https://github.com/Motus-DAO/RootRouter.git
cd RootRouter
npm install

# Offline demos (no API keys needed)
npx tsx demo/basic.ts        # 40 interactions, single agent
npx tsx demo/swarm.ts        # multi-agent topology routing
npx tsx demo/benchmark.ts    # baseline vs RootRouter comparison
```

To see **live telemetry from Celo**, use the [dashboard](#dashboard).

### Configuration

**Offline demos** require no API keys — demos use a simulated LLM.

**Real LLM + Celo:** Copy `.env.example` to `.env` and set at least:
- `LLM_BASE_URL`, `LLM_API_KEY` (e.g. OpenAI or OpenRouter)
- `CELO_RPC_URL`, `CELO_PRIVATE_KEY`, `TELEMETRY_CONTRACT_ADDRESS`

For mainnet, use `CELO_RPC_URL_MAINNET`, `CELO_PRIVATE_KEY_MAINNET`, and `TELEMETRY_CONTRACT_ADDRESS_MAINNET`. Deployed mainnet contract: [`0x91aB56AbB4577B2B61Eed9A727cCb0D39896f0Ab`](https://explorer.celo.org/mainnet/address/0x91aB56AbB4577B2B61Eed9A727cCb0D39896f0Ab).

**Lighter / cheaper runs:** Set `DEMO_QUICK=true` to reduce interactions. Use a single cheap model for all tiers (e.g. `MODEL_FAST=gpt-4o-mini`) to keep real-LLM tests affordable.

**Using both xAI and OpenAI:** Set OpenRouter as `LLM_BASE_URL` and pick models per tier (e.g. `MODEL_FAST=x-ai/grok-3-mini`, `MODEL_POWERFUL=openai/gpt-4o`).

---

## Dashboard

```bash
npm run dashboard
```

Open <http://localhost:3000>, enter the **agent address**, and click **Load from Celo** to fetch stats and recent entries from the contract.

Or visit the live deployment: **[root-router.vercel.app](https://root-router.vercel.app)**

The dashboard shows:
- **Chamber distribution** — which Weyl chambers the agent has operated in
- **Knowledge graph** — interaction nodes and edges visualized
- **Agent topology** — swarm delegation graph (Topology tab)
- **Cost savings** — token budget breakdown per session

### Convex (optional — Topology view)

- **Shared backend:** Use the project's Convex deployment (`NEXT_PUBLIC_CONVEX_URL` in repo). No setup.
- **Private DB:** Run `npx convex dev` once. Your snapshots stay in your own project.

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
  │   Embed &   │  │  Classify   │  │ Multi-Layer │
  │  Compute    │  │  into Weyl  │  │   Context   │
  │  Root Pair  │  │  Chamber    │  │   Filter    │
  │             │  │  (PCA sign  │  │             │
  │  TF-IDF or  │  │  patterns)  │  │ ① Chamber  │
  │  API embed  │  │             │  │ ② Graph    │
  └─────────────┘  └─────────────┘  │ ③ Reflect  │
                                    └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │  Topology   │
                                    │  Graph      │
                                    │  Routing    │
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

| Component | What It Does | Mathematical Basis |
|---|---|---|
| **Root Pair Collector** | Records intent/execution vectors per interaction | Lie algebra root vectors |
| **Structured Vector Space** | PCA → root directions → Weyl chambers | Algebraic geometry |
| **Interaction Knowledge Graph** | Builds semantic + temporal graph over interactions | Graph theory |
| **Agent Topology Graph** | Tracks swarm specializations and delegation paths | Network analysis |
| **Context Filter** | Chamber + Graph + Reflection retrieval | Multi-layer traversal |
| **Model Router** | Chamber difficulty → model tier selection | Weighted graph routing |
| **Celo Telemetry** | Verifiable on-chain decision logging | Distributed systems |

---

## The Math

RootRouter is built on three mathematical layers that each contribute something the others cannot.

### Layer 1: Algebraic Geometry — Root Systems & Weyl Chambers

Inspired by **root systems** from Lie algebra — mathematical structures used in theoretical physics to describe symmetry. The key insight:

1. **Root vectors** `r = intent − execution` live in a high-dimensional space
2. **PCA** finds the principal directions of variation ≈ *simple roots*
3. **Sign patterns** relative to these directions define **Weyl chambers**
4. **Reflections** through root direction hyperplanes find complementary information
5. Chambers are non-arbitrary — they have well-defined algebraic adjacency and reflection operations

### Layer 2: Graph Theory — Interaction & Topology Graphs

Two graphs operate on top of the vector space:

**Interaction Knowledge Graph** — every query-response pair is a node. Edges encode semantic similarity, chamber adjacency, and temporal proximity. Graph traversal retrieves contextually related history that vector similarity misses, capturing multi-hop relational structure in the conversation that linear retrieval cannot access.

**Agent Topology Graph** — agents are nodes, delegation relationships are weighted edges. Each agent's chamber profile forms its capability signature. Routing in a swarm is a **weighted shortest-path problem** on this topology graph: find the agent whose profile best matches the incoming task's geometric signature. The graph is **self-organizing** — it updates with every interaction and becomes more accurate as the swarm grows.

### Layer 3: Distributed Systems — Verifiable Decentralized Telemetry

Chamber classifications are fully deterministic — computed from interaction history via PCA sign patterns. Any node can independently recompute and verify routing decisions without trusting a central coordinator. Telemetry on Celo mainnet provides an immutable, decentralized audit trail. Agent capability declarations are stored on-chain via ERC-8004, making swarm topology auditable by external systems.

### Reference Papers

| Document | Description |
|---|---|
| [**E8 Systems Framework** (version 2)](docs/E8_Systems_Framework_Paper%20(version%202).pdf) | *Algebraic Structures of Collective Consciousness* — root systems, Weyl chambers, and graph-theoretic models of collective intelligence |
| [**E8 AI Architecture**](docs/E8_AI_Architecture_Paper.pdf) | *Root-Structured Intelligence: An E8 Framework for Symmetry-Aware AI* — applied architecture for multi-layer agent context filtering |

Both papers are in [`docs/`](docs/).

---

## Celo Integration

### Why Celo?

Agent telemetry at scale means thousands of on-chain writes per day. On Ethereum mainnet this is economically prohibitive. Celo's sub-cent fees make high-frequency agent logging viable — this is the only L2 where this architecture makes economic sense at production scale. Celo's 700K+ daily active users and mobile-first design also align with MotusDAO's global deployment target.

### On-Chain Data

- Chamber classification per interaction
- Root norm (performance metric)
- Model tier used
- Tokens saved
- Graph edge count per session

### ERC-8004 Registration

RootRouter registers on the ERC-8004 Identity Registry on Celo, with capabilities:

- `context-optimization`: Algebraic context filtering
- `model-routing`: Chamber-based model selection
- `telemetry-logging`: Verifiable performance analytics

---

## Tech Stack

- **TypeScript** — zero external ML libraries; all math from scratch
- **PCA, K-Means** — implemented with power iteration (no NumPy/sklearn)
- **TF-IDF** — local embeddings that work fully offline; API embeddings optional
- **Graph algorithms** — custom knowledge graph and agent topology graph implementations
- **ethers.js** — Celo blockchain interaction
- **Solidity** — RootRouterTelemetry contract (`contracts/`)
- **Next.js** — Dashboard for live on-chain telemetry
- **Convex** — Optional real-time topology and graph visualization

---

## Project Structure

```
src/
├── types.ts              # All type definitions
├── config.ts             # Configuration with sensible defaults
├── math/                 # Pure math (vectors, PCA, k-means)
├── embeddings/           # TF-IDF (local) + API embeddings
├── core/
│   ├── Collector.ts      # Root pair collection
│   ├── VectorSpace.ts    # PCA, root directions, Weyl chambers
│   ├── Graph.ts          # Interaction knowledge graph
│   ├── AgentGraph.ts     # Agent topology graph
│   ├── ContextFilter.ts  # Chamber + Graph + Reflection retrieval
│   └── Router.ts         # Model tier routing
├── celo/                 # On-chain telemetry + ERC-8004
├── rootRouter.ts         # Main orchestrator
└── index.ts              # Public API
app/                      # Next.js dashboard
demo/
├── basic.ts              # 40 interactions, single agent
├── swarm.ts              # Multi-agent topology routing
└── benchmark.ts          # Baseline vs RootRouter comparison
contracts/
└── RootRouterTelemetry.sol
docs/
├── E8_Systems_Framework_Paper (version 2).pdf
└── E8_AI_Architecture_Paper.pdf
```

Run `npm run build` to produce `dist/` for the library.

---

## Roadmap

| Phase | What | Status |
|---|---|---|
| **1. Open Source** | Core library, demos, Celo integration | ✅ Done |
| **2. Dashboard** | Live on-chain telemetry, graph visualization | ✅ Done |
| **3. Router-as-a-Service** | Drop-in replacement for OpenRouter with algebraic routing | 🔜 Next |
| **4. Enterprise** | Root system analytics for any paired data streams | 🔜 Planned |

---

## Real-World Usage

[MotusDAO](https://app.motusdao.org) — a decentralized mental health platform connecting Spanish-speaking psychologists and patients globally — will run RootRouter in production as the agent routing layer for its therapeutic interaction infrastructure. Therapeutic conversations have strong relational graph structure; the knowledge graph traversal captures session context in ways that pure vector similarity cannot, making it particularly well-suited for clinical agent workflows at scale.

---

## Team

**Gerry Alvarez** — Independent researcher in systems psychology and applied mathematics. Mexico City. Building [MotusDAO](https://motusdao.org) (decentralized mental health) and the E8 Systems Framework (algebraic and graph-theoretic models of collective intelligence).

---

## License

MIT — use it, fork it, build on it.
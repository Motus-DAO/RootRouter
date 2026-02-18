# RootRouter — Celo Hackathon 2026 Submission

**Track:** Best Agent Infra on Celo  
**Live:** [root-router.vercel.app](https://root-router.vercel.app)  
**npm:** [npmjs.com/package/rootrouter](https://www.npmjs.com/package/rootrouter)  
**Contract (Mainnet):** [`0x91aB56AbB4577B2B61Eed9A727cCb0D39896f0Ab`](https://explorer.celo.org/mainnet/address/0x91aB56AbB4577B2B61Eed9A727cCb0D39896f0Ab)

---

## 1. Technical Innovation

RootRouter applies **root systems from Lie algebra** — a mathematical structure used in theoretical physics to describe symmetry — to the problem of AI agent context management. This is not a novel combination of existing tools; it's a new theoretical framework applied to a practical infrastructure problem.

The core insight: every agent interaction generates a *root pair* (intent vector, execution vector). The gap `r = intent − execution` is a root vector. Accumulate enough of these and the interaction space develops algebraic structure — principal directions (simple roots), sign-pattern regions (Weyl chambers), and hyperplane reflections — all of which can be exploited for context filtering and model routing.

This is grounded in two working papers (see `docs/`):
- *Algebraic Structures of Collective Consciousness* — the mathematical framework
- *Root-Structured Intelligence: An E8 Framework for Symmetry-Aware AI* — the applied architecture

**What makes this novel vs. existing infra:**
- OpenRouter routes between *models* but sends full context every time
- LangChain/CrewAI orchestrate tasks but don't structure the interaction space
- RAG systems retrieve by vector similarity but ignore algebraic geometry
- RootRouter is the first system to use the *geometric structure of interaction history* itself as the basis for context selection and routing

---

## 2. Developer Experience

RootRouter is designed to be a **drop-in replacement** — minimal integration surface, maximum savings.

**Install:**
```bash
npm install rootrouter
```

**Integrate:**
```typescript
import { RootRouter } from 'rootrouter';

const router = new RootRouter({
  llmBaseUrl: 'https://openrouter.ai/api/v1',
  llmApiKey: process.env.OPENROUTER_KEY,
  celoRpcUrl: process.env.CELO_RPC_URL,
  celoPrivateKey: process.env.CELO_PRIVATE_KEY,
  telemetryContractAddress: process.env.TELEMETRY_CONTRACT_ADDRESS,
});

// Replace your existing LLM call with:
const result = await router.chat({ agentId: 'my-agent', messages });
```

That's the entire integration. Builders don't need to understand the math to get the savings.

**Additional DX features:**
- **Offline demos** — `npx tsx demo/basic.ts` works with zero API keys (simulated LLM)
- **TypeScript-native** — full types, CJS/ESM exports
- **Zero ML dependencies** — PCA, K-Means, and TF-IDF implemented from scratch; no NumPy, no sklearn, no Python runtime
- **Live dashboard** at [root-router.vercel.app](https://root-router.vercel.app) — paste any agent wallet address and inspect its chambers, routing decisions, and token savings in real time
- **Reproducible benchmarks** — `npx tsx demo/benchmark.ts` prints the full comparison table

---

## 3. Security & Trust Minimization

**On-chain verifiability via Celo:**  
Every routing decision RootRouter makes is logged on Celo mainnet. The telemetry contract at `0x91aB56AbB4577B2B61Eed9A727cCb0D39896f0Ab` stores per-interaction records including chamber classification, root norm, model tier used, and tokens saved. Any external party can audit an agent's decision history without trusting RootRouter's self-reporting.

**ERC-8004 Identity Registration:**  
RootRouter registers as a Trustless Agent on the ERC-8004 Identity Registry on Celo, declaring its capabilities (`context-optimization`, `model-routing`, `telemetry-logging`). This makes it discoverable and auditable within the Celo agent ecosystem.

**Key management:**  
- The Celo private key in `.env` is used only for writing telemetry — it does not have custody over user funds
- The LLM API key is passed through to the provider and never stored on-chain
- Builders can use separate wallets for telemetry vs. any financial operations

**Trust minimization:**  
The context filtering logic is entirely deterministic and open source. The algebraic operations (PCA, chamber classification, reflection) are reproducible from the same interaction history — there is no black-box routing oracle. Anyone can re-run the math and verify the chamber assignments independently.

---

## 4. Real-World Applicability

**The problem is real and measurable:**  
Our benchmark (run via `npx tsx demo/benchmark.ts`) shows ~49% cost reduction on a 50-query workload with no measurable quality loss (root norm unchanged). At scale, this is the difference between a viable and unviable agent product.

**Production deployment:**  
[MotusDAO](https://app.motusdao.org) — a decentralized mental health platform connecting Spanish-speaking psychologists and patients globally — will run RootRouter as the agent routing layer for its therapeutic interaction infrastructure. This is a live, high-stakes production use case with real users, not a toy demo.

**The Celo fit is structural, not cosmetic:**  
Agent telemetry at scale means thousands of on-chain writes per day. On Ethereum mainnet, this would be economically prohibitive. Celo's sub-cent fees make it the only L2 where high-frequency agent logging is actually viable. This isn't Celo integration for the sake of a hackathon — it's the only chain where this architecture makes economic sense.

**Who else benefits:**  
Any builder running multi-agent swarms, long-horizon autonomous agents, or cost-sensitive LLM workflows can drop in RootRouter and immediately cut costs. The SDK is published to npm and ready to use today.

---

## Summary

| Criterion | How We Address It |
|---|---|
| Technical Innovation | First application of Lie algebra root systems to agent context filtering; backed by two working papers |
| Developer Experience | One npm install, one API call change, zero ML dependencies, offline demos, live dashboard |
| Security & Trust Minimization | All routing decisions logged on Celo mainnet; ERC-8004 registered; open-source deterministic logic |
| Real-World Applicability | 49% cost reduction in benchmarks; production deployment at MotusDAO; Celo fees make it economically viable at scale |
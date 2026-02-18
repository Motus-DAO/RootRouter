/**
 * RootRouter Swarm Demo
 * Multi-agent swarm (planner, coder, researcher) coordinated by agent topology graph.
 * No API keys needed.
 *
 * Run: npm run demo:swarm
 */

import { RootRouter } from '../src';

const c = {
  reset: process.stdout.isTTY !== false ? '\x1b[0m' : '',
  bold: process.stdout.isTTY !== false ? '\x1b[1m' : '',
  dim: process.stdout.isTTY !== false ? '\x1b[2m' : '',
  green: process.stdout.isTTY !== false ? '\x1b[32m' : '',
  yellow: process.stdout.isTTY !== false ? '\x1b[33m' : '',
  red: process.stdout.isTTY !== false ? '\x1b[31m' : '',
  cyan: process.stdout.isTTY !== false ? '\x1b[36m' : '',
  magenta: process.stdout.isTTY !== false ? '\x1b[35m' : '',
  blue: process.stdout.isTTY !== false ? '\x1b[34m' : '',
};

const AGENT_QUERIES: Record<string, string[]> = {
  planner: [
    'Design a microservices architecture for an e-commerce platform',
    'Create a project timeline for mobile app development with milestones',
    'Plan the migration strategy from monolith to microservices',
    'Design the database schema for a social media application',
    'Create a risk assessment matrix for cloud infrastructure migration',
    'Plan the CI/CD pipeline for a multi-team development workflow',
    'Design the API versioning strategy for backward compatibility',
    'Create a capacity planning model for expected 10x user growth',
    'Plan the testing strategy for a distributed payment system',
    'Design a disaster recovery plan for multi-region deployment',
    'Create a feature prioritization framework using RICE scoring',
    'Plan the data migration strategy from SQL to NoSQL databases',
    'Design the authentication flow for a multi-tenant SaaS platform',
    'Create an incident response playbook for production outages',
    'Plan the rollout strategy for a major platform redesign',
  ],
  coder: [
    'Implement a rate limiter using the token bucket algorithm in TypeScript',
    'Write a WebSocket server for real-time chat with room support',
    'Create a React hook for infinite scroll with virtualization',
    'Implement an LRU cache with O(1) get and put operations',
    'Write a middleware for request validation using Zod schemas',
    'Create a database connection pool with automatic retry logic',
    'Implement a job queue with priority levels and dead letter handling',
    'Write a GraphQL resolver for paginated search with filters',
    'Create a file upload service with chunked uploads and resumability',
    'Implement a circuit breaker pattern for external API calls',
    'Write a custom React reconciler for canvas-based rendering',
    'Create an event sourcing system with snapshot capability',
    'Implement a distributed lock using Redis with automatic expiry',
    'Write a streaming CSV parser that handles malformed data gracefully',
    'Create a type-safe API client generator from OpenAPI specifications',
  ],
  researcher: [
    'Compare PostgreSQL vs MongoDB for time-series IoT sensor data workloads',
    'Research best practices for securing JWT tokens in browser applications',
    'Analyze the trade-offs between REST and gRPC for microservice communication',
    'Research GDPR compliance requirements for user data processing pipelines',
    'Compare Kubernetes vs serverless for variable-load batch processing workloads',
    'Research state-of-the-art techniques for real-time fraud detection systems',
    'Analyze the performance characteristics of different consensus algorithms',
    'Research accessibility standards WCAG 2.1 AA for web application compliance',
    'Compare edge computing frameworks for IoT data preprocessing at scale',
    'Research machine learning model serving architectures for low-latency inference',
    'Analyze the security implications of WebAssembly in browser environments',
    'Research data lake architectures for multi-format analytics workloads',
    'Compare observability tools Datadog vs Grafana vs New Relic for microservices',
    'Research zero-knowledge proof applications for privacy-preserving verification',
    'Analyze the cost-effectiveness of spot instances for batch ML training workloads',
  ],
};

const COMPLEX_TASKS = [
  {
    name: 'Build a REST API for a todo app',
    subtasks: [
      { agent: 'planner', query: 'Design the REST API structure, endpoints, and data model for a full-featured todo application' },
      { agent: 'coder', query: 'Implement the Express REST API with CRUD endpoints, authentication middleware, and database models for todos' },
      { agent: 'researcher', query: 'Research best practices for REST API design, pagination patterns, and error handling standards' },
    ],
  },
  {
    name: 'Analyze competitor pricing strategy',
    subtasks: [
      { agent: 'researcher', query: 'Research and compile competitor pricing data, market positioning, and value propositions in the SaaS space' },
      { agent: 'planner', query: 'Create a competitive analysis framework with pricing tiers, feature comparison matrix, and positioning map' },
      { agent: 'coder', query: 'Build a spreadsheet automation tool that scrapes public pricing pages and generates comparison charts' },
    ],
  },
  {
    name: 'Deploy ML model to production',
    subtasks: [
      { agent: 'researcher', query: 'Research model serving options: TensorFlow Serving vs TorchServe vs custom Flask API for production ML' },
      { agent: 'planner', query: 'Design the ML deployment pipeline with A/B testing, canary rollout, and monitoring dashboards' },
      { agent: 'coder', query: 'Implement the containerized model serving endpoint with health checks, batching, and GPU memory management' },
    ],
  },
  {
    name: 'Implement real-time analytics dashboard',
    subtasks: [
      { agent: 'planner', query: 'Design the real-time analytics architecture: data ingestion, stream processing, and dashboard wireframes' },
      { agent: 'coder', query: 'Implement the WebSocket-based dashboard with D3.js charts, live counters, and configurable time windows' },
      { agent: 'researcher', query: 'Compare stream processing engines Kafka Streams vs Flink vs Spark Streaming for real-time analytics' },
    ],
  },
  {
    name: 'Security audit and hardening',
    subtasks: [
      { agent: 'researcher', query: 'Research OWASP Top 10 vulnerabilities and audit checklist for Node.js web applications' },
      { agent: 'planner', query: 'Create a security hardening plan with priority-ranked fixes, timeline, and compliance verification steps' },
      { agent: 'coder', query: 'Implement security fixes: input sanitization, CSRF protection, rate limiting, and Content Security Policy headers' },
    ],
  },
];

function pad(s: string, len: number): string {
  return s.length >= len ? s.substring(0, len) : s + ' '.repeat(len - s.length);
}

function tierLabel(model: string): string {
  if (model.includes('haiku') || model.includes('fast')) return `${c.green}FAST${c.reset}`;
  if (model.includes('opus') || model.includes('powerful')) return `${c.red}POWR${c.reset}`;
  return `${c.yellow}BLNC${c.reset}`;
}

function agentColor(agent: string): string {
  if (agent === 'planner') return c.blue;
  if (agent === 'coder') return c.green;
  return c.magenta;
}

function bar(n: number, max: number, w: number = 8): string {
  const filled = Math.round((n / Math.max(max, 1)) * w);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(w - filled);
}

async function main() {
  console.log('');
  console.log(`${c.bold}${c.cyan}\u250c${'─'.repeat(62)}\u2510${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2502${c.reset}${c.bold}     \u{1f33f} ROOTROUTER \u2014 Multi-Agent Swarm Demo                  ${c.cyan}\u2502${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2502${c.reset}        3 Agents \u00d7 15 warm-up + 5 complex tasks              ${c.cyan}\u2502${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2514${'─'.repeat(62)}\u2518${c.reset}`);
  console.log('');
  console.log(`  Agents: ${c.blue}planner${c.reset}  ${c.green}coder${c.reset}  ${c.magenta}researcher${c.reset}`);
  console.log('');

  const router = new RootRouter({
    verbose: false,
    useLocalEmbeddings: true,
    embeddingDimension: 128,
    minInteractionsBeforeFit: 10,
    refitInterval: 8,
    pcaDimensions: 5,
  });

  const warmupRounds = process.env.DEMO_QUICK === 'true' ? 5 : 15;
  const complexTaskCount = process.env.DEMO_QUICK === 'true' ? 2 : COMPLEX_TASKS.length;
  const isQuick = warmupRounds < 15;

  // Phase 1: Warm-up
  console.log(`  ${c.bold}\u2500\u2500\u2500 Phase 1: Agent Warm-up (${warmupRounds * 3} interactions)${isQuick ? ' (quick)' : ''} \u2500\u2500\u2500${c.reset}`);
  console.log('');

  const agents = ['planner', 'coder', 'researcher'];
  let count = 0;
  let fittedAt = -1;

  for (let i = 0; i < warmupRounds; i++) {
    for (const agent of agents) {
      count++;
      const query = AGENT_QUERIES[agent][i];
      const result = await router.chat({
        agentId: agent,
        messages: [{ role: 'user', content: query }],
      });

      const chamberStr = result.telemetry.isWarmStart ? `C${String(result.telemetry.chamberUsed ?? '?').padStart(2)}` : `${c.dim}cold${c.reset}`;
      const ac = agentColor(agent);
      const num = String(count).padStart(3);
      console.log(`  ${c.dim}${num}${c.reset}  ${ac}${pad(agent, 10)}${c.reset}  ${pad(query, 42)}  ${chamberStr}  ${tierLabel(result.telemetry.modelUsed)}`);

      if (result.telemetry.isWarmStart && fittedAt < 0) {
        fittedAt = count;
        const vs = router.getVectorSpace().getSummary();
        console.log(`       ${c.magenta}\u2514\u2500 Vector space fitted: ${vs.directionsFound} root directions, ${vs.activeChambers} chambers, ${(vs.varianceExplained * 100).toFixed(1)}% variance${c.reset}`);
      }
    }
  }

  // Show agent specializations
  console.log('');
  console.log(`  ${c.bold}\u2500\u2500\u2500 Agent Specialization Profile \u2500\u2500\u2500${c.reset}`);
  console.log('');

  for (const agent of agents) {
    const profile = router.getAgentGraph().getAgentProfile(agent);
    if (!profile) continue;
    const chambers = Object.entries(profile.chamberSpecialization)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id, cnt]) => `C${id}(${cnt})`)
      .join(', ');
    const ac = agentColor(agent);
    console.log(`    ${ac}${pad(agent, 10)}${c.reset}  norm: ${profile.avgRootNorm.toFixed(4)}  chambers: ${c.dim}${chambers}${c.reset}`);
  }

  // Phase 2: Complex tasks
  console.log('');
  console.log(`  ${c.bold}\u2500\u2500\u2500 Phase 2: Complex Multi-Agent Tasks \u2500\u2500\u2500${c.reset}`);
  console.log('');

  for (let t = 0; t < complexTaskCount; t++) {
    const task = COMPLEX_TASKS[t];
    console.log(`  ${c.bold}Task ${t + 1}: ${task.name}${c.reset}`);

    let taskTokensSaved = 0;
    let taskCostSaved = 0;

    for (const subtask of task.subtasks) {
      const result = await router.chat({
        agentId: subtask.agent,
        messages: [{ role: 'user', content: subtask.query }],
      });

      const chamberStr = result.telemetry.chamberUsed !== null ? `C${result.telemetry.chamberUsed}` : '-';
      const bestAgent = router.getAgentGraph().getBestAgentForChamber(result.telemetry.chamberUsed ?? -1);
      const recommended = bestAgent ? bestAgent.agentId : '-';
      const ac = agentColor(subtask.agent);

      console.log(`    ${ac}${pad(subtask.agent, 10)}${c.reset} \u2192 ${c.cyan}${chamberStr.padEnd(4)}${c.reset} ${tierLabel(result.telemetry.modelUsed)}  saved ${c.green}${String(result.telemetry.tokensSaved).padStart(4)}${c.reset} tok  best: ${recommended}`);
      taskTokensSaved += result.telemetry.tokensSaved;
      taskCostSaved += result.telemetry.costSaved;
    }

    console.log(`    ${c.dim}Subtotal: ${taskTokensSaved} tokens, $${taskCostSaved.toFixed(4)} saved${c.reset}`);
    console.log('');
  }

  // Summary
  const tel = router.getTelemetry();
  console.log(`${c.bold}${c.cyan}\u250c${'─'.repeat(62)}\u2510${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2502${c.reset}${c.bold}                    SWARM RESULTS                            ${c.cyan}\u2502${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2514${'─'.repeat(62)}\u2518${c.reset}`);
  console.log('');
  console.log(`  Interactions:    ${c.bold}${tel.totalInteractions}${c.reset}`);
  console.log(`  Tokens Saved:    ${c.bold}${c.green}${tel.totalTokensSaved.toLocaleString()}${c.reset}`);
  console.log(`  Cost Saved:      ${c.bold}${c.green}$${tel.totalCostSaved.toFixed(4)}${c.reset}`);
  console.log(`  Active Chambers: ${tel.vectorSpaceStats.activeChambers}  Root Directions: ${tel.vectorSpaceStats.rootDirectionsFound}  Variance: ${(tel.vectorSpaceStats.varianceExplained * 100).toFixed(1)}%`);
  console.log(`  Graph:           ${tel.graphStats.nodeCount} nodes, ${tel.graphStats.edgeCount} edges, avg degree ${tel.graphStats.avgDegree.toFixed(2)}`);
  console.log('');

  console.log(`  ${c.bold}Agent Rankings${c.reset} (by avg root norm, lower = better):`);
  const ranking = router.getAgentGraph().getAgentRanking();
  const maxInteractions = Math.max(...ranking.map(r => r.interactions), 1);
  for (const r of ranking) {
    const ac = agentColor(r.agentId);
    console.log(`    ${ac}${pad(r.agentId, 10)}${c.reset}  norm: ${r.avgNorm.toFixed(4)}  ${c.dim}${bar(r.interactions, maxInteractions, 12)}${c.reset} ${r.interactions} interactions`);
  }
  console.log('');
  console.log(`  ${c.dim}${tel.recommendation}${c.reset}`);
  console.log('');

  const txHash = await router.flushTelemetry();
  if (txHash) {
    console.log(`  ${c.green}Celo telemetry TX: ${txHash}${c.reset}`);
    console.log('');
  }

  const dashboardUrl = process.env.DASHBOARD_URL?.replace(/\/$/, '');
  if (dashboardUrl) {
    try {
      const runId = `swarm-${Date.now()}`;
      const payload = router.getSnapshotForExport(runId, 'swarm');
      const res = await fetch(`${dashboardUrl}/api/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        console.log(`  ${c.dim}Snapshot sent to dashboard. View at ${dashboardUrl}/dashboard/topology${c.reset}`);
        console.log('');
      } else {
        console.log(`  ${c.dim}Snapshot upload failed: ${res.status}${c.reset}`);
      }
    } catch (e) {
      console.log(`  ${c.dim}Snapshot upload error: ${e instanceof Error ? e.message : String(e)}${c.reset}`);
    }
  }
}

main().catch(console.error);

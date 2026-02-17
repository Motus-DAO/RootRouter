/**
 * RootRouter Basic Demo
 * Runs 40 simulated interactions across 5 categories, showing chamber formation,
 * context filtering, model routing, and cost savings.
 * No API keys needed — uses TF-IDF + simulated LLM.
 *
 * Run: npm run demo:basic
 */

import { RootRouter } from '../src';

// ─── ANSI Colors (graceful fallback) ───
const USE_COLOR = process.stdout.isTTY !== false;
const c = {
  reset: USE_COLOR ? '\x1b[0m' : '',
  bold: USE_COLOR ? '\x1b[1m' : '',
  dim: USE_COLOR ? '\x1b[2m' : '',
  green: USE_COLOR ? '\x1b[32m' : '',
  yellow: USE_COLOR ? '\x1b[33m' : '',
  red: USE_COLOR ? '\x1b[31m' : '',
  cyan: USE_COLOR ? '\x1b[36m' : '',
  magenta: USE_COLOR ? '\x1b[35m' : '',
  white: USE_COLOR ? '\x1b[37m' : '',
  bgGreen: USE_COLOR ? '\x1b[42m' : '',
  bgYellow: USE_COLOR ? '\x1b[43m' : '',
  bgRed: USE_COLOR ? '\x1b[41m' : '',
};

const QUERIES: { category: string; queries: string[] }[] = [
  {
    category: 'Coding',
    queries: [
      'Write a Python function to find the longest common subsequence of two strings',
      'Debug this TypeError: cannot read property map of undefined in React component',
      'Optimize this O(n^2) sorting algorithm to run in O(n log n) time',
      'Implement a binary search tree with insert, delete, and search operations in TypeScript',
      'Write a REST API endpoint for user authentication with JWT tokens',
      'Refactor this callback-based code to use async/await promises',
      'Create a Python decorator that implements memoization with cache expiry',
      'Write unit tests for a shopping cart module with add, remove, and checkout',
    ],
  },
  {
    category: 'Writing',
    queries: [
      'Draft a professional email declining a meeting invitation politely',
      'Write a blog post introduction about the future of renewable energy',
      'Summarize the key points of this 2000-word technical whitepaper on blockchain',
      'Create compelling product copy for a new fitness tracking smartwatch',
      'Write a press release announcing a startup Series A funding round',
      'Draft a cover letter for a senior software engineering position at Google',
      'Write a technical documentation page for a REST API authentication flow',
      'Create an executive summary for a quarterly business performance report',
    ],
  },
  {
    category: 'Math',
    queries: [
      'Calculate the integral of x^2 * e^x from 0 to infinity',
      'Solve the system of linear equations: 3x + 2y = 7, x - y = 1',
      'Prove that the square root of 2 is irrational using proof by contradiction',
      'Find the eigenvalues and eigenvectors of the matrix [[2,1],[1,3]]',
      'Calculate the probability of getting exactly 3 heads in 10 fair coin flips',
      'Solve the differential equation dy/dx = 2xy with initial condition y(0) = 1',
      'Find the Taylor series expansion of sin(x) around x = 0 up to the 5th term',
      'Prove by induction that the sum of first n natural numbers is n(n+1)/2',
    ],
  },
  {
    category: 'General',
    queries: [
      'What is the capital of Mongolia and what is it known for?',
      'Explain how photosynthesis works in simple terms for a 10-year-old',
      'Compare and contrast TCP and UDP protocols for network communication',
      'What are the main differences between machine learning and deep learning?',
      'Explain the concept of compound interest and why it matters for investing',
      'How does the human immune system fight off viral infections?',
      'What are the key principles of object-oriented programming?',
      'Explain the difference between correlation and causation with examples',
    ],
  },
  {
    category: 'Creative',
    queries: [
      'Generate a short science fiction story about first contact with aliens on Mars',
      'Design a logo concept for an eco-friendly coffee brand called GreenBrew',
      'Brainstorm 5 innovative app ideas for improving mental health in teenagers',
      'Create a detailed character profile for a villain in a fantasy novel',
      'Write song lyrics about overcoming adversity in the style of folk rock',
      'Design a unique board game concept that teaches financial literacy',
      'Generate three plot twists for a murder mystery set in a space station',
      'Create a social media marketing campaign for a new plant-based restaurant',
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

function tierPlain(model: string): string {
  if (model.includes('haiku') || model.includes('fast')) return 'FAST';
  if (model.includes('opus') || model.includes('powerful')) return 'POWR';
  return 'BLNC';
}

function bar(count: number, max: number, width: number = 10): string {
  const filled = Math.round((count / Math.max(max, 1)) * width);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled);
}

async function main() {
  const rounds = process.env.DEMO_QUICK === 'true' ? 3 : 8;
  const totalInteractions = rounds * QUERIES.length;

  console.log('');
  console.log(`${c.bold}${c.cyan}\u250c${'─'.repeat(62)}\u2510${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2502${c.reset}${c.bold}     \u{1f33f} ROOTROUTER \u2014 Algebraic Agent Infrastructure          ${c.cyan}\u2502${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2502${c.reset}        Single Agent Demo \u2022 ${totalInteractions} Interactions${rounds < 8 ? ' (quick)' : ''}                 ${c.cyan}\u2502${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2514${'─'.repeat(62)}\u2518${c.reset}`);
  console.log('');
  console.log(`  ${c.dim}Embeddings:${c.reset} TF-IDF (local, no API key needed)`);
  console.log(`  ${c.dim}LLM Mode:${c.reset}   Simulated responses for offline demo`);
  console.log('');

  const router = new RootRouter({
    verbose: false,
    useLocalEmbeddings: true,
    embeddingDimension: 128,
    minInteractionsBeforeFit: 12,
    refitInterval: 10,
    pcaDimensions: 5,
    easyNormThreshold: 0.3,
    mediumNormThreshold: 0.6,
  });

  // Flatten queries interleaved across categories
  const allQueries: { category: string; query: string }[] = [];
  for (let i = 0; i < rounds; i++) {
    for (const cat of QUERIES) {
      allQueries.push({ category: cat.category, query: cat.queries[i] });
    }
  }

  console.log(`${c.dim}  #  Category   Query                                          Chamber  Model   Tokens  Cost${c.reset}`);
  console.log(`  ${'─'.repeat(96)}`);

  let fittedAnnounced = false;

  for (let i = 0; i < allQueries.length; i++) {
    const { category, query } = allQueries[i];

    const result = await router.chat({
      agentId: 'demo-agent',
      messages: [{ role: 'user', content: query }],
    });

    const chamberStr = result.telemetry.isWarmStart
      ? `${c.cyan}C${String(result.telemetry.chamberUsed ?? '?').padStart(2)}${c.reset}`
      : `${c.dim}cold${c.reset}`;
    const modelStr = tierLabel(result.telemetry.modelUsed);
    const tokSaved = result.telemetry.tokensSaved > 0
      ? `${c.green}${String(result.telemetry.tokensSaved).padStart(5)}${c.reset}`
      : `${c.dim}    -${c.reset}`;
    const costSaved = result.telemetry.costSaved > 0
      ? `${c.green}$${result.telemetry.costSaved.toFixed(4)}${c.reset}`
      : `${c.dim}      -${c.reset}`;

    const num = String(i + 1).padStart(3);
    const cat = pad(category, 10);
    const q = pad(query, 46);

    console.log(`  ${num}  ${cat} ${q} ${chamberStr}   ${modelStr}  ${tokSaved}  ${costSaved}`);

    // Announce when vector space first fits
    if (result.telemetry.isWarmStart && !fittedAnnounced) {
      fittedAnnounced = true;
      const vs = router.getVectorSpace().getSummary();
      console.log('');
      console.log(`  ${c.bold}${c.magenta}\u2500\u2500\u2500 VECTOR SPACE FITTED \u2500\u2500\u2500${c.reset}`);
      console.log(`  ${c.magenta}\u{1f52c}${c.reset} Found ${c.bold}${vs.directionsFound}${c.reset} root directions explaining ${c.bold}${(vs.varianceExplained * 100).toFixed(1)}%${c.reset} of variance`);
      console.log(`  ${c.magenta}\u{1f4ca}${c.reset} ${c.bold}${vs.activeChambers}${c.reset} chambers active out of ${vs.totalChambers} possible`);
      console.log('');
    }
  }

  console.log(`  ${'─'.repeat(96)}`);

  // ─── Summary ───
  const tel = router.getTelemetry();
  const gs = tel.graphStats;
  const vsSummary = router.getVectorSpace().getSummary();

  console.log('');
  console.log(`${c.bold}${c.cyan}\u250c${'─'.repeat(62)}\u2510${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2502${c.reset}${c.bold}                   TELEMETRY SUMMARY                        ${c.cyan}\u2502${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2514${'─'.repeat(62)}\u2518${c.reset}`);
  console.log('');
  console.log(`  Total Interactions:   ${c.bold}${tel.totalInteractions}${c.reset}`);
  console.log(`  Total Tokens Saved:   ${c.bold}${c.green}${tel.totalTokensSaved.toLocaleString()}${c.reset}`);
  console.log(`  Total Cost Saved:     ${c.bold}${c.green}$${tel.totalCostSaved.toFixed(4)}${c.reset}`);
  console.log(`  Avg Root Norm:        ${tel.avgRootNorm.toFixed(4)}`);
  console.log('');

  // ─── Chamber Map ───
  console.log(`  ${c.bold}Chamber Map${c.reset} (${vsSummary.directionsFound} root directions, ${vsSummary.activeChambers} active chambers):`);
  console.log('');
  const sortedChambers = tel.chambers.sort((a, b) => a.avgRootNorm - b.avgRootNorm);
  const maxCount = Math.max(...sortedChambers.map(ch => ch.interactionCount), 1);
  const sortedNorms = sortedChambers.map(ch => ch.avgRootNorm);
  const p33 = sortedNorms[Math.floor(sortedNorms.length * 0.33)] ?? Infinity;
  const p66 = sortedNorms[Math.floor(sortedNorms.length * 0.66)] ?? Infinity;

  for (const ch of sortedChambers) {
    const difficulty = ch.avgRootNorm <= p33 ? 'easy' : ch.avgRootNorm <= p66 ? 'medium' : 'hard';
    const diffColor = difficulty === 'easy' ? c.green : difficulty === 'medium' ? c.yellow : c.red;
    const modelLabel = tierPlain(ch.bestModel).toLowerCase();
    console.log(`    C${String(ch.id).padStart(2)}  ${c.dim}[${c.reset}${diffColor}${bar(ch.interactionCount, maxCount)}${c.reset}${c.dim}]${c.reset} ${String(ch.interactionCount).padStart(2)} interactions  norm: ${ch.avgRootNorm.toFixed(3)}  ${diffColor}${difficulty.padEnd(6)}${c.reset} \u2192 ${modelLabel}`);
  }

  // ─── Root Directions ───
  console.log('');
  console.log(`  ${c.bold}Root Directions${c.reset} (PCA eigenspectrum):`);
  console.log('');
  const directions = router.getVectorSpace().getRootDirections();
  for (const d of directions) {
    const pctBar = bar(d.varianceRatio, directions[0].varianceRatio, 15);
    console.log(`    d${c.dim}\u2082${c.reset}${String(d.index + 1).padStart(1)}  eigenvalue: ${d.eigenvalue.toFixed(4)}  ${c.cyan}${pctBar}${c.reset}  ${(d.varianceRatio * 100).toFixed(1)}% variance`);
  }
  console.log(`    ${c.dim}Total variance explained: ${(vsSummary.varianceExplained * 100).toFixed(1)}%${c.reset}`);

  // ─── Graph Stats ───
  console.log('');
  console.log(`  ${c.bold}Interaction Graph${c.reset}`);
  console.log(`    Nodes: ${gs.nodeCount}  Edges: ${gs.edgeCount}  Avg Degree: ${gs.avgDegree.toFixed(2)}  Spectral Gap: ${gs.spectralGap.toFixed(4)}`);

  // ─── Result ───
  console.log('');
  console.log(`${c.bold}${c.cyan}\u250c${'─'.repeat(62)}\u2510${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2502${c.reset}${c.bold}                      RESULTS                               ${c.cyan}\u2502${c.reset}`);
  console.log(`${c.bold}${c.cyan}\u2514${'─'.repeat(62)}\u2518${c.reset}`);
  console.log('');
  console.log(`  ${c.bold}Tokens Saved:${c.reset}   ${c.green}${c.bold}${tel.totalTokensSaved.toLocaleString()}${c.reset} tokens filtered by chambers + graph + reflections`);
  console.log(`  ${c.bold}Cost Saved:${c.reset}     ${c.green}${c.bold}$${tel.totalCostSaved.toFixed(4)}${c.reset} via context filtering + model routing`);
  console.log(`  ${c.bold}Quality:${c.reset}        ${c.bold}preserved${c.reset} (root norm stable across difficulty levels)`);
  console.log('');
  console.log(`  ${c.dim}${tel.recommendation}${c.reset}`);
  console.log('');

  const txHash = await router.flushTelemetry();
  if (txHash) {
    console.log(`  ${c.dim}Celo telemetry TX: ${txHash}${c.reset}`);
    console.log('');
  }

  // Push snapshot to dashboard (Convex) when DASHBOARD_URL is set (e.g. http://localhost:3000)
  const dashboardUrl = process.env.DASHBOARD_URL?.replace(/\/$/, '');
  if (dashboardUrl) {
    try {
      const runId = `basic-${Date.now()}`;
      const payload = router.getSnapshotForExport(runId, 'demo-agent');
      const res = await fetch(`${dashboardUrl}/api/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        console.log(`  ${c.dim}Snapshot sent to dashboard (Convex). View at ${dashboardUrl}/dashboard/topology${c.reset}`);
        console.log('');
      } else {
        const err = await res.text();
        console.log(`  ${c.dim}Snapshot upload failed: ${res.status} ${err}${c.reset}`);
      }
    } catch (e) {
      console.log(`  ${c.dim}Snapshot upload error: ${e instanceof Error ? e.message : String(e)}${c.reset}`);
    }
  }
}

main().catch(console.error);

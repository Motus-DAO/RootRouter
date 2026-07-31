/**
 * Shared query corpora for demo/benchmark.ts and demo/benchmark-live.ts.
 *
 * Profiles:
 *   benchmark — 50 queries easy → hard (original benchmark.ts)
 *   basic     — 40 categorized queries (demo/basic.ts), interleaved
 *   swarm     — multi-agent warmup + complex tasks (demo/swarm.ts)
 *   session   — chained coding slice (builds context like a real agent task)
 */

export const BENCHMARK_QUERIES = [
  'What is the capital of France?',
  'Convert 72 degrees Fahrenheit to Celsius',
  'What does the HTTP status code 404 mean?',
  'List the primary colors',
  'What is the boiling point of water in Celsius?',
  'Define the term API in software development',
  'What is 15% of 200?',
  'Name the largest planet in our solar system',
  'What does HTML stand for?',
  'How many bytes are in a kilobyte?',
  'Explain the difference between let and const in JavaScript',
  'Write a function to reverse a string in Python',
  'What is a linked list and when would you use one?',
  'Explain how CSS flexbox alignment works with justify-content',
  'What is the difference between GET and POST HTTP methods?',
  'Implement a debounce function in JavaScript with configurable delay',
  'Explain the CAP theorem and its implications for distributed databases',
  'Write a SQL query to find the second highest salary in each department',
  'Describe the observer pattern and provide a TypeScript implementation',
  'Explain how garbage collection works in V8 JavaScript engine',
  'Implement a basic promise from scratch in TypeScript',
  'Design a URL shortener system with high availability requirements',
  'Write a recursive function to flatten a deeply nested array',
  'Explain the difference between processes and threads with examples',
  'Implement a priority queue using a binary heap data structure',
  'Design a real-time collaborative text editor architecture like Google Docs',
  'Implement a B-tree with insert and search operations for database indexing',
  'Explain the Raft consensus algorithm and implement leader election',
  'Write a compiler frontend: lexer and parser for a simple arithmetic language',
  'Design a distributed cache system with consistent hashing and replication',
  'Implement a neural network backpropagation algorithm from scratch in TypeScript',
  'Design a globally distributed database with strong consistency guarantees',
  'Implement a concurrent garbage collector with tri-color marking algorithm',
  'Write a CRDT implementation for collaborative editing with conflict resolution',
  'Design a low-latency trading system architecture handling 1M orders per second',
  'Implement a custom memory allocator with buddy system allocation strategy',
  'Design a privacy-preserving machine learning pipeline using federated learning',
  'Implement a lock-free concurrent hash map with atomic compare-and-swap',
  'Write a query optimizer for a simple SQL-like language with join reordering',
  'Design an end-to-end encrypted messaging system with forward secrecy',
  'Implement a basic operating system scheduler with multiple scheduling algorithms',
  'Design a blockchain consensus mechanism optimized for IoT device networks',
  'Write a JIT compiler for a subset of JavaScript targeting x86 assembly',
  'Implement a distributed transaction manager with two-phase commit protocol',
  'Design a self-healing microservices mesh with automatic failover and traffic shaping',
  'Implement a basic version of the PageRank algorithm for web graph analysis',
  'Design a real-time recommendation engine using collaborative filtering at scale',
  'Write a network protocol for reliable ordered message delivery over UDP',
  'Implement a basic OLAP cube with slice, dice, and rollup operations',
  'Design an auto-scaling system that predicts load using time-series forecasting',
];

export const BASIC_CATEGORIES: { category: string; queries: string[] }[] = [
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

/** Chained coding slice — mimics a real agent session with growing context. */
export const CODING_SLICE_SESSION = [
  'Design a REST API for a todo application with auth, tags, and due dates',
  'Implement Express routes and Prisma models for the todo API',
  'Add integration tests for the todo API authentication middleware',
  'The JWT refresh test fails intermittently — debug the token rotation logic',
  'Refactor duplicated validation into shared Zod schemas',
  'Document the API with OpenAPI examples for each endpoint',
  'Add rate limiting middleware on auth and write endpoints',
  'Profile the slow list endpoint and propose database indexes',
  'Implement cursor-based pagination for the todo list endpoint',
  'Add WebSocket notifications when todos are assigned to collaborators',
  'Harden error handling and map domain errors to consistent HTTP responses',
  'Write a migration plan from SQLite to Postgres for this todo service',
];

export const SWARM_AGENT_QUERIES: Record<string, string[]> = {
  planner: [
    'Design a microservices architecture for an e-commerce platform',
    'Create a project timeline for mobile app development with milestones',
    'Plan the migration strategy from monolith to microservices',
    'Design the database schema for a social media application',
    'Create a risk assessment matrix for cloud infrastructure migration',
    'Plan the CI/CD pipeline for a multi-team development workflow',
    'Design the API versioning strategy for backward compatibility',
    'Create a capacity planning model for expected 10x user growth',
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
  ],
};

export const SWARM_COMPLEX_TASKS: {
  name: string;
  subtasks: { agent: string; query: string }[];
}[] = [
  {
    name: 'Build a REST API for a todo app',
    subtasks: [
      { agent: 'planner', query: 'Design the REST API structure, endpoints, and data model for a full-featured todo application' },
      { agent: 'coder', query: 'Implement the Express REST API with CRUD endpoints, authentication middleware, and database models for todos' },
      { agent: 'researcher', query: 'Research best practices for REST API design, pagination patterns, and error handling standards' },
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
    name: 'Security audit and hardening',
    subtasks: [
      { agent: 'researcher', query: 'Research OWASP Top 10 vulnerabilities and audit checklist for Node.js web applications' },
      { agent: 'planner', query: 'Create a security hardening plan with priority-ranked fixes, timeline, and compliance verification steps' },
      { agent: 'coder', query: 'Implement security fixes: input sanitization, CSRF protection, rate limiting, and Content Security Policy headers' },
    ],
  },
  {
    name: 'Real-time analytics dashboard',
    subtasks: [
      { agent: 'planner', query: 'Design the real-time analytics architecture: data ingestion, stream processing, and dashboard wireframes' },
      { agent: 'coder', query: 'Implement the WebSocket-based dashboard with D3.js charts, live counters, and configurable time windows' },
      { agent: 'researcher', query: 'Compare stream processing engines Kafka Streams vs Flink vs Spark Streaming for real-time analytics' },
    ],
  },
  {
    name: 'Competitor pricing analysis',
    subtasks: [
      { agent: 'researcher', query: 'Research and compile competitor pricing data, market positioning, and value propositions in the SaaS space' },
      { agent: 'planner', query: 'Create a competitive analysis framework with pricing tiers, feature comparison matrix, and positioning map' },
      { agent: 'coder', query: 'Build a spreadsheet automation tool that scrapes public pricing pages and generates comparison charts' },
    ],
  },
];

export type LiveProfile = 'benchmark' | 'basic' | 'swarm' | 'session';

export interface LiveQueryStep {
  agentId: string;
  query: string;
  category?: string;
  task?: string;
}

/** Interleave categories like demo/basic.ts (rounds × 5 categories). */
export function flattenBasicQueries(rounds: number): LiveQueryStep[] {
  const steps: LiveQueryStep[] = [];
  const maxPerCategory = BASIC_CATEGORIES[0].queries.length;
  const r = Math.max(1, Math.min(rounds, maxPerCategory));
  for (let i = 0; i < r; i++) {
    for (const cat of BASIC_CATEGORIES) {
      steps.push({
        agentId: 'basic-agent',
        query: cat.queries[i],
        category: cat.category,
      });
    }
  }
  return steps;
}

/** Swarm warmup (agents rotate) + complex task subtasks. */
export function buildSwarmLiveSteps(opts: { warmupRounds: number; taskCount: number }): LiveQueryStep[] {
  const agents = ['planner', 'coder', 'researcher'];
  const steps: LiveQueryStep[] = [];
  for (let i = 0; i < opts.warmupRounds; i++) {
    for (const agent of agents) {
      const q = SWARM_AGENT_QUERIES[agent][i];
      if (q) steps.push({ agentId: agent, query: q, category: 'warmup' });
    }
  }
  for (let t = 0; t < opts.taskCount && t < SWARM_COMPLEX_TASKS.length; t++) {
    const task = SWARM_COMPLEX_TASKS[t];
    for (const sub of task.subtasks) {
      steps.push({ agentId: sub.agent, query: sub.query, task: task.name });
    }
  }
  return steps;
}

export function resolveLiveSteps(opts: {
  profile: LiveProfile;
  queries?: number;
  rounds?: number;
  quick?: boolean;
}): { profile: LiveProfile; steps: LiveQueryStep[]; description: string } {
  const quick = opts.quick ?? process.env.DEMO_QUICK === 'true';

  switch (opts.profile) {
    case 'session': {
      const n = opts.queries ?? (quick ? 6 : CODING_SLICE_SESSION.length);
      const steps = CODING_SLICE_SESSION.slice(0, n).map((query, i) => ({
        agentId: 'slice-agent',
        query,
        category: i === 0 ? 'kickoff' : 'follow-up',
      }));
      return {
        profile: 'session',
        steps,
        description: `Chained coding slice — ${steps.length} turns on one todo API task`,
      };
    }
    case 'basic': {
      const rounds = opts.rounds ?? (quick ? 3 : 8);
      const steps = flattenBasicQueries(rounds);
      return {
        profile: 'basic',
        steps,
        description: `Basic demo — ${rounds} rounds × 5 categories (${steps.length} interactions)`,
      };
    }
    case 'swarm': {
      const warmupRounds = quick ? 3 : 5;
      const taskCount = quick ? 2 : 3;
      const steps = buildSwarmLiveSteps({ warmupRounds, taskCount });
      return {
        profile: 'swarm',
        steps,
        description: `Swarm demo — ${warmupRounds} warmup rounds × 3 agents + ${taskCount} complex tasks`,
      };
    }
    case 'benchmark':
    default: {
      const n = opts.queries ?? (quick ? 15 : BENCHMARK_QUERIES.length);
      const steps = BENCHMARK_QUERIES.slice(0, n).map((query) => ({
        agentId: 'benchmark-agent',
        query,
      }));
      return {
        profile: 'benchmark',
        steps,
        description: `Benchmark corpus — ${steps.length} queries (easy → distributed systems)`,
      };
    }
  }
}

// E2E: two-request stateful session — request 2 recalls context from request 1 store.
// Run: node test/e2e-stateful.mjs
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, '..', 'dist', 'server.js');
const storePath = path.join(os.tmpdir(), `rootrouter-e2e-stateful-${Date.now()}.json`);

let failed = 0;
const assert = (c, n) => {
  console.log(`  ${c ? 'PASS' : 'FAIL'}: ${n}`);
  if (!c) failed++;
};

function long(s) {
  return (s + ' ').repeat(8).trim();
}

const FAKE_PORT = 8921;
const PROXY_PORT = 8922;

const receivedBodies = [];

const upstream = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    let messages = [];
    try {
      messages = JSON.parse(body).messages ?? [];
    } catch {}
    receivedBodies.push(messages);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'ok' } }] }));
  });
});

await new Promise((r) => upstream.listen(FAKE_PORT, r));

const proxy = spawn('node', [serverPath], {
  env: {
    ...process.env,
    PORT: String(PROXY_PORT),
    ROOTROUTER_UPSTREAM_ORIGIN: `http://localhost:${FAKE_PORT}`,
    ROOTROUTER_STORE_PATH: storePath,
    ROOTROUTER_MIN_TOKENS_TO_FILTER: '50',
    ROOTROUTER_CONTEXT_BUDGET: '120',
    ROOTROUTER_STORE_SHARE: '0.8',
    ROOTROUTER_MMR_LAMBDA: '1',
  },
  stdio: ['ignore', 'inherit', 'inherit'],
});

async function waitReady() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://localhost:${PROXY_PORT}/healthz`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('proxy did not start');
}

try {
  await waitReady();
  console.log('\n=== Stateful proxy E2E (two requests) ===');

  const session1 = [
    { role: 'system', content: long('system instruction') },
    { role: 'user', content: long('quicksort algorithm pivot partition implementation details') },
    { role: 'assistant', content: long('quicksort uses pivot selection and partitions elements around the pivot') },
    { role: 'user', content: long('chocolate chip cookie recipe butter brown sugar baking') },
    { role: 'assistant', content: long('mix butter sugar add chips bake until golden') },
    { role: 'user', content: 'help me code a sorting function' },
  ];

  await fetch(`http://localhost:${PROXY_PORT}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-rootrouter-agent-id': 'e2e-stateful' },
    body: JSON.stringify({ model: 'x', messages: session1 }),
  });

  const session2 = [
    { role: 'system', content: long('system instruction') },
    { role: 'user', content: 'continue the quicksort partition implementation we discussed' },
  ];

  const resp2 = await fetch(`http://localhost:${PROXY_PORT}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-rootrouter-agent-id': 'e2e-stateful' },
    body: JSON.stringify({ model: 'x', messages: session2 }),
  });

  const recalled = Number(resp2.headers.get('x-rootrouter-store-recalled') ?? '0');
  const lastBody = receivedBodies[receivedBodies.length - 1] ?? [];
  const text = lastBody.map((m) => m.content).join(' ');

  assert(recalled > 0, `store recalled header > 0 (got ${recalled})`);
  assert(lastBody.length > session2.length, 'request 2 prompt grew with injected store context');
  assert(
    /quicksort|partition|pivot|sorting/i.test(text),
    `request 2 includes sorting context (got: ${text.slice(0, 200)}...)`
  );
  assert(fs.existsSync(storePath), 'store file persisted on disk');

  console.log(`\nTotal: ${failed === 0 ? 'all stateful e2e checks passed' : failed + ' FAILED'}`);
} finally {
  proxy.kill('SIGTERM');
  upstream.close();
  try {
    fs.unlinkSync(storePath);
  } catch {}
}

process.exit(failed === 0 ? 0 : 1);

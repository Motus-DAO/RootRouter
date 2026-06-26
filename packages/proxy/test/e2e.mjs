// End-to-end proxy test: fake upstream + real proxy process.
// Verifies the proxy trims messages and forwards them, with the savings header set.
// Run: node test/e2e.mjs
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, '..', 'dist', 'server.js');

let failed = 0;
const assert = (c, n) => { console.log(`  ${c ? 'PASS' : 'FAIL'}: ${n}`); if (!c) failed++; };

const FAKE_PORT = 8911;
const PROXY_PORT = 8912;

// Fake upstream: echoes how many messages it actually received.
const upstream = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    let count = -1;
    try { count = JSON.parse(body).messages.length; } catch {}
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ received: count, choices: [{ message: { role: 'assistant', content: 'ok' } }] }));
  });
});

function long(s) { return (s + ' ').repeat(8).trim(); }

await new Promise((r) => upstream.listen(FAKE_PORT, r));

const proxy = spawn('node', [serverPath], {
  env: {
    ...process.env,
    PORT: String(PROXY_PORT),
    ROOTROUTER_UPSTREAM_ORIGIN: `http://localhost:${FAKE_PORT}`,
    ROOTROUTER_MIN_TOKENS_TO_FILTER: '50',
    ROOTROUTER_CONTEXT_BUDGET: '60',
    ROOTROUTER_MMR_LAMBDA: '1',
  },
  stdio: ['ignore', 'inherit', 'inherit'],
});

// Wait for the proxy to be listening.
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
  console.log('\n=== Proxy E2E ===');

  const original = [
    { role: 'system', content: long('system instruction stays') },
    { role: 'user', content: long('quicksort and mergesort sorting algorithm complexity') },
    { role: 'assistant', content: long('quicksort uses a pivot and mergesort merges halves') },
    { role: 'user', content: long('chocolate chip cookie recipe with brown sugar and butter') },
    { role: 'assistant', content: long('cream the butter then add chips') },
    { role: 'user', content: long('history of the Roman empire and its emperors timeline') },
    { role: 'assistant', content: long('Augustus became the first emperor of Rome') },
    { role: 'user', content: 'help me implement a sorting algorithm in code' },
  ];

  const resp = await fetch(`http://localhost:${PROXY_PORT}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer test-key' },
    body: JSON.stringify({ model: 'x', messages: original }),
  });
  const saved = Number(resp.headers.get('x-rootrouter-tokens-saved') ?? '0');
  const data = await resp.json();

  assert(resp.status === 200, 'proxy returns 200 from upstream');
  assert(saved > 0, `savings header set (saved=${saved})`);
  assert(data.received > 0 && data.received < original.length, `upstream received trimmed messages (${data.received} < ${original.length})`);

  // Disabled via header => no trimming.
  const resp2 = await fetch(`http://localhost:${PROXY_PORT}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-rootrouter-disable': 'true' },
    body: JSON.stringify({ model: 'x', messages: original }),
  });
  const data2 = await resp2.json();
  assert(data2.received === original.length, 'x-rootrouter-disable bypasses trimming');

  console.log(`\nTotal: ${failed === 0 ? 'all e2e checks passed' : failed + ' FAILED'}`);
} finally {
  proxy.kill('SIGTERM');
  upstream.close();
}

process.exit(failed === 0 ? 0 : 1);

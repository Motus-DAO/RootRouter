// MCP smoke test: spawn the built server over stdio, record context, select, and
// verify tokensSaved > 0. Run: node test/smoke.mjs
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, '..', 'dist', 'server.js');
const storePath = path.join(os.tmpdir(), `rootrouter-smoke-${Date.now()}.json`);
const auditPath = path.join(os.tmpdir(), `rootrouter-smoke-audit-${Date.now()}.jsonl`);

let failed = 0;
function assert(cond, name) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}: ${name}`);
  if (!cond) failed++;
}

const transport = new StdioClientTransport({
  command: 'node',
  args: [serverPath],
  env: {
    ...process.env,
    ROOTROUTER_STORE_PATH: storePath,
    ROOTROUTER_SELECTIONS_LOG_PATH: auditPath,
    EMBEDDING_API_KEY: '',
    EMBEDDING_PROVIDER: 'tfidf',
  },
});
const client = new Client({ name: 'smoke', version: '0.0.0' });

try {
  await client.connect(transport);
  console.log('\n=== MCP smoke test ===');

  const tools = await client.listTools();
  const names = tools.tools.map((t) => t.name);
  assert(names.includes('record_context'), 'record_context tool listed');
  assert(names.includes('select_context'), 'select_context tool listed');
  assert(names.includes('select_for_spec'), 'select_for_spec tool listed');
  assert(names.includes('stats'), 'stats tool listed');
  assert(names.includes('list_selections'), 'list_selections tool listed');

  const rec = await client.callTool({
    name: 'record_context',
    arguments: {
      items: [
        { id: 'r1', text: 'Binary search tree insert and delete in TypeScript with generics', kind: 'doc' },
        { id: 'r2', text: 'Chocolate chip cookie recipe with brown sugar and butter', kind: 'doc' },
        { id: 'r3', text: 'Quicksort vs mergesort time complexity and stability', kind: 'doc' },
        { id: 'r4', text: 'The fall of the Roman empire and its emperors', kind: 'doc' },
        { id: 'r5', text: 'Implementing a hash map with open addressing in code', kind: 'doc' },
      ],
    },
  });
  assert(rec.structuredContent?.recorded === 5, 'recorded 5 items');

  const sel = await client.callTool({
    name: 'select_context',
    arguments: { query: 'help me implement a sorting algorithm in code', tokenBudget: 30 },
  });
  const sc = sel.structuredContent;
  assert(!!sc && sc.tokensSaved > 0, 'select_context reports tokensSaved > 0');
  assert(sc.selected.length > 0 && sc.selected.length < 5, 'selected a relevant subset within budget');
  assert(sc.tokensOut <= 30 || sc.selected.length === 1, 'selected tokens within budget');

  const stats = await client.callTool({ name: 'stats', arguments: {} });
  assert(stats.structuredContent?.items === 5, 'stats reports 5 stored items');
  assert(stats.structuredContent?.selections === 1, 'stats reports 1 selection');

  const audit = await client.callTool({ name: 'list_selections', arguments: { limit: 5 } });
  assert(audit.structuredContent?.entries?.length === 1, 'list_selections returns 1 audit entry');
  assert(audit.structuredContent?.summary?.totalTokensSaved > 0, 'audit summary has savings');

  console.log(`\nTotal: ${failed === 0 ? 'all smoke checks passed' : failed + ' FAILED'}`);
} finally {
  await client.close();
  try { fs.unlinkSync(storePath); } catch {}
  try { fs.unlinkSync(auditPath); } catch {}
}

process.exit(failed === 0 ? 0 : 1);

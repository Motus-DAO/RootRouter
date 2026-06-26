#!/usr/bin/env node
/**
 * RootRouter transparent proxy (stateful).
 *
 * OpenAI-compatible HTTP proxy: point any agent's `base_url` at it and it trims prompt
 * context before forwarding upstream. With a file-backed ContextEngine, it also recalls
 * relevant prior turns across requests — zero agent code changes.
 */
import * as http from 'http';
import { Readable } from 'stream';
import { filterMessages, type ChatMessage } from './filter.js';
import { getEngine, initEngine, resolveStorePath } from './engine.js';

const PORT = Number(process.env.PORT ?? 8787);
const UPSTREAM_ORIGIN = (process.env.ROOTROUTER_UPSTREAM_ORIGIN ?? 'https://openrouter.ai').replace(/\/$/, '');
const CONTEXT_BUDGET = Number(process.env.ROOTROUTER_CONTEXT_BUDGET ?? 4000);
const MIN_TOKENS_TO_FILTER = Number(process.env.ROOTROUTER_MIN_TOKENS_TO_FILTER ?? 6000);
const MMR_LAMBDA = process.env.ROOTROUTER_MMR_LAMBDA ? Number(process.env.ROOTROUTER_MMR_LAMBDA) : undefined;
const STORE_SHARE = process.env.ROOTROUTER_STORE_SHARE
  ? Number(process.env.ROOTROUTER_STORE_SHARE)
  : 0.5;
const BASELINE_WINDOW = Number(process.env.ROOTROUTER_BASELINE_WINDOW ?? 20);

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
]);

function readBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function isChatCompletions(req: http.IncomingMessage): boolean {
  return req.method === 'POST' && !!req.url && req.url.includes('/chat/completions');
}

function buildForwardHeaders(req: http.IncomingMessage, bodyLen: number): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    if (HOP_BY_HOP.has(k.toLowerCase())) continue;
    headers[k] = Array.isArray(v) ? v.join(', ') : v;
  }
  headers['content-length'] = String(bodyLen);
  return headers;
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = req.url ?? '/';

  if (req.method === 'GET' && (url === '/healthz' || url === '/')) {
    const engine = getEngine();
    const stats = engine.stats();
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        upstream: UPSTREAM_ORIGIN,
        contextBudget: CONTEXT_BUDGET,
        storePath: resolveStorePath(),
        storeItems: stats.items,
        stateful: true,
      })
    );
    return;
  }

  const rawBody = await readBody(req);
  let outBody: Buffer = rawBody;
  let savedHeader = '0';
  let storeRecalledHeader = '0';

  const disabled = (req.headers['x-rootrouter-disable'] ?? '').toString().toLowerCase() === 'true';
  const agentId = (req.headers['x-rootrouter-agent-id'] ?? 'default').toString();
  const recallFeedbackHeader = (req.headers['x-rootrouter-recall-feedback'] ?? '')
    .toString()
    .toLowerCase();

  if (isChatCompletions(req) && rawBody.length > 0 && !disabled) {
    try {
      const parsed = JSON.parse(rawBody.toString('utf8')) as { messages?: ChatMessage[] };
      if (Array.isArray(parsed.messages)) {
        const budgetHeader = req.headers['x-rootrouter-budget'];
        const contextBudget = budgetHeader ? Number(budgetHeader) || CONTEXT_BUDGET : CONTEXT_BUDGET;

        const outcome = await filterMessages(parsed.messages, {
          contextBudget,
          minTokensToFilter: MIN_TOKENS_TO_FILTER,
          mmrLambda: MMR_LAMBDA,
          engine: getEngine(),
          agentId,
          storeShare: STORE_SHARE,
          baseline: 'window',
          baselineWindowSize: BASELINE_WINDOW,
          recallFeedback: recallFeedbackHeader === 'down' ? 'down' : undefined,
          onRecallFeedback: (payload) => {
            console.error(
              `[rootrouter-proxy] recall feedback down agent=${payload.agentId} ` +
                `dropped_msgs=[${payload.droppedMessageIndices.join(',')}] ` +
                `dropped_store=[${payload.droppedStoreIds.join(',')}]`
            );
          },
        });

        if (outcome.filtered) {
          parsed.messages = outcome.messages;
          outBody = Buffer.from(JSON.stringify(parsed), 'utf8');
          savedHeader = String(outcome.tokensSaved);
          storeRecalledHeader = String(outcome.storeRecalled ?? 0);
          const droppedMsg =
            outcome.droppedMessageIndices && outcome.droppedMessageIndices.length > 0
              ? ` dropped_msgs=[${outcome.droppedMessageIndices.join(',')}]`
              : '';
          const droppedStore =
            outcome.droppedStoreIds && outcome.droppedStoreIds.length > 0
              ? ` dropped_store=${outcome.droppedStoreIds.length}`
              : '';
          console.error(
            `[rootrouter-proxy] trimmed ${outcome.tokensBefore}->${outcome.tokensAfter} tokens ` +
              `(saved ${outcome.tokensSaved}; kept ${outcome.keptCandidates}/${outcome.totalCandidates}; ` +
              `store recalled ${outcome.storeRecalled ?? 0})${droppedMsg}${droppedStore}`
          );
        } else {
          // Still persisted turns even when below trim threshold.
          await getEngine().save();
        }
      }
    } catch (err) {
      console.error('[rootrouter-proxy] filter skipped:', err instanceof Error ? err.message : String(err));
      outBody = rawBody;
    }
  }

  const target = `${UPSTREAM_ORIGIN}${url}`;
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: buildForwardHeaders(req, outBody.length),
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : outBody,
    });
  } catch (err) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        error: { message: `Upstream fetch failed: ${err instanceof Error ? err.message : String(err)}` },
      })
    );
    return;
  }

  const respHeaders: Record<string, string> = {};
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    respHeaders[key] = value;
  });
  respHeaders['x-rootrouter-tokens-saved'] = savedHeader;
  respHeaders['x-rootrouter-store-recalled'] = storeRecalledHeader;

  res.writeHead(upstream.status, respHeaders);

  if (upstream.body) {
    Readable.fromWeb(upstream.body as unknown as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
  } else {
    res.end();
  }
}

async function main() {
  await initEngine();
  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error('[rootrouter-proxy] handler error:', err);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'proxy internal error' } }));
    });
  });

  server.listen(PORT, () => {
    console.error(`[rootrouter-proxy] listening on http://localhost:${PORT} -> ${UPSTREAM_ORIGIN}`);
    console.error(`[rootrouter-proxy] store=${resolveStorePath()} contextBudget=${CONTEXT_BUDGET} storeShare=${STORE_SHARE}`);
  });
}

main().catch((err) => {
  console.error('[rootrouter-proxy] fatal:', err);
  process.exit(1);
});

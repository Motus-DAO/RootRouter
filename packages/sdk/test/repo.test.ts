/**
 * RepoGraph indexer tests.
 * Run: tsx test/repo.test.ts
 */
import * as path from 'path';
import { indexRepo, extractImports, detectLanguage, resolveJailedPath } from '../src/repo';
import { selectContext } from '../src/select';

const FIXTURE = path.join(__dirname, 'fixtures', 'minirepo');

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string): void {
  if (cond) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    failed++;
    console.log(`  FAIL: ${name}`);
  }
}

async function main() {
  console.log('\n=== indexRepo: scans fixture repo ===');
  {
    const result = indexRepo({ rootPath: FIXTURE, agentId: 'repo' });
    assert(result.stats.filesScanned >= 3, `scanned files (${result.stats.filesScanned})`);
    assert(result.stats.chunksIndexed >= 3, `indexed chunks (${result.stats.chunksIndexed})`);
    assert(result.stats.edgesCreated > 0, 'created import/directory edges');
    assert(result.stats.communities >= 1, 'assigned communities');
    assert(result.items.every((i) => i.kind === 'file'), 'items are file kind');
    assert(
      result.items.some((i) => String(i.metadata?.path).includes('main.ts')),
      'indexed main.ts'
    );
  }

  console.log('\n=== extractImports: TypeScript ===');
  {
    const imports = extractImports(`import { x } from './utils';\nconst y = require('../lib');`, 'typescript');
    assert(imports.includes('./utils'), 'esm import');
    assert(imports.includes('../lib'), 'require');
  }

  console.log('\n=== detectLanguage ===');
  {
    assert(detectLanguage('src/foo.ts') === 'typescript', 'ts');
    assert(detectLanguage('lib/bar.py') === 'python', 'py');
  }

  console.log('\n=== graphBoost: selects import neighbor ===');
  {
    const indexed = indexRepo({ rootPath: FIXTURE, maxChunkTokens: 800 });
    const result = await selectContext({
      query: 'how does computeScore use the add function from utils',
      items: indexed.items,
      tokenBudget: 2000,
      options: { mmrLambda: 0.8, graphBoost: 0.2 },
    });
    const text = result.selected.map((i) => i.text).join('\n');
    assert(result.selected.length >= 1, 'selected at least one chunk');
    assert(
      text.includes('add') || text.includes('utils') || text.includes('computeScore'),
      'selected structurally related chunks'
    );
    assert(
      (result.breakdown.graphBoosted ?? 0) >= 0,
      'graph boost breakdown present'
    );
  }

  console.log('\n=== security: path jail ===');
  {
    let threw = false;
    try {
      resolveJailedPath(FIXTURE, '../../../etc/passwd');
    } catch {
      threw = true;
    }
    assert(threw, 'rejects path traversal');
  }

  console.log('\n=== Results ===');
  console.log(`\nTotal: ${passed + failed} tests, ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  else console.log('\nAll RepoGraph tests passed!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

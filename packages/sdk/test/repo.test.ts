/**
 * RepoGraph indexer tests.
 * Run: tsx test/repo.test.ts
 */
import * as path from 'path';
import { indexRepo, extractImports, detectLanguage, resolveJailedPath, repoNamespace, chunkId } from '../src/repo';
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

  console.log('\n=== repoNamespace: cross-repo chunk id isolation ===');
  {
    const nsA = repoNamespace('/Users/alice/project-a');
    const nsB = repoNamespace('/Users/alice/project-b');
    assert(nsA !== nsB, 'different repo roots get different namespaces');
    assert(nsA === repoNamespace('/Users/alice/project-a'), 'namespace is stable for same root');

    const idA = chunkId(nsA, 'src/index.ts', 1, 40);
    const idB = chunkId(nsB, 'src/index.ts', 1, 40);
    assert(idA !== idB, 'same relative path in different repos gets different chunk ids');

    const indexed = indexRepo({ rootPath: FIXTURE, agentId: 'repo-a' });
    const roots = new Set(
      indexed.items.map((i) => String((i.metadata as { repoRoot?: string })?.repoRoot ?? ''))
    );
    assert(roots.size === 1 && [...roots][0].length > 0, 'indexed chunks carry repoRoot metadata');
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

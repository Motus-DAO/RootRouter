/**
 * Tests for spec-native selection helpers.
 * Run with: tsx test/spec.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  buildQueryFromSpec,
  buildSelectionFromSpec,
  extractAnchorPaths,
  extractAcceptanceCriteria,
  inferPathPrefix,
  parseSpec,
  pathMentionedInSpec,
  selectContext,
} from '../src';
import type { ContextItem } from '../src';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string): void {
  if (condition) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    failed++;
    console.log(`  FAIL: ${name}`);
  }
}

const fixturePath = path.join(__dirname, 'fixtures', 'academy-slice-4.md');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');

function item(id: string, text: string, extra: Partial<ContextItem> = {}): ContextItem {
  return { id, text, ...extra };
}

async function main() {
  console.log('\n=== parseSpec fixture ===');
  {
    const parsed = parseSpec(fixtureText);
    assert(parsed.title?.includes('Slice 4') === true, 'extracts title');
    assert(parsed.acceptanceCriteria.length >= 3, 'extracts acceptance criteria bullets');
    assert(parsed.anchorPaths.some((p) => p.includes('LessonPlayer.tsx')), 'finds LessonPlayer path');
    assert(parsed.pathPrefix === 'apps/academy', 'infers common apps/academy prefix');
  }

  console.log('\n=== buildQueryFromSpec ===');
  {
    const query = buildQueryFromSpec(fixtureText);
    assert(query.includes('Slice 4'), 'query includes slice title');
    assert(/LessonPlayer|progress/i.test(query), 'query includes lesson player context');
    assert(query.length > 40, 'query is substantive');
  }

  console.log('\n=== buildSelectionFromSpec ===');
  {
    const hints = buildSelectionFromSpec(fixturePath);
    assert(hints.specPath.endsWith('academy-slice-4.md'), 'resolves spec path');
    assert(hints.specPaths.length >= 2, 'carries anchor paths');
    assert(!!hints.pathPrefix?.startsWith('apps/academy'), 'path prefix for monorepo scope');
  }

  console.log('\n=== pathMentionedInSpec ===');
  {
    const anchors = extractAnchorPaths(fixtureText);
    assert(
      pathMentionedInSpec('apps/academy/components/LessonPlayer.tsx', anchors),
      'full path matches anchor'
    );
    assert(pathMentionedInSpec('apps/waap/onboarding.tsx', anchors) === false, 'unrelated path excluded');
  }

  console.log('\n=== specBoost in selection ===');
  {
    const anchors = extractAnchorPaths(fixtureText);
    const items: ContextItem[] = [
      item('lesson', 'lesson player progress bar cache invalidation watch position', {
        metadata: { path: 'apps/academy/components/LessonPlayer.tsx' },
      }),
      item('waap', 'wallet onboarding smart account WaaP registration flow', {
        metadata: { path: 'apps/waap/onboarding/StepBlockchain.tsx' },
      }),
    ];
    const boosted = await selectContext({
      query: buildQueryFromSpec(fixtureText),
      items,
      tokenBudget: 10_000,
      options: { specPaths: anchors, mmrLambda: 1 },
    });
    assert(boosted.breakdown.specBoosted === 1, 'one spec anchor boosted');
    assert(boosted.selected[0]?.id === 'lesson', 'spec anchor ranks first');
  }

  console.log('\n=== Results ===');
  console.log(`\nTotal: ${passed + failed} tests, ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('\nAll spec tests passed!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

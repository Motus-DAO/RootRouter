import { createHash } from 'crypto';

/** Stable SHA-256 content hash for embedding cache keys. */
export function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

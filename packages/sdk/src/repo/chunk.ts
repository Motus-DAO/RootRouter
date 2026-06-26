import { estimateTokens } from '../math/vectors';

export interface FileChunk {
  startLine: number;
  endLine: number;
  text: string;
}

/**
 * Split file content into line-based chunks that fit roughly within maxChunkTokens.
 */
export function chunkFileContent(content: string, maxChunkTokens: number = 400): FileChunk[] {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return [];

  const chunks: FileChunk[] = [];
  let start = 0;
  let buf: string[] = [];
  let tokens = 0;

  const flush = (endLine: number) => {
    if (buf.length === 0) return;
    chunks.push({
      startLine: start + 1,
      endLine: endLine + 1,
      text: buf.join('\n'),
    });
    buf = [];
    tokens = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTokens = estimateTokens(line);
    if (buf.length > 0 && tokens + lineTokens > maxChunkTokens) {
      flush(i - 1);
      start = i;
    }
    buf.push(line);
    tokens += lineTokens;
  }
  flush(lines.length - 1);
  return chunks;
}

/**
 * Local telemetry fallback when Celo is not configured.
 * Appends entries to logs/telemetry-local.jsonl so telemetry is not lost and the app does not crash.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { TelemetryEntry } from '../types';

const DEFAULT_LOG_DIR = path.join(process.cwd(), 'logs');
const DEFAULT_LOG_FILE = path.join(DEFAULT_LOG_DIR, 'telemetry-local.jsonl');

let logPath = DEFAULT_LOG_FILE;

export function setLocalTelemetryPath(p: string): void {
  logPath = p;
}

export function getLocalTelemetryPath(): string {
  return logPath;
}

/** In-memory buffer + optional file append. flush() writes buffer to file and clears it. */
export class LocalTelemetryFallback {
  private buffer: TelemetryEntry[] = [];

  queue(entry: TelemetryEntry): void {
    this.buffer.push(entry);
  }

  async flush(): Promise<string | null> {
    if (this.buffer.length === 0) return null;
    try {
      const dir = path.dirname(logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const lines = this.buffer.map(e => JSON.stringify(e) + '\n').join('');
      fs.appendFileSync(logPath, lines, 'utf8');
      this.buffer = [];
      return `local:${logPath}`;
    } catch {
      return null;
    }
  }

  isConfigured(): boolean {
    return true;
  }
}

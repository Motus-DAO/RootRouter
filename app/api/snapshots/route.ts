import { NextResponse } from 'next/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '../../../convex/_generated/api';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { runId?: string; agentId?: string; snapshot?: unknown };
    const { runId, agentId, snapshot } = body;
    if (typeof runId !== 'string' || typeof agentId !== 'string' || snapshot == null) {
      return NextResponse.json(
        { error: 'Missing or invalid runId, agentId, or snapshot' },
        { status: 400 }
      );
    }
    const id = await fetchMutation(api.runSnapshots.saveRunSnapshot, {
      runId,
      agentId,
      snapshot,
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error('Snapshot API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save snapshot' },
      { status: 500 }
    );
  }
}

/**
 * Dependencies and context for chat pipeline stages.
 * Allows injecting mocks in tests.
 */
import type { RootPairCollector } from '../core/collector';
import type { StructuredVectorSpace } from '../core/vectorSpace';
import type { InteractionGraph } from '../core/graph';
import type { AgentTopologyGraph } from '../core/agentGraph';
import type { ContextFilter } from '../core/contextFilter';
import type { ModelRouter } from '../core/router';
import type { RouterConfig } from '../types';
import type { TelemetryEntry } from '../types';

/** Minimal telemetry sink: queue and optional flush (Celo or local fallback) */
export interface ITelemetrySink {
  queue(entry: TelemetryEntry): void;
  flush(): Promise<string | null>;
  isConfigured(): boolean;
}

export interface ChatPipelineDeps {
  collector: RootPairCollector;
  vectorSpace: StructuredVectorSpace;
  interactionGraph: InteractionGraph;
  agentGraph: AgentTopologyGraph;
  contextFilter: ContextFilter;
  modelRouter: ModelRouter;
  config: RouterConfig;
  telemetry: ITelemetrySink;
}

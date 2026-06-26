import { Vector } from '../../types';
import { EmbeddingProvider } from '../types';

export type LocalEmbeddingModel = 'minilm' | 'bge-small';

const MODEL_IDS: Record<LocalEmbeddingModel, string> = {
  minilm: 'Xenova/all-MiniLM-L6-v2',
  'bge-small': 'Xenova/bge-small-en-v1.5',
};

/** Default output dimensions per model (MiniLM=384, bge-small=384). */
const MODEL_DIMS: Record<LocalEmbeddingModel, number> = {
  minilm: 384,
  'bge-small': 384,
};

/**
 * Optional local embedding provider backed by ONNX models via @xenova/transformers.
 *
 * Install peer dependency: `npm install @xenova/transformers`
 * Set `EMBEDDING_PROVIDER=local` and optionally `EMBEDDING_LOCAL_MODEL=minilm|bge-small`.
 */
export class LocalOnnxEmbeddingProvider implements EmbeddingProvider {
  readonly dimension: number;
  private modelId: string;
  private pipe: { (text: string, opts?: { pooling: string; normalize: boolean }): Promise<{ data: Float32Array }> } | null = null;
  private loading: Promise<void> | null = null;

  constructor(model: LocalEmbeddingModel = 'minilm') {
    this.modelId = MODEL_IDS[model];
    this.dimension = MODEL_DIMS[model];
  }

  async embed(text: string): Promise<Vector> {
    await this.ensurePipeline();
    const out = await this.pipe!(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data);
  }

  async embedBatch(texts: string[]): Promise<Vector[]> {
    if (texts.length === 0) return [];
    await this.ensurePipeline();
    const vecs: Vector[] = [];
    for (const text of texts) {
      vecs.push(await this.embed(text));
    }
    return vecs;
  }

  private async ensurePipeline(): Promise<void> {
    if (this.pipe) return;
    if (!this.loading) {
      this.loading = this.loadPipeline();
    }
    await this.loading;
  }

  private async loadPipeline(): Promise<void> {
    type TransformersModule = {
      pipeline: (
        task: string,
        model: string
      ) => Promise<(text: string, opts?: { pooling: string; normalize: boolean }) => Promise<{ data: Float32Array }>>;
    };
    let transformers: TransformersModule;
    try {
      transformers = (await import('@xenova/transformers' as string)) as TransformersModule;
    } catch {
      throw new Error(
        'LocalOnnxEmbeddingProvider requires @xenova/transformers. ' +
          'Install with: npm install @xenova/transformers'
      );
    }
    this.pipe = await transformers.pipeline('feature-extraction', this.modelId);
  }
}

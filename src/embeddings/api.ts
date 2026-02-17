import { Vector, RouterConfig } from '../types';

/**
 * Embed text using an external API (OpenAI-compatible endpoint).
 * Calls the embedding API and returns the resulting vector.
 */
export async function embed(text: string, config: RouterConfig): Promise<Vector> {
  const response = await fetch(config.embeddingApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.embeddingApiKey}`,
    },
    body: JSON.stringify({
      model: config.embeddingModel,
      input: text,
      dimensions: config.embeddingDimension,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    data: { embedding: number[] }[];
  };

  return data.data[0].embedding;
}

/**
 * Embed multiple texts in a single batch API call.
 */
export async function embedBatch(texts: string[], config: RouterConfig): Promise<Vector[]> {
  const response = await fetch(config.embeddingApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.embeddingApiKey}`,
    },
    body: JSON.stringify({
      model: config.embeddingModel,
      input: texts,
      dimensions: config.embeddingDimension,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    data: { embedding: number[]; index: number }[];
  };

  // Sort by index to preserve order
  return data.data
    .sort((a, b) => a.index - b.index)
    .map(d => d.embedding);
}

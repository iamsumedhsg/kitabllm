import { db } from "@/lib/db";
import { generateEmbedding } from "@/lib/ai/embeddings";

interface VectorSearchResult {
  id: string;
  sourceId: string;
  content: string;
  chunkNumber: number;
  pageNumber: number | null;
  timestamp: string | null;
  title: string | null;
  url: string | null;
  metadata: unknown;
  similarity: number;
}

/**
 * Perform vector similarity search within a notebook
 */
export async function vectorSearch(
  query: string,
  notebookId: string,
  topK: number = 8
): Promise<VectorSearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const results = await db.$queryRawUnsafe<VectorSearchResult[]>(
    `
    SELECT 
      c.id,
      c."sourceId",
      c.content,
      c."chunkNumber",
      c."pageNumber",
      c.timestamp,
      c.title,
      c.url,
      c.metadata,
      1 - (c.embedding <=> $1::vector) as similarity
    FROM "Chunk" c
    INNER JOIN "Source" s ON c."sourceId" = s.id
    WHERE s."notebookId" = $2
      AND c.embedding IS NOT NULL
      AND s.status = 'READY'
    ORDER BY c.embedding <=> $1::vector
    LIMIT $3
    `,
    embeddingStr,
    notebookId,
    topK
  );

  return results;
}

/**
 * MMR (Maximal Marginal Relevance) search for diversity
 */
export async function mmrSearch(
  query: string,
  notebookId: string,
  topK: number = 8,
  lambda: number = 0.7,
  fetchK: number = 20
): Promise<VectorSearchResult[]> {
  // Fetch more candidates than needed
  const candidates = await vectorSearch(query, notebookId, fetchK);

  if (candidates.length === 0) return [];
  if (candidates.length <= topK) return candidates;

  // MMR selection
  const selected: VectorSearchResult[] = [candidates[0]];
  const remaining = candidates.slice(1);

  while (selected.length < topK && remaining.length > 0) {
    let bestScore = -Infinity;
    let bestIndex = 0;

    for (let i = 0; i < remaining.length; i++) {
      const relevance = remaining[i].similarity;

      // Approximate diversity using content overlap
      const maxSimilarityToSelected = Math.max(
        ...selected.map((s) => contentSimilarity(remaining[i].content, s.content))
      );

      const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarityToSelected;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIndex = i;
      }
    }

    selected.push(remaining[bestIndex]);
    remaining.splice(bestIndex, 1);
  }

  return selected;
}

/**
 * Simple content similarity using Jaccard coefficient on word sets
 */
function contentSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

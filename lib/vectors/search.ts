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
 * Search chunks by page number (for "what's on page X" queries)
 * Also includes adjacent pages for context when the target page has little content
 */
export async function pageSearch(
  notebookId: string,
  pageNumber: number
): Promise<VectorSearchResult[]> {
  // First try exact page
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
      1.0 as similarity
    FROM "Chunk" c
    INNER JOIN "Source" s ON c."sourceId" = s.id
    WHERE s."notebookId" = $1
      AND s.status = 'READY'
      AND c."pageNumber" = $2
    ORDER BY c."chunkNumber" ASC
    `,
    notebookId,
    pageNumber
  );

  // If the page has very little content (<200 chars total), include adjacent pages for context
  const totalContent = results.reduce((sum: number, r: VectorSearchResult) => sum + r.content.length, 0);
  if (totalContent < 200) {
    const adjacentResults = await db.$queryRawUnsafe<VectorSearchResult[]>(
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
        0.9 as similarity
      FROM "Chunk" c
      INNER JOIN "Source" s ON c."sourceId" = s.id
      WHERE s."notebookId" = $1
        AND s.status = 'READY'
        AND c."pageNumber" IN ($2, $3)
        AND c.id NOT IN (SELECT unnest($4::text[]))
      ORDER BY c."pageNumber" ASC, c."chunkNumber" ASC
      LIMIT 8
      `,
      notebookId,
      pageNumber - 1,
      pageNumber + 1,
      results.map((r: VectorSearchResult) => r.id)
    );
    return [...results, ...adjacentResults];
  }

  return results;
}

/**
 * Detect if query is asking about a specific page number
 * Returns the page number if found, null otherwise
 */
export function detectPageQuery(query: string): number | null {
  const patterns = [
    /page\s*(\d+)/i,
    /p\.?\s*(\d+)/i,
    /on\s+(\d+)\s*(st|nd|rd|th)?\s*page/i,
  ];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return parseInt(match[1], 10);
  }
  return null;
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

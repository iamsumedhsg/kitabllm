import type { RetrievedChunk, ChunkGroup } from "@/types";

/**
 * Apply Reciprocal Rank Fusion (RRF) to combine results from multiple retrieval strategies
 */
export function reciprocalRankFusion(
  rankedLists: RetrievedChunk[][],
  k: number = 60
): RetrievedChunk[] {
  const scoreMap = new Map<string, { chunk: RetrievedChunk; score: number }>();

  for (const list of rankedLists) {
    for (let rank = 0; rank < list.length; rank++) {
      const chunk = list[rank];
      const rrfScore = 1 / (k + rank + 1);
      const existing = scoreMap.get(chunk.chunk.id);

      if (existing) {
        existing.score += rrfScore;
      } else {
        scoreMap.set(chunk.chunk.id, { chunk, score: rrfScore });
      }
    }
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map((item) => item.chunk);
}

/**
 * Group chunks by source and compute group scores
 */
export function groupChunksBySource(
  chunks: RetrievedChunk[]
): ChunkGroup[] {
  const groups = new Map<string, RetrievedChunk[]>();

  for (const chunk of chunks) {
    const sourceId = chunk.chunk.sourceId;
    const existing = groups.get(sourceId) || [];
    existing.push(chunk);
    groups.set(sourceId, existing);
  }

  return Array.from(groups.entries())
    .map(([sourceId, groupChunks]) => ({
      sourceId,
      sourceName: groupChunks[0].source.filename,
      chunks: groupChunks.sort((a, b) => b.score - a.score),
      avgScore:
        groupChunks.reduce((sum, c) => sum + c.score, 0) / groupChunks.length,
      rrfScore: groupChunks.reduce((sum, c) => sum + c.score, 0),
    }))
    .sort((a, b) => b.rrfScore - a.rrfScore);
}

/**
 * Remove duplicate/near-duplicate chunks
 */
export function deduplicateChunks(
  chunks: RetrievedChunk[],
  threshold: number = 0.85
): RetrievedChunk[] {
  const unique: RetrievedChunk[] = [];

  for (const chunk of chunks) {
    const isDuplicate = unique.some(
      (existing) =>
        jaccardSimilarity(existing.chunk.content, chunk.chunk.content) >
        threshold
    );
    if (!isDuplicate) {
      unique.push(chunk);
    }
  }

  return unique;
}

function jaccardSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

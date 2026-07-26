import { decomposeQuery } from "./query-decomposer";
import { generateStepBack } from "./step-back";
import { rewriteQuery } from "./query-rewriter";
import { generateHyDE } from "./hyde";
import { reciprocalRankFusion, groupChunksBySource, deduplicateChunks } from "./ranker";
import { vectorSearch, mmrSearch } from "@/lib/vectors/search";
import { db } from "@/lib/db";
import type { QueryDecomposition, RetrievedChunk, ChunkGroup, Source } from "@/types";

interface PipelineResult {
  decomposition: QueryDecomposition;
  topGroups: ChunkGroup[];
  flatChunks: RetrievedChunk[];
}

/**
 * Full RAG retrieval pipeline
 * 1. Decompose query into sub-queries
 * 2. Step-back prompting
 * 3. Query rewrite
 * 4. HyDE generation
 * 5. Multi-query retrieval (parallel)
 * 6. Deduplication
 * 7. Grouping + RRF ranking
 */
export async function runRAGPipeline(
  query: string,
  notebookId: string
): Promise<PipelineResult> {
  // Step 1-4: Query processing (parallel)
  const [subQueries, stepBackQuery, rewrittenQuery, hydeDocument] =
    await Promise.all([
      decomposeQuery(query),
      generateStepBack(query),
      rewriteQuery(query),
      generateHyDE(query),
    ]);

  const decomposition: QueryDecomposition = {
    originalQuery: query,
    subQueries,
    stepBackQuery,
    rewrittenQuery,
    hydeDocument,
  };

  // Step 5: Multi-query retrieval (parallel)
  const allQueries = [
    rewrittenQuery,
    stepBackQuery,
    hydeDocument,
    ...subQueries,
  ];

  const retrievalResults = await Promise.all([
    // Main rewritten query with MMR for diversity
    mmrSearch(rewrittenQuery, notebookId, 8),
    // Step-back query (broader context)
    vectorSearch(stepBackQuery, notebookId, 5),
    // HyDE document (hypothetical answer)
    vectorSearch(hydeDocument, notebookId, 5),
    // Sub-queries
    ...subQueries.map((sq) => vectorSearch(sq, notebookId, 4)),
  ]);

  // Fetch source info for all results
  const allChunkIds = new Set<string>();
  const allSourceIds = new Set<string>();

  for (const results of retrievalResults) {
    for (const r of results) {
      allChunkIds.add(r.id);
      allSourceIds.add(r.sourceId);
    }
  }

  // Fetch sources
  const sources = await db.source.findMany({
    where: { id: { in: Array.from(allSourceIds) } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourceMap = new Map(sources.map((s: any) => [s.id, s]));

  // Convert to RetrievedChunk format
  const rankedLists: RetrievedChunk[][] = retrievalResults.map((results) =>
    results
      .map((r) => {
        const source = sourceMap.get(r.sourceId) as any;
        if (!source) return null;
        return {
          chunk: {
            id: r.id,
            sourceId: r.sourceId,
            content: r.content,
            chunkNumber: r.chunkNumber,
            pageNumber: r.pageNumber,
            timestamp: r.timestamp,
            title: r.title,
            url: r.url,
            metadata: r.metadata as Record<string, unknown> | null,
            createdAt: new Date(),
          },
          score: r.similarity,
          source: source as unknown as Source,
        };
      })
      .filter(Boolean) as RetrievedChunk[]
  );

  // Step 6: RRF fusion across all retrieval strategies
  const fused = reciprocalRankFusion(rankedLists);

  // Step 7: Deduplicate
  const deduplicated = deduplicateChunks(fused);

  // Step 8: Group by source
  const groups = groupChunksBySource(deduplicated);

  // Step 9: Take top 5 groups
  const topGroups = groups.slice(0, 5);

  // Flatten top chunks for context
  const flatChunks = topGroups.flatMap((g) => g.chunks).slice(0, 12);

  return {
    decomposition,
    topGroups,
    flatChunks,
  };
}

import { decomposeQuery } from "./query-decomposer";
import { generateStepBack } from "./step-back";
import { rewriteQuery } from "./query-rewriter";
import { generateHyDE } from "./hyde";
import { reciprocalRankFusion, groupChunksBySource, deduplicateChunks } from "./ranker";
import { vectorSearch, mmrSearch, pageSearch, detectPageQuery } from "@/lib/vectors/search";
import { db } from "@/lib/db";
import type { QueryDecomposition, RetrievedChunk, ChunkGroup, Source } from "@/types";

interface PipelineResult {
  decomposition: QueryDecomposition;
  topGroups: ChunkGroup[];
  flatChunks: RetrievedChunk[];
}

/**
 * Full RAG retrieval pipeline
 * 1. Check for page/metadata queries (short-circuit)
 * 2. Decompose query into sub-queries
 * 3. Step-back prompting
 * 4. Query rewrite
 * 5. HyDE generation
 * 6. Multi-query retrieval (parallel)
 * 7. Deduplication
 * 8. Grouping + RRF ranking
 */
export async function runRAGPipeline(
  query: string,
  notebookId: string
): Promise<PipelineResult> {
  // Short-circuit: detect page-specific queries
  const requestedPage = detectPageQuery(query);

  if (requestedPage) {
    console.log(`[RAG] Page query detected: page ${requestedPage}`);
    return await runPageQuery(query, notebookId, requestedPage);
  }

  // Full RAG pipeline for semantic queries
  return await runSemanticPipeline(query, notebookId);
}

/**
 * Handle page-specific queries by fetching chunks from that page directly
 */
async function runPageQuery(
  query: string,
  notebookId: string,
  pageNumber: number
): Promise<PipelineResult> {
  const results = await pageSearch(notebookId, pageNumber);

  if (results.length === 0) {
    // Fallback to semantic search if no chunks on that page
    console.log(`[RAG] No chunks found for page ${pageNumber}, falling back to semantic search`);
    return await runSemanticPipeline(query, notebookId);
  }

  // Fetch sources
  const sourceIds = [...new Set(results.map((r) => r.sourceId))];
  const sources = await db.source.findMany({
    where: { id: { in: sourceIds } },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourceMap = new Map(sources.map((s: any) => [s.id, s]));

  const flatChunks: RetrievedChunk[] = results
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
        score: 1.0,
        source: source as unknown as Source,
      };
    })
    .filter(Boolean) as RetrievedChunk[];

  const groups = groupChunksBySource(flatChunks);

  return {
    decomposition: {
      originalQuery: query,
      subQueries: [query],
      stepBackQuery: query,
      rewrittenQuery: query,
      hydeDocument: "",
    },
    topGroups: groups,
    flatChunks: flatChunks.slice(0, 12),
  };
}

/**
 * Full semantic RAG pipeline
 */
async function runSemanticPipeline(
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

  // Step 5: Multi-query retrieval (parallel, fault-tolerant)
  const retrievalSettled = await Promise.allSettled([
    mmrSearch(rewrittenQuery, notebookId, 8),
    vectorSearch(stepBackQuery, notebookId, 5),
    vectorSearch(hydeDocument, notebookId, 5),
    ...subQueries.map((sq) => vectorSearch(sq, notebookId, 4)),
  ]);

  // Filter out failed searches
  const retrievalResults = retrievalSettled
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof vectorSearch>>> => r.status === "fulfilled")
    .map((r) => r.value);

  // Fetch source info for all results
  const allSourceIds = new Set<string>();
  for (const results of retrievalResults) {
    for (const r of results) {
      allSourceIds.add(r.sourceId);
    }
  }

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

  // Step 6: RRF fusion
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

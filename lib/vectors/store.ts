import { db } from "@/lib/db";

interface ChunkEmbedding {
  chunkId: string;
  embedding: number[];
}

/**
 * Store embeddings for chunks using raw SQL (pgvector)
 */
export async function storeChunkEmbeddings(
  chunkEmbeddings: ChunkEmbedding[]
): Promise<void> {
  // Use raw SQL to update the embedding column with pgvector
  for (const { chunkId, embedding } of chunkEmbeddings) {
    const embeddingStr = `[${embedding.join(",")}]`;
    await db.$executeRawUnsafe(
      `UPDATE "Chunk" SET embedding = $1::vector WHERE id = $2`,
      embeddingStr,
      chunkId
    );
  }
}

/**
 * Delete all embeddings for a source (when re-indexing or deleting)
 */
export async function deleteSourceEmbeddings(sourceId: string): Promise<void> {
  await db.$executeRawUnsafe(
    `UPDATE "Chunk" SET embedding = NULL WHERE "sourceId" = $1`,
    sourceId
  );
}

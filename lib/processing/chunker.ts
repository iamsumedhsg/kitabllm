import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export interface ChunkMetadata {
  notebookId: string;
  sourceId: string;
  chunkNumber: number;
  pageNumber?: number;
  timestamp?: string;
  title?: string;
  url?: string;
}

export interface ProcessedChunk {
  content: string;
  metadata: ChunkMetadata;
}

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", " ", ""],
});

/**
 * Split text into chunks with metadata
 */
export async function chunkText(
  text: string,
  baseMetadata: Omit<ChunkMetadata, "chunkNumber">
): Promise<ProcessedChunk[]> {
  const docs = await textSplitter.createDocuments([text]);

  return docs.map((doc, index) => ({
    content: doc.pageContent,
    metadata: {
      ...baseMetadata,
      chunkNumber: index + 1,
    },
  }));
}

/**
 * Split text with page awareness (for PDFs)
 */
export async function chunkTextWithPages(
  pages: { text: string; pageNumber: number }[],
  baseMetadata: Omit<ChunkMetadata, "chunkNumber" | "pageNumber">
): Promise<ProcessedChunk[]> {
  const allChunks: ProcessedChunk[] = [];
  let chunkNumber = 1;

  for (const page of pages) {
    const docs = await textSplitter.createDocuments([page.text]);
    for (const doc of docs) {
      allChunks.push({
        content: doc.pageContent,
        metadata: {
          ...baseMetadata,
          chunkNumber: chunkNumber++,
          pageNumber: page.pageNumber,
        },
      });
    }
  }

  return allChunks;
}

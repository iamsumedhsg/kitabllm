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
  chunkSize: 2000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", " ", ""],
});

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatSeconds(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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

/**
 * Split transcript segments into chunks that preserve timestamp ranges.
 * Groups consecutive segments until ~1000 chars, recording exact start/end timestamps.
 */
export interface TranscriptSegment {
  text: string;
  start: number; // seconds
  duration: number;
}

export async function chunkTranscript(
  segments: TranscriptSegment[],
  baseMetadata: Omit<ChunkMetadata, "chunkNumber" | "timestamp">
): Promise<ProcessedChunk[]> {
  const chunks: ProcessedChunk[] = [];
  let chunkNumber = 1;

  let currentText = "";
  let chunkStartTime = 0;
  let chunkEndTime = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segEnd = segment.start + segment.duration;

    // Start a new chunk
    if (currentText.length === 0) {
      chunkStartTime = segment.start;
    }

    currentText += (currentText ? " " : "") + segment.text;
    chunkEndTime = segEnd;

    // Flush when we hit the target size or it's the last segment
    if (currentText.length >= 800 || i === segments.length - 1) {
      if (currentText.trim().length > 0) {
        chunks.push({
          content: currentText.trim(),
          metadata: {
            ...baseMetadata,
            chunkNumber: chunkNumber++,
            timestamp: `${formatSeconds(chunkStartTime)}-${formatSeconds(chunkEndTime)}`,
          },
        });
      }
      // Reset — no overlap needed for transcripts since timestamps are the anchor
      currentText = "";
    }
  }

  return chunks;
}

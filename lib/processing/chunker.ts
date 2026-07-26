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
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatSeconds(seconds: number): string {
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
 * Groups segments into ~1000 char chunks and records the start/end timestamps.
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
  let currentText = "";
  let currentStart = 0;
  let currentEnd = 0;
  let chunkNumber = 1;

  for (const segment of segments) {
    const segEnd = segment.start + segment.duration;

    if (currentText.length === 0) {
      currentStart = segment.start;
    }

    currentText += (currentText ? " " : "") + segment.text;
    currentEnd = segEnd;

    // If accumulated text exceeds chunk size, save it
    if (currentText.length >= 800) {
      chunks.push({
        content: currentText.trim(),
        metadata: {
          ...baseMetadata,
          chunkNumber: chunkNumber++,
          timestamp: `${formatSeconds(currentStart)}-${formatSeconds(currentEnd)}`,
        },
      });
      // Keep overlap: start next chunk from ~200 chars back
      const overlapPoint = currentText.lastIndexOf(" ", currentText.length - 200);
      if (overlapPoint > 0) {
        currentText = currentText.slice(overlapPoint).trim();
        // Approximate the start time for the overlap portion
        const ratio = overlapPoint / currentText.length;
        currentStart = currentStart + (currentEnd - currentStart) * ratio;
      } else {
        currentText = "";
      }
    }
  }

  // Don't forget the last chunk
  if (currentText.trim().length > 0) {
    chunks.push({
      content: currentText.trim(),
      metadata: {
        ...baseMetadata,
        chunkNumber: chunkNumber++,
        timestamp: `${formatSeconds(currentStart)}-${formatSeconds(currentEnd)}`,
      },
    });
  }

  return chunks;
}

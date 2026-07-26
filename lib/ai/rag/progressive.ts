import { openai, CHAT_MODEL } from "../llm";
import { SYSTEM_PROMPT, RAG_CONTEXT_TEMPLATE } from "../prompts/system";
import type { RetrievedChunk, ChunkGroup } from "@/types";

interface ProgressiveResponseOptions {
  query: string;
  topGroups: ChunkGroup[];
  flatChunks: RetrievedChunk[];
  onChunk?: (chunk: string) => void;
}

/**
 * Format seconds into MM:SS or HH:MM:SS
 */
function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Build the context string from retrieved chunks with rich metadata
 */
function buildContext(flatChunks: RetrievedChunk[]): string {
  return flatChunks
    .map((chunk, index) => {
      const source = chunk.source;
      const meta: string[] = [];

      meta.push(`Source: "${source.filename}"`);

      if (chunk.chunk.pageNumber) {
        meta.push(`Page ${chunk.chunk.pageNumber}`);
      }

      if (chunk.chunk.timestamp) {
        meta.push(`Timestamp: ${chunk.chunk.timestamp}`);
      } else if (chunk.chunk.metadata) {
        // Try to extract timestamp from chunk metadata
        const m = chunk.chunk.metadata as Record<string, unknown>;
        if (typeof m.startTime === "number") {
          const endTime = typeof m.endTime === "number" ? m.endTime : (m.startTime as number) + 30;
          meta.push(`Timestamp: ${formatTimestamp(m.startTime as number)}-${formatTimestamp(endTime as number)}`);
        }
      }

      // Compute approximate timestamp range from chunk number for YouTube
      if (source.type === "YOUTUBE" && !chunk.chunk.timestamp && !chunk.chunk.pageNumber) {
        const sourceMetadata = source.metadata as Record<string, unknown> | null;
        const segmentCount = sourceMetadata?.segmentCount as number | undefined;
        if (segmentCount && segmentCount > 0) {
          // Rough estimate: chunk position relative to total content
          const chunkCount = (sourceMetadata?.chunkCount as number) || flatChunks.length;
          const avgSecondsPerChunk = (segmentCount * 3) / chunkCount; // ~3 sec per segment
          const startSec = Math.floor((chunk.chunk.chunkNumber - 1) * avgSecondsPerChunk);
          const endSec = Math.floor(chunk.chunk.chunkNumber * avgSecondsPerChunk);
          meta.push(`Approx: ${formatTimestamp(startSec)}-${formatTimestamp(endSec)}`);
        }
      }

      return `[Chunk ${index + 1}] ${meta.join(" | ")}\n${chunk.chunk.content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Generate a streaming response using the RAG context
 */
export async function generateProgressiveResponse(
  options: ProgressiveResponseOptions
) {
  const { query, flatChunks, onChunk } = options;

  const context = buildContext(flatChunks);

  const userMessage = RAG_CONTEXT_TEMPLATE
    .replace("{context}", context)
    .replace("{question}", query);

  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 4000,
    stream: true,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      onChunk?.(content);
    }
  }

  return fullResponse;
}

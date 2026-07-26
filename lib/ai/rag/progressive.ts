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
 * Build the context string from retrieved chunks
 */
function buildContext(flatChunks: RetrievedChunk[]): string {
  return flatChunks
    .map((chunk, index) => {
      const source = chunk.source;
      const pageInfo = chunk.chunk.pageNumber
        ? ` (Page ${chunk.chunk.pageNumber})`
        : "";
      const timeInfo = chunk.chunk.timestamp
        ? ` (${chunk.chunk.timestamp})`
        : "";
      return `[${index + 1}] Source: "${source.filename}"${pageInfo}${timeInfo}\n${chunk.chunk.content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Build sources reference list
 */
function buildSourcesList(flatChunks: RetrievedChunk[]): string {
  const seen = new Set<string>();
  const sources: string[] = [];
  let counter = 1;

  for (const chunk of flatChunks) {
    const key = `${chunk.source.id}-${chunk.chunk.pageNumber || ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      const pageInfo = chunk.chunk.pageNumber
        ? `, Page ${chunk.chunk.pageNumber}`
        : "";
      const timeInfo = chunk.chunk.timestamp
        ? `, Timestamp: ${chunk.chunk.timestamp}`
        : "";
      sources.push(`[${counter}] ${chunk.source.filename}${pageInfo}${timeInfo}`);
      counter++;
    }
  }

  return sources.join("\n");
}

/**
 * Generate a streaming response using the RAG context
 */
export async function generateProgressiveResponse(
  options: ProgressiveResponseOptions
) {
  const { query, flatChunks, onChunk } = options;

  const context = buildContext(flatChunks);
  const sourcesList = buildSourcesList(flatChunks);

  const userMessage = RAG_CONTEXT_TEMPLATE
    .replace("{context}", context)
    .replace("{sources}", sourcesList)
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

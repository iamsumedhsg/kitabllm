import { db } from "@/lib/db";
import { generateEmbeddings } from "@/lib/ai/embeddings";
import { chunkText, chunkTextWithPages, chunkTranscript } from "./chunker";
import { extractPDF } from "./pdf";
import { extractWebsite } from "./website";
import { extractYouTubeTranscript } from "./youtube";
import { parseVTT } from "./vtt";
import { processText } from "./text";
import { storeChunkEmbeddings } from "@/lib/vectors/store";
import type { SourceType } from "@/types";

interface ProcessSourceOptions {
  sourceId: string;
  notebookId: string;
  type: SourceType;
  content?: string; // For TEXT and VTT types
  buffer?: Buffer; // For PDF
  url?: string; // For WEBSITE and YOUTUBE
}

function log(stage: string, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
  console.log(`[${timestamp}] [Pipeline:${stage}] ${message}${dataStr}`);
}

function logError(stage: string, message: string, error: unknown) {
  const timestamp = new Date().toISOString();
  const errMsg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[${timestamp}] [Pipeline:${stage}] ERROR: ${message} | ${errMsg}`);
  if (stack) console.error(`  Stack: ${stack}`);
}

/**
 * Main source processing pipeline
 * Extract → Clean → Chunk → Embed → Store
 */
export async function processSource(options: ProcessSourceOptions) {
  const { sourceId, notebookId, type, content, buffer, url } = options;
  const startTime = Date.now();

  log("START", `Processing source`, { sourceId, type, url: url || "N/A", hasBuffer: !!buffer, hasContent: !!content });

  try {
    // Update status to INDEXING
    await db.source.update({
      where: { id: sourceId },
      data: { status: "INDEXING" },
    });
    log("STATUS", `Source status set to INDEXING`, { sourceId });

    // Step 1: Extract content based on type
    let extractedText = "";
    let pages: { text: string; pageNumber: number }[] | null = null;
    let transcriptSegments: { text: string; start: number; duration: number }[] | null = null;
    let metadata: Record<string, unknown> = {};

    log("EXTRACT", `Starting content extraction for type: ${type}`);
    const extractStart = Date.now();

    switch (type) {
      case "PDF": {
        if (!buffer) throw new Error("PDF buffer is required");
        log("EXTRACT", `Parsing PDF buffer`, { bufferSize: buffer.length });
        const pdfResult = await extractPDF(buffer);
        extractedText = pdfResult.text;
        pages = pdfResult.pages;
        metadata = {
          numPages: pdfResult.numPages,
          ...pdfResult.metadata,
        };
        log("EXTRACT", `PDF extracted successfully`, {
          numPages: pdfResult.numPages,
          textLength: extractedText.length,
          pageCount: pages.length,
        });
        break;
      }
      case "WEBSITE": {
        if (!url) throw new Error("URL is required for website source");
        log("EXTRACT", `Fetching website content`, { url });
        const webResult = await extractWebsite(url);
        extractedText = webResult.content;
        metadata = {
          title: webResult.title,
          siteName: webResult.siteName,
          url,
        };
        log("EXTRACT", `Website extracted successfully`, {
          title: webResult.title,
          textLength: extractedText.length,
        });
        break;
      }
      case "YOUTUBE": {
        if (!url) throw new Error("URL is required for YouTube source");
        log("EXTRACT", `Fetching YouTube transcript`, { url });
        const ytResult = await extractYouTubeTranscript(url);
        extractedText = ytResult.fullText;
        transcriptSegments = ytResult.transcript;
        metadata = {
          title: ytResult.title,
          videoId: ytResult.videoId,
          segmentCount: ytResult.transcript.length,
          url,
        };
        log("EXTRACT", `YouTube transcript extracted successfully`, {
          title: ytResult.title,
          videoId: ytResult.videoId,
          segmentCount: ytResult.transcript.length,
          textLength: extractedText.length,
        });
        break;
      }
      case "VTT": {
        if (!content) throw new Error("VTT content is required");
        log("EXTRACT", `Parsing VTT content`, { contentLength: content.length });
        const vttResult = parseVTT(content);
        extractedText = vttResult.fullText;
        metadata = {
          segmentCount: vttResult.segments.length,
        };
        log("EXTRACT", `VTT parsed successfully`, {
          segmentCount: vttResult.segments.length,
          textLength: extractedText.length,
        });
        break;
      }
      case "TEXT": {
        if (!content) throw new Error("Text content is required");
        log("EXTRACT", `Processing plain text`, { contentLength: content.length });
        const textResult = processText(content);
        extractedText = textResult.content;
        metadata = {
          lineCount: textResult.lineCount,
          wordCount: textResult.wordCount,
        };
        log("EXTRACT", `Text processed successfully`, {
          lineCount: textResult.lineCount,
          wordCount: textResult.wordCount,
        });
        break;
      }
    }

    const extractDuration = Date.now() - extractStart;
    log("EXTRACT", `Extraction completed in ${extractDuration}ms`);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error(`No content could be extracted from the ${type} source`);
    }

    // Step 2: Chunk the content
    log("CHUNK", `Starting chunking`, { textLength: extractedText.length, hasPages: !!pages, hasTranscript: !!transcriptSegments });
    const chunkStart = Date.now();

    const baseMetadata = { notebookId, sourceId };
    let chunks;
    if (transcriptSegments && transcriptSegments.length > 0) {
      chunks = await chunkTranscript(transcriptSegments, baseMetadata);
    } else if (pages) {
      chunks = await chunkTextWithPages(pages, baseMetadata);
    } else {
      chunks = await chunkText(extractedText, baseMetadata);
    }

    const chunkDuration = Date.now() - chunkStart;
    log("CHUNK", `Chunking completed in ${chunkDuration}ms`, { chunkCount: chunks.length });

    if (chunks.length === 0) {
      throw new Error("No chunks were generated from the content");
    }

    // Step 3: Generate embeddings for all chunks
    log("EMBED", `Generating embeddings for ${chunks.length} chunks`);
    const embedStart = Date.now();

    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(chunkTexts);

    const embedDuration = Date.now() - embedStart;
    log("EMBED", `Embeddings generated in ${embedDuration}ms`, {
      chunkCount: chunks.length,
      embeddingDim: embeddings[0]?.length || 0,
    });

    // Step 4: Store chunks in database (batched to avoid transaction timeout)
    log("STORE", `Saving ${chunks.length} chunks to database`);
    const storeStart = Date.now();

    const BATCH_SIZE = 10;
    const createdChunks: { id: string }[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchResults = await db.$transaction(
        batch.map((chunk) =>
          db.chunk.create({
            data: {
              sourceId,
              content: chunk.content,
              chunkNumber: chunk.metadata.chunkNumber,
              pageNumber: chunk.metadata.pageNumber || null,
              timestamp: chunk.metadata.timestamp || null,
              title: chunk.metadata.title || null,
              url: chunk.metadata.url || null,
              metadata: chunk.metadata as object,
            },
          })
        )
      );
      createdChunks.push(...batchResults);
      log("STORE", `Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} saved (${batchResults.length} chunks)`);
    }

    const storeDuration = Date.now() - storeStart;
    log("STORE", `All chunks saved in ${storeDuration}ms`, { savedCount: createdChunks.length });

    // Step 5: Store embeddings in pgvector (batched)
    log("VECTOR", `Storing ${createdChunks.length} embeddings in pgvector`);
    const vectorStart = Date.now();

    for (let i = 0; i < createdChunks.length; i += BATCH_SIZE) {
      const batch = createdChunks.slice(i, i + BATCH_SIZE);
      await storeChunkEmbeddings(
        batch.map((chunk, batchIdx) => ({
          chunkId: chunk.id,
          embedding: embeddings[i + batchIdx],
        }))
      );
    }

    const vectorDuration = Date.now() - vectorStart;
    log("VECTOR", `Embeddings stored in ${vectorDuration}ms`);

    // Step 6: Update source status and metadata
    await db.source.update({
      where: { id: sourceId },
      data: {
        status: "READY",
        metadata: {
          ...metadata,
          chunkCount: chunks.length,
          processedAt: new Date().toISOString(),
        },
      },
    });

    const totalDuration = Date.now() - startTime;
    log("COMPLETE", `Source processed successfully in ${totalDuration}ms`, {
      sourceId,
      type,
      chunkCount: chunks.length,
      extractMs: extractDuration,
      chunkMs: chunkDuration,
      embedMs: embedDuration,
      storeMs: storeDuration,
      vectorMs: vectorDuration,
    });

    return { success: true, chunkCount: chunks.length };
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logError("FAILED", `Source ${sourceId} (${type}) failed after ${totalDuration}ms`, error);

    // Update status to FAILED (wrapped in try/catch to prevent masking original error)
    try {
      await db.source.update({
        where: { id: sourceId },
        data: {
          status: "FAILED",
          metadata: {
            error: error instanceof Error ? error.message : "Unknown error",
            failedAt: new Date().toISOString(),
          },
        },
      });
    } catch (dbError) {
      logError("FAILED", `Could not update source status to FAILED`, dbError);
    }

    throw error;
  }
}

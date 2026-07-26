import { db } from "@/lib/db";
import { generateEmbeddings } from "@/lib/ai/embeddings";
import { chunkText, chunkTextWithPages } from "./chunker";
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

/**
 * Main source processing pipeline
 * Extract → Clean → Chunk → Embed → Store
 */
export async function processSource(options: ProcessSourceOptions) {
  const { sourceId, notebookId, type, content, buffer, url } = options;

  try {
    // Update status to INDEXING
    await db.source.update({
      where: { id: sourceId },
      data: { status: "INDEXING" },
    });

    // Step 1: Extract content based on type
    let extractedText = "";
    let pages: { text: string; pageNumber: number }[] | null = null;
    let metadata: Record<string, unknown> = {};

    switch (type) {
      case "PDF": {
        if (!buffer) throw new Error("PDF buffer is required");
        const pdfResult = await extractPDF(buffer);
        extractedText = pdfResult.text;
        pages = pdfResult.pages;
        metadata = {
          numPages: pdfResult.numPages,
          ...pdfResult.metadata,
        };
        break;
      }
      case "WEBSITE": {
        if (!url) throw new Error("URL is required for website source");
        const webResult = await extractWebsite(url);
        extractedText = webResult.content;
        metadata = {
          title: webResult.title,
          siteName: webResult.siteName,
          url,
        };
        break;
      }
      case "YOUTUBE": {
        if (!url) throw new Error("URL is required for YouTube source");
        const ytResult = await extractYouTubeTranscript(url);
        extractedText = ytResult.fullText;
        metadata = {
          title: ytResult.title,
          videoId: ytResult.videoId,
          segmentCount: ytResult.transcript.length,
          url,
        };
        break;
      }
      case "VTT": {
        if (!content) throw new Error("VTT content is required");
        const vttResult = parseVTT(content);
        extractedText = vttResult.fullText;
        metadata = {
          segmentCount: vttResult.segments.length,
        };
        break;
      }
      case "TEXT": {
        if (!content) throw new Error("Text content is required");
        const textResult = processText(content);
        extractedText = textResult.content;
        metadata = {
          lineCount: textResult.lineCount,
          wordCount: textResult.wordCount,
        };
        break;
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No content could be extracted from the source");
    }

    // Step 2: Chunk the content
    const baseMetadata = { notebookId, sourceId };
    const chunks = pages
      ? await chunkTextWithPages(pages, baseMetadata)
      : await chunkText(extractedText, baseMetadata);

    if (chunks.length === 0) {
      throw new Error("No chunks were generated from the content");
    }

    // Step 3: Generate embeddings for all chunks
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(chunkTexts);

    // Step 4: Store chunks in database
    const createdChunks = await db.$transaction(
      chunks.map((chunk, index) =>
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

    // Step 5: Store embeddings in pgvector
    await storeChunkEmbeddings(
      createdChunks.map((chunk, index) => ({
        chunkId: chunk.id,
        embedding: embeddings[index],
      }))
    );

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

    return { success: true, chunkCount: chunks.length };
  } catch (error) {
    console.error(`[Pipeline] Error processing source ${sourceId}:`, error);

    // Update status to FAILED
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

    throw error;
  }
}

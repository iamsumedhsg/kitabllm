import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { chatMessageSchema } from "@/lib/validators/chat";
import { runRAGPipeline } from "@/lib/ai/rag/pipeline";
import { generateProgressiveResponse } from "@/lib/ai/rag/progressive";

// POST /api/chat - Stream a chat response
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validated = chatMessageSchema.safeParse(body);

    if (!validated.success) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
      });
    }

    const { notebookId, conversationId: rawConvId, message } = validated.data;
    const conversationId = rawConvId || undefined; // normalize null to undefined

    console.log(`[Chat] Incoming message: notebookId=${notebookId}, convId=${conversationId || "new"}, message="${message.slice(0, 100)}"`);

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // Verify notebook ownership
    const notebook = await db.notebook.findFirst({
      where: { id: notebookId, userId: user.id },
    });
    if (!notebook) {
      return new Response("Notebook not found", { status: 404 });
    }

    // Create or get conversation
    let convId = conversationId;
    if (!convId) {
      const conversation = await db.conversation.create({
        data: {
          notebookId,
          title: message.slice(0, 100),
        },
      });
      convId = conversation.id;
    }

    // Save user message
    await db.message.create({
      data: {
        conversationId: convId,
        role: "USER",
        content: message,
      },
    });

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation ID to client if newly created
          if (!conversationId) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "conversationId", conversationId: convId })}\n\n`
              )
            );
          }

          // Send pipeline stage updates
          const sendStage = (stage: string, progress: number) => {
            console.log(`[Chat] Stage: ${stage} (${progress}%)`);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "stage", stage, progress })}\n\n`
              )
            );
          };

          sendStage("DECOMPOSING", 10);

          // Run RAG pipeline
          console.log(`[Chat] Running RAG pipeline for query: "${message.slice(0, 80)}..."`);
          const ragStart = Date.now();
          const pipelineResult = await runRAGPipeline(message, notebookId);
          console.log(`[Chat] RAG pipeline completed in ${Date.now() - ragStart}ms | chunks retrieved: ${pipelineResult.flatChunks.length}, groups: ${pipelineResult.topGroups.length}`);

          sendStage("STREAMING", 60);

          // Generate streaming response
          const fullResponse = await generateProgressiveResponse({
            query: message,
            topGroups: pipelineResult.topGroups,
            flatChunks: pipelineResult.flatChunks,
            onChunk: (chunk) => {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "content", content: chunk })}\n\n`
                )
              );
            },
          });

          // Generate citations from the chunks used
          const citations = pipelineResult.flatChunks.slice(0, 8).map((c, i) => ({
            id: `citation-${i}`,
            sourceId: c.source.id,
            chunkId: c.chunk.id,
            pageNumber: c.chunk.pageNumber,
            timestamp: c.chunk.timestamp,
            confidence: c.score,
            excerpt: c.chunk.content.slice(0, 200),
            source: c.source,
          }));

          // Send citations
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "citations", citations })}\n\n`
            )
          );

          // Save assistant message
          const savedMessage = await db.message.create({
            data: {
              conversationId: convId!,
              role: "ASSISTANT",
              content: fullResponse,
            },
          });

          // Save citations to database
          for (const citation of citations) {
            await db.citation.create({
              data: {
                messageId: savedMessage.id,
                sourceId: citation.sourceId,
                chunkId: citation.chunkId,
                pageNumber: citation.pageNumber,
                timestamp: citation.timestamp,
                confidence: citation.confidence,
                excerpt: citation.excerpt,
              },
            });
          }

          sendStage("COMPLETE", 100);
          console.log(`[Chat] Response complete | citations: ${citations.length}, responseLength: ${fullResponse.length}`);
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("[Chat] Stream error:", error instanceof Error ? error.message : error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "An error occurred" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[POST /api/chat]", error);
    return new Response("Internal server error", { status: 500 });
  }
}

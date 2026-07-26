import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { openai, CHAT_MODEL } from "@/lib/ai/llm";

// POST /api/notebooks/:id/summary - Generate AI notebook summary
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const notebook = await db.notebook.findFirst({
      where: { id, userId: user.id },
      include: {
        sources: {
          where: { status: "READY" },
          select: { id: true, filename: true, type: true },
        },
      },
    });
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
    }

    // Get a sample of chunks from each source for summarization
    const sampleChunks = await db.chunk.findMany({
      where: {
        source: { notebookId: id, status: "READY" },
      },
      orderBy: { chunkNumber: "asc" },
      take: 30, // First 30 chunks for summary context
      include: {
        source: { select: { filename: true } },
      },
    });

    if (sampleChunks.length === 0) {
      return NextResponse.json(
        { error: "No indexed content available for summary" },
        { status: 400 }
      );
    }

    const contextText = sampleChunks
      .map((c: { source: { filename: string }; content: string }) => `[${c.source.filename}]: ${c.content}`)
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert research assistant. Generate a comprehensive summary of the provided research material. Structure your output as:

## Executive Summary
A 2-3 sentence overview of all the material.

## Key Insights
- Bullet points of the most important findings/ideas (5-8 points)

## Important Definitions
- Key terms and their definitions found in the material

## Flashcards
Generate 5 Q&A flashcards based on the key concepts:
- Q: [question]
- A: [answer]

## Quiz
Generate 3 multiple-choice questions:
1. [Question]
   a) [option]
   b) [option]
   c) [option]
   d) [option]
   Answer: [letter]

Be thorough, accurate, and only use information present in the provided material.`,
        },
        {
          role: "user",
          content: `Here is the research material from notebook "${notebook.title}" (${notebook.sources.length} sources):\n\n${contextText}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 3000,
    });

    const summary = response.choices[0]?.message?.content || "";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("[POST /api/notebooks/:id/summary]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

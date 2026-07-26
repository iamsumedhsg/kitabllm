import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET /api/notebooks/:id/stats - Get notebook statistics
export async function GET(
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
    });
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
    }

    // Get counts
    const [sourceCount, chunkCount, messageCount, conversationCount] =
      await Promise.all([
        db.source.count({ where: { notebookId: id } }),
        db.chunk.count({
          where: { source: { notebookId: id } },
        }),
        db.message.count({
          where: {
            conversation: { notebookId: id },
            role: "USER",
          },
        }),
        db.conversation.count({ where: { notebookId: id } }),
      ]);

    // Get source sizes for storage calculation
    const sources = await db.source.findMany({
      where: { notebookId: id },
      select: { size: true, status: true },
    });

    const totalStorage = sources.reduce((sum: number, s) => sum + s.size, 0);
    const readySources = sources.filter((s) => s.status === "READY").length;
    const indexingSources = sources.filter(
      (s) => s.status === "INDEXING"
    ).length;
    const failedSources = sources.filter((s) => s.status === "FAILED").length;

    return NextResponse.json({
      totalSources: sourceCount,
      readySources,
      indexingSources,
      failedSources,
      totalChunks: chunkCount,
      totalQuestions: messageCount,
      totalConversations: conversationCount,
      storageUsed: totalStorage,
      lastUpdated: notebook.updatedAt,
    });
  } catch (error) {
    console.error("[GET /api/notebooks/:id/stats]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

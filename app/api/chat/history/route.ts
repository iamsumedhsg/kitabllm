import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET /api/chat/history?conversationId=xxx OR ?notebookId=xxx
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const notebookId = searchParams.get("notebookId");

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If notebookId provided, get the most recent conversation
    if (notebookId && !conversationId) {
      const notebook = await db.notebook.findFirst({
        where: { id: notebookId, userId: user.id },
      });
      if (!notebook) {
        return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
      }

      const latestConversation = await db.conversation.findFirst({
        where: { notebookId },
        orderBy: { updatedAt: "desc" },
      });

      if (!latestConversation) {
        return NextResponse.json({ conversation: null, messages: [] });
      }

      const messages = await db.message.findMany({
        where: { conversationId: latestConversation.id },
        orderBy: { createdAt: "asc" },
        include: {
          citations: {
            include: {
              source: true,
            },
          },
        },
      });

      return NextResponse.json({
        conversation: latestConversation,
        messages,
      });
    }

    // If conversationId provided, get that specific conversation
    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId or notebookId is required" },
        { status: 400 }
      );
    }

    // Verify ownership through conversation -> notebook -> user chain
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { notebook: true },
    });

    if (!conversation || conversation.notebook.userId !== user.id) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const messages = await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: {
        citations: {
          include: {
            source: true,
          },
        },
      },
    });

    return NextResponse.json({ messages, conversation });
  } catch (error) {
    console.error("[GET /api/chat/history]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

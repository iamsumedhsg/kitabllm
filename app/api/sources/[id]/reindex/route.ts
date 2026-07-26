import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { deleteSourceEmbeddings } from "@/lib/vectors/store";
import { processSource } from "@/lib/processing/pipeline";
import { readFile } from "fs/promises";

// POST /api/sources/:id/reindex
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

    const source = await db.source.findUnique({
      where: { id },
      include: { notebook: true },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user || source.notebook.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete existing chunks and embeddings
    await deleteSourceEmbeddings(id);
    await db.chunk.deleteMany({ where: { sourceId: id } });

    // Read file content if it exists
    let buffer: Buffer | undefined;
    if (source.filePath) {
      buffer = await readFile(source.filePath);
    }

    // Re-process in background
    processSource({
      sourceId: source.id,
      notebookId: source.notebookId,
      type: source.type,
      buffer,
      url: source.url || undefined,
    }).catch((error) => {
      console.error(`[Reindex] Source ${source.id}:`, error);
    });

    return NextResponse.json({ success: true, message: "Re-indexing started" });
  } catch (error) {
    console.error("[POST /api/sources/:id/reindex]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { deleteSourceEmbeddings } from "@/lib/vectors/store";
import { unlink } from "fs/promises";

// GET /api/sources/:id
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

    const source = await db.source.findUnique({
      where: { id },
      include: {
        notebook: true,
        _count: { select: { chunks: true } },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Verify ownership
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user || source.notebook.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(source);
  } catch (error) {
    console.error("[GET /api/sources/:id]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/sources/:id
export async function DELETE(
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

    // Mark as removing
    await db.source.update({
      where: { id },
      data: { status: "REMOVING" },
    });

    // Delete embeddings
    await deleteSourceEmbeddings(id);

    // Delete file if exists
    if (source.filePath) {
      try {
        await unlink(source.filePath);
      } catch {
        // File might already be gone
      }
    }

    // Delete source (cascades to chunks and citations)
    await db.source.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/sources/:id]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET /api/sources/:id/chunks - Get all chunks for a source
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
      include: { notebook: true },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user || source.notebook.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const chunks = await db.chunk.findMany({
      where: { sourceId: id },
      orderBy: { chunkNumber: "asc" },
      select: {
        id: true,
        content: true,
        chunkNumber: true,
        pageNumber: true,
        timestamp: true,
      },
    });

    return NextResponse.json({ chunks });
  } catch (error) {
    console.error("[GET /api/sources/:id/chunks]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

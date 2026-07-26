import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { searchSchema } from "@/lib/validators/common";
import { vectorSearch } from "@/lib/vectors/search";

// POST /api/search - Semantic search within a notebook
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = searchSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const { query, notebookId } = validated.data;

    if (!notebookId) {
      return NextResponse.json(
        { error: "notebookId is required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify notebook ownership
    const notebook = await db.notebook.findFirst({
      where: { id: notebookId, userId: user.id },
    });
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
    }

    // Perform vector search
    const results = await vectorSearch(query, notebookId, 10);

    // Fetch source names for results
    const sourceIds = [...new Set(results.map((r) => r.sourceId))];
    const sources = await db.source.findMany({
      where: { id: { in: sourceIds } },
      select: { id: true, filename: true },
    });
    const sourceMap = new Map(sources.map((s) => [s.id, s.filename]));

    const formattedResults = results.map((r) => ({
      id: r.id,
      content: r.content,
      sourceId: r.sourceId,
      sourceName: sourceMap.get(r.sourceId) || "Unknown",
      pageNumber: r.pageNumber,
      score: r.similarity,
    }));

    return NextResponse.json({ results: formattedResults });
  } catch (error) {
    console.error("[POST /api/search]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

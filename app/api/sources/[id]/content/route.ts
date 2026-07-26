import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { readFile, access } from "fs/promises";

// GET /api/sources/:id/content - Get source file content
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

    if (!source.filePath) {
      return NextResponse.json(
        { error: "No file content available" },
        { status: 404 }
      );
    }

    // Check if file exists before reading
    try {
      await access(source.filePath);
    } catch {
      return NextResponse.json(
        { error: "File not found on this server. The file may have been uploaded on a different instance." },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(source.filePath);
    const contentType =
      source.type === "PDF" ? "application/pdf" : "text/plain";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${source.filename}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/sources/:id/content]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

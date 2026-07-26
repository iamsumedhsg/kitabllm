import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { processSource } from "@/lib/processing/pipeline";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// POST /api/sources/upload - Upload and process a source
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const notebookId = formData.get("notebookId") as string;
    const type = formData.get("type") as string;
    const filename = formData.get("filename") as string;
    const url = formData.get("url") as string | null;
    const content = formData.get("content") as string | null;
    const file = formData.get("file") as File | null;

    if (!notebookId || !type || !filename) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    console.log(`[Upload] New source: type=${type}, filename="${filename}", url=${url || "N/A"}, notebookId=${notebookId}`);

    // Verify notebook ownership
    const notebook = await db.notebook.findFirst({
      where: { id: notebookId, userId: user.id },
    });
    if (!notebook) {
      return NextResponse.json({ error: "Notebook not found" }, { status: 404 });
    }

    let filePath: string | null = null;
    let fileBuffer: Buffer | null = null;
    let fileSize = 0;

    // Handle file uploads
    if (file) {
      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
      fileSize = fileBuffer.length;

      // Save file to uploads directory
      const uploadsDir = join(process.cwd(), "uploads", notebookId);
      await mkdir(uploadsDir, { recursive: true });
      filePath = join(uploadsDir, `${Date.now()}-${filename}`);
      await writeFile(filePath, fileBuffer);
      console.log(`[Upload] File saved: ${filePath} (${fileSize} bytes)`);
    }

    // Create source record
    const source = await db.source.create({
      data: {
        notebookId,
        filename,
        type: type as "PDF" | "TEXT" | "WEBSITE" | "YOUTUBE" | "VTT",
        size: fileSize || (content?.length || 0),
        url: url || null,
        filePath,
        status: "UPLOADING",
      },
    });

    console.log(`[Upload] Source record created: ${source.id} — starting background processing`);

    // Process in background (non-blocking)
    processSource({
      sourceId: source.id,
      notebookId,
      type: type as "PDF" | "TEXT" | "WEBSITE" | "YOUTUBE" | "VTT",
      content: content || undefined,
      buffer: fileBuffer || undefined,
      url: url || undefined,
    }).catch((error) => {
      console.error(`[Upload] Background processing failed for source ${source.id}:`, error instanceof Error ? error.message : error);
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error("[Upload] Request failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

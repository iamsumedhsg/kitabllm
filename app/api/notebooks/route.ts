import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createNotebookSchema } from "@/lib/validators/notebook";

// GET /api/notebooks - List user notebooks
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find or create user
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json([]);
    }

    const notebooks = await db.notebook.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            sources: true,
            conversations: true,
          },
        },
      },
    });

    return NextResponse.json(notebooks);
  } catch (error) {
    console.error("[GET /api/notebooks]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/notebooks - Create notebook
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createNotebookSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Find or create user
    let user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          clerkId: userId,
          email: `${userId}@placeholder.com`, // Will be updated via webhook
        },
      });
    }

    const notebook = await db.notebook.create({
      data: {
        title: validated.data.title,
        description: validated.data.description,
        userId: user.id,
      },
      include: {
        _count: {
          select: {
            sources: true,
            conversations: true,
          },
        },
      },
    });

    return NextResponse.json(notebook, { status: 201 });
  } catch (error) {
    console.error("[POST /api/notebooks]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

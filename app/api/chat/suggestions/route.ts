import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { openai, CHAT_MODEL } from "@/lib/ai/llm";
import { z } from "zod";

const suggestionsSchema = z.object({
  notebookId: z.string().cuid(),
  lastMessage: z.string().min(1),
  lastResponse: z.string().min(1),
});

// POST /api/chat/suggestions - Generate follow-up questions
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = suggestionsSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { lastMessage, lastResponse } = validated.data;

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content: `Based on the conversation context, suggest exactly 5 relevant follow-up questions the user might want to ask. The questions should:
1. Explore different aspects of the topic
2. Go deeper on specific points
3. Compare/contrast related ideas
4. Ask for practical applications
5. Seek clarification on complex points

Return ONLY a JSON array of 5 strings, nothing else.`,
        },
        {
          role: "user",
          content: `User asked: "${lastMessage}"\n\nAssistant responded: "${lastResponse.slice(0, 1000)}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content?.trim() || "[]";
    let suggestions: string[] = [];

    try {
      suggestions = JSON.parse(content);
      if (!Array.isArray(suggestions)) suggestions = [];
    } catch {
      suggestions = [];
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 5) });
  } catch (error) {
    console.error("[POST /api/chat/suggestions]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

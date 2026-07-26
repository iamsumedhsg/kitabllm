import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { extractYouTubeTranscript, extractVideoId } from "@/lib/processing/youtube";

/**
 * POST /api/youtube/transcript
 * Pre-fetch YouTube transcript before the full source upload.
 * This allows the client to get the transcript and send it as content
 * to the upload endpoint, bypassing the server IP block issue.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    console.log(`[YouTube API] Fetching transcript for: ${videoId}`);

    const result = await extractYouTubeTranscript(url);

    return NextResponse.json({
      videoId: result.videoId,
      title: result.title,
      fullText: result.fullText,
      segmentCount: result.transcript.length,
    });
  } catch (error: any) {
    console.error(`[YouTube API] Failed:`, error.message);
    return NextResponse.json(
      { error: error.message || "Failed to fetch transcript" },
      { status: 422 }
    );
  }
}

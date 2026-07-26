export interface TranscriptSegment {
  text: string;
  start: number; // seconds
  duration: number;
}

export interface YouTubeExtractionResult {
  title: string;
  videoId: string;
  transcript: TranscriptSegment[];
  fullText: string;
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
    /(?:youtube\.com\/shorts\/)([^?\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetch YouTube transcript using the innertube API approach
 */
export async function extractYouTubeTranscript(
  url: string
): Promise<YouTubeExtractionResult> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  // Fetch the watch page to get the title and caption tracks
  const watchResponse = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }
  );

  const watchHtml = await watchResponse.text();

  // Extract title
  const titleMatch = watchHtml.match(/<title>(.+?)<\/title>/);
  const title = titleMatch
    ? titleMatch[1].replace(" - YouTube", "").trim()
    : `YouTube Video ${videoId}`;

  // Try to find captions URL from the page data
  const captionMatch = watchHtml.match(
    /"captionTracks":\[.*?"baseUrl":"([^"]+)"/
  );

  if (!captionMatch) {
    throw new Error(
      "No transcript available for this video. Consider uploading a VTT file instead."
    );
  }

  const captionUrl = captionMatch[1].replace(/\\u0026/g, "&");
  const captionResponse = await fetch(captionUrl);
  const captionXml = await captionResponse.text();

  // Parse the XML transcript
  const segments: TranscriptSegment[] = [];
  const textRegex =
    /<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;
  let match;

  while ((match = textRegex.exec(captionXml)) !== null) {
    const text = match[3]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, " ")
      .trim();

    if (text) {
      segments.push({
        text,
        start: parseFloat(match[1]),
        duration: parseFloat(match[2]),
      });
    }
  }

  const fullText = segments.map((s) => s.text).join(" ");

  return {
    title,
    videoId,
    transcript: segments,
    fullText,
  };
}

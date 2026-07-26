import { fetchTranscript, type TranscriptResponse } from "youtube-transcript";
import { YouTubeTranscriptApi } from "youtube-transcript-api-js";

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
 * Fetch title from YouTube oEmbed API
 */
async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (response.ok) {
      const data = await response.json();
      return data.title || `YouTube Video ${videoId}`;
    }
  } catch {
    // Fallback silently
  }
  return `YouTube Video ${videoId}`;
}

/**
 * Strategy 1: youtube-transcript package
 */
async function tryYoutubeTranscript(videoId: string): Promise<TranscriptSegment[] | null> {
  const attempts = [
    () => fetchTranscript(videoId, { lang: "en" }),
    () => fetchTranscript(videoId),
    () => fetchTranscript(`https://www.youtube.com/watch?v=${videoId}`),
  ];

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result && result.length > 0) {
        return result.map((entry: TranscriptResponse) => ({
          text: entry.text.trim(),
          start: entry.offset / 1000,
          duration: entry.duration / 1000,
        })).filter((s: TranscriptSegment) => s.text.length > 0);
      }
    } catch {
      // Try next
    }
  }
  return null;
}

/**
 * Strategy 2: youtube-transcript-api-js package
 */
async function tryYoutubeTranscriptApi(videoId: string): Promise<TranscriptSegment[] | null> {
  try {
    const api = new YouTubeTranscriptApi();
    let result;
    try {
      result = await api.fetch(videoId, ["en"]);
    } catch {
      result = await api.fetch(videoId);
    }

    if (!result || !result.snippets || result.snippets.length === 0) return null;

    return result.snippets.map((entry: any) => ({
      text: (entry.text || "").trim(),
      start: entry.start || 0,
      duration: entry.duration || 0,
    })).filter((s: TranscriptSegment) => s.text.length > 0);
  } catch (err: any) {
    console.log(`[YouTube] youtube-transcript-api-js failed: ${err.message}`);
    return null;
  }
}

/**
 * Strategy 3: Direct scrape of YouTube's watch page for caption tracks
 * Uses a different User-Agent and parses the page HTML directly
 */
async function tryDirectScrape(videoId: string): Promise<TranscriptSegment[] | null> {
  try {
    // Fetch the watch page with a browser-like user agent
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(watchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) return null;
    const html = await response.text();

    // Extract captionTracks from ytInitialPlayerResponse
    const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!captionMatch) {
      console.log("[YouTube] Direct scrape: no captionTracks found in page");
      return null;
    }

    let captionTracks;
    try {
      captionTracks = JSON.parse(captionMatch[1]);
    } catch {
      return null;
    }

    if (!captionTracks || captionTracks.length === 0) return null;

    // Find English track or first available
    const track = captionTracks.find((t: any) => t.languageCode === "en") || captionTracks[0];
    if (!track?.baseUrl) return null;

    // Fetch the transcript XML
    const captionUrl = track.baseUrl.replace(/\\u0026/g, "&");
    const captionResponse = await fetch(captionUrl);
    if (!captionResponse.ok) return null;

    const xml = await captionResponse.text();

    // Parse XML transcript (supports both formats)
    const segments: TranscriptSegment[] = [];

    // Format 1: <text start="1.23" dur="4.56">content</text>
    const textRegex = /<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
    let match;
    while ((match = textRegex.exec(xml)) !== null) {
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

    // Format 2: <p t="123456" d="4560">content</p> (srv3 format, time in ms)
    if (segments.length === 0) {
      const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
      while ((match = pRegex.exec(xml)) !== null) {
        const text = match[3].replace(/<[^>]+>/g, "").trim();
        if (text) {
          segments.push({
            text,
            start: parseInt(match[1]) / 1000,
            duration: parseInt(match[2]) / 1000,
          });
        }
      }
    }

    if (segments.length > 0) {
      console.log(`[YouTube] Direct scrape: got ${segments.length} segments`);
    }
    return segments.length > 0 ? segments : null;
  } catch (err: any) {
    console.log(`[YouTube] Direct scrape failed: ${err.message}`);
    return null;
  }
}

/**
 * Extract YouTube transcript using multiple fallback strategies
 */
export async function extractYouTubeTranscript(
  url: string
): Promise<YouTubeExtractionResult> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL. Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...");
  }

  console.log(`[YouTube] Extracting transcript for video: ${videoId}`);

  const titlePromise = fetchVideoTitle(videoId);

  // Try all strategies in order
  let segments: TranscriptSegment[] | null = null;
  let usedStrategy = "";

  // Strategy 1
  segments = await tryYoutubeTranscript(videoId);
  if (segments) { usedStrategy = "youtube-transcript"; }

  // Strategy 2
  if (!segments) {
    console.log(`[YouTube] Strategy 1 failed, trying youtube-transcript-api-js...`);
    segments = await tryYoutubeTranscriptApi(videoId);
    if (segments) { usedStrategy = "youtube-transcript-api-js"; }
  }

  // Strategy 3
  if (!segments) {
    console.log(`[YouTube] Strategy 2 failed, trying direct scrape...`);
    segments = await tryDirectScrape(videoId);
    if (segments) { usedStrategy = "direct-scrape"; }
  }

  if (!segments || segments.length === 0) {
    throw new Error(
      `Could not fetch transcript for video ${videoId}. YouTube may be blocking server requests from this IP, or the video has no captions. Try uploading a VTT/subtitle file instead.`
    );
  }

  const title = await titlePromise;
  const fullText = segments.map((s) => s.text).join(" ");

  console.log(`[YouTube] Success via "${usedStrategy}": ${segments.length} segments, ${fullText.length} chars for "${title}"`);

  return {
    title,
    videoId,
    transcript: segments,
    fullText,
  };
}

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
 * Strategy 1: youtube-transcript package (InnerTube API)
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
 * Strategy 2: youtube-transcript-api-js package (different extraction method)
 */
async function tryYoutubeTranscriptApi(videoId: string): Promise<TranscriptSegment[] | null> {
  try {
    const api = new YouTubeTranscriptApi();

    // Try fetching with English preference, then without
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
 * Extract YouTube transcript using multiple packages as fallbacks
 */
export async function extractYouTubeTranscript(
  url: string
): Promise<YouTubeExtractionResult> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL. Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...");
  }

  console.log(`[YouTube] Extracting transcript for video: ${videoId}`);

  // Fetch title in parallel with transcript attempts
  const titlePromise = fetchVideoTitle(videoId);

  // Try Strategy 1: youtube-transcript (InnerTube)
  let segments = await tryYoutubeTranscript(videoId);

  // Try Strategy 2: youtube-transcript-api-js (different method)
  if (!segments) {
    console.log(`[YouTube] Strategy 1 failed, trying youtube-transcript-api-js...`);
    segments = await tryYoutubeTranscriptApi(videoId);
  }

  if (!segments || segments.length === 0) {
    throw new Error(
      `Could not fetch transcript for video ${videoId}. YouTube may be blocking server requests, or the video has no captions. Try uploading a VTT/subtitle file instead.`
    );
  }

  const title = await titlePromise;
  const fullText = segments.map((s) => s.text).join(" ");

  console.log(`[YouTube] Got ${segments.length} segments for "${title}" (${fullText.length} chars)`);

  return {
    title,
    videoId,
    transcript: segments,
    fullText,
  };
}

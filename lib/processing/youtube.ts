import {
  fetchTranscript,
  type TranscriptResponse,
} from "youtube-transcript";

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
 * Fetch title from YouTube oEmbed API (lightweight, no scraping needed)
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
 * Try multiple strategies to fetch the transcript
 */
async function fetchTranscriptWithRetries(videoId: string): Promise<TranscriptResponse[]> {
  const errors: string[] = [];

  // Strategy 1: Try with English language preference
  try {
    const result = await fetchTranscript(videoId, { lang: "en" });
    if (result && result.length > 0) return result;
  } catch (err: any) {
    errors.push(`en: ${err.message || err}`);
  }

  // Strategy 2: Try without any language preference (gets auto-generated)
  try {
    const result = await fetchTranscript(videoId);
    if (result && result.length > 0) return result;
  } catch (err: any) {
    errors.push(`no-lang: ${err.message || err}`);
  }

  // Strategy 3: Try with full URL format instead of just ID
  try {
    const result = await fetchTranscript(`https://www.youtube.com/watch?v=${videoId}`);
    if (result && result.length > 0) return result;
  } catch (err: any) {
    errors.push(`full-url: ${err.message || err}`);
  }

  // Strategy 4: Try with 'auto' language hint
  try {
    const result = await fetchTranscript(videoId, { lang: "auto" });
    if (result && result.length > 0) return result;
  } catch (err: any) {
    errors.push(`auto: ${err.message || err}`);
  }

  // All strategies failed
  console.error(`[YouTube] All transcript strategies failed for ${videoId}:`, errors);
  throw new Error(
    `Could not fetch transcript for this video (${videoId}). The video may not have captions available, or YouTube is blocking the request. Consider uploading a VTT/subtitle file instead. Errors: ${errors.join(" | ")}`
  );
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

  // Fetch title and transcript in parallel
  const [title, transcriptEntries] = await Promise.all([
    fetchVideoTitle(videoId),
    fetchTranscriptWithRetries(videoId),
  ]);

  if (!transcriptEntries || transcriptEntries.length === 0) {
    throw new Error(
      "Transcript is empty for this video. Consider uploading a VTT/subtitle file instead."
    );
  }

  console.log(`[YouTube] Got ${transcriptEntries.length} transcript entries for "${title}"`);

  // Convert to our segment format
  const segments: TranscriptSegment[] = transcriptEntries
    .map((entry: TranscriptResponse) => ({
      text: entry.text.trim(),
      start: entry.offset / 1000, // offset is in ms, convert to seconds
      duration: entry.duration / 1000,
    }))
    .filter((s) => s.text.length > 0);

  const fullText = segments.map((s) => s.text).join(" ");

  if (!fullText.trim()) {
    throw new Error(
      "Transcript content is empty after processing. Consider uploading a VTT/subtitle file instead."
    );
  }

  return {
    title,
    videoId,
    transcript: segments,
    fullText,
  };
}

import {
  fetchTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
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
 * Extract YouTube transcript using the youtube-transcript package
 * Uses InnerTube API (Android client) with web page fallback
 */
export async function extractYouTubeTranscript(
  url: string
): Promise<YouTubeExtractionResult> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL. Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...");
  }

  // Fetch title and transcript in parallel
  const [title, transcriptEntries] = await Promise.all([
    fetchVideoTitle(videoId),
    fetchTranscript(videoId, { lang: "en" }).catch(async (err) => {
      // If English not available, try without language preference
      if (err instanceof YoutubeTranscriptNotAvailableError) {
        throw new Error(
          `No transcript available for this video (${videoId}). Consider uploading a VTT/subtitle file instead.`
        );
      }
      if (err instanceof YoutubeTranscriptDisabledError) {
        throw new Error(
          `Transcripts are disabled for this video (${videoId}). Consider uploading a VTT/subtitle file instead.`
        );
      }
      // Try without language filter as fallback
      return fetchTranscript(videoId);
    }),
  ]);

  if (!transcriptEntries || transcriptEntries.length === 0) {
    throw new Error(
      "Transcript is empty for this video. Consider uploading a VTT/subtitle file instead."
    );
  }

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

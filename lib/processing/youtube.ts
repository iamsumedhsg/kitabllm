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
  } catch {}
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
    } catch {}
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
    try { result = await api.fetch(videoId, ["en"]); }
    catch { result = await api.fetch(videoId); }

    if (!result || !result.snippets || result.snippets.length === 0) return null;
    return result.snippets.map((entry: any) => ({
      text: (entry.text || "").trim(),
      start: entry.start || 0,
      duration: entry.duration || 0,
    })).filter((s: TranscriptSegment) => s.text.length > 0);
  } catch (err: any) {
    console.log(`[YouTube] Strategy 2 failed: ${err.message?.slice(0, 100)}`);
    return null;
  }
}

/**
 * Strategy 3: Direct page scrape for captionTracks
 */
async function tryDirectScrape(videoId: string): Promise<TranscriptSegment[] | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!captionMatch) return null;

    let tracks;
    try { tracks = JSON.parse(captionMatch[1]); } catch { return null; }
    if (!tracks?.length) return null;

    const track = tracks.find((t: any) => t.languageCode === "en") || tracks[0];
    if (!track?.baseUrl) return null;

    const xmlRes = await fetch(track.baseUrl.replace(/\\u0026/g, "&"));
    if (!xmlRes.ok) return null;
    const xml = await xmlRes.text();

    const segments: TranscriptSegment[] = [];
    const regex = /<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const text = match[3]
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n/g, " ").trim();
      if (text) segments.push({ text, start: parseFloat(match[1]), duration: parseFloat(match[2]) });
    }
    return segments.length > 0 ? segments : null;
  } catch { return null; }
}

/**
 * Strategy 4: Use Invidious public instances (YouTube frontend mirrors)
 * These run on different IPs and often aren't blocked
 */
async function tryInvidious(videoId: string): Promise<TranscriptSegment[] | null> {
  const instances = [
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de",
    "https://invidious.jing.rocks",
    "https://vid.puffyan.us",
  ];

  for (const instance of instances) {
    try {
      const res = await fetch(`${instance}/api/v1/captions/${videoId}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      if (!data?.captions?.length) continue;

      // Find English caption
      const caption = data.captions.find((c: any) =>
        c.language_code === "en" || c.label?.toLowerCase().includes("english")
      ) || data.captions[0];

      if (!caption?.url) continue;

      // Fetch the caption VTT/XML
      const captionUrl = caption.url.startsWith("http")
        ? caption.url
        : `${instance}${caption.url}`;

      const captionRes = await fetch(captionUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (!captionRes.ok) continue;

      const captionText = await captionRes.text();

      // Parse as XML (YouTube timed text format)
      const segments: TranscriptSegment[] = [];
      const regex = /<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
      let match;
      while ((match = regex.exec(captionText)) !== null) {
        const text = match[3]
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n/g, " ").trim();
        if (text) segments.push({ text, start: parseFloat(match[1]), duration: parseFloat(match[2]) });
      }

      if (segments.length > 0) {
        console.log(`[YouTube] Invidious success via ${instance}: ${segments.length} segments`);
        return segments;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Extract YouTube transcript using multiple fallback strategies
 */
export async function extractYouTubeTranscript(url: string): Promise<YouTubeExtractionResult> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  console.log(`[YouTube] Extracting transcript for: ${videoId}`);
  const titlePromise = fetchVideoTitle(videoId);

  // Try strategies in order
  let segments: TranscriptSegment[] | null = null;
  let strategy = "";

  segments = await tryYoutubeTranscript(videoId);
  if (segments) { strategy = "youtube-transcript"; }

  if (!segments) {
    console.log(`[YouTube] Strategy 1 failed, trying api-js...`);
    segments = await tryYoutubeTranscriptApi(videoId);
    if (segments) { strategy = "youtube-transcript-api-js"; }
  }

  if (!segments) {
    console.log(`[YouTube] Strategy 2 failed, trying direct scrape...`);
    segments = await tryDirectScrape(videoId);
    if (segments) { strategy = "direct-scrape"; }
  }

  if (!segments) {
    console.log(`[YouTube] Strategy 3 failed, trying Invidious instances...`);
    segments = await tryInvidious(videoId);
    if (segments) { strategy = "invidious"; }
  }

  if (!segments || segments.length === 0) {
    throw new Error(
      `Could not fetch transcript for video ${videoId}. All strategies failed (YouTube is blocking this server's IP). Upload a VTT subtitle file instead.`
    );
  }

  const title = await titlePromise;
  const fullText = segments.map((s) => s.text).join(" ");
  console.log(`[YouTube] ✓ Success via "${strategy}": ${segments.length} segments, ${fullText.length} chars`);

  return { title, videoId, transcript: segments, fullText };
}

export interface VTTSegment {
  text: string;
  startTime: string; // HH:MM:SS.mmm
  endTime: string;
  startSeconds: number;
}

export interface VTTExtractionResult {
  segments: VTTSegment[];
  fullText: string;
}

/**
 * Parse a timestamp string (HH:MM:SS.mmm or MM:SS.mmm) to seconds
 */
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.trim().split(":");
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1]);
  }

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parse VTT content into segments
 */
export function parseVTT(content: string): VTTExtractionResult {
  const lines = content.split("\n");
  const segments: VTTSegment[] = [];
  let currentSegment: Partial<VTTSegment> | null = null;
  let textLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip WEBVTT header and empty lines
    if (trimmed.startsWith("WEBVTT") || trimmed.startsWith("NOTE")) {
      continue;
    }

    // Check for timestamp line
    const timestampMatch = trimmed.match(
      /(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{1,2}:?\d{2}:\d{2}[.,]\d{3})/
    );

    if (timestampMatch) {
      // Save previous segment
      if (currentSegment && textLines.length > 0) {
        segments.push({
          startTime: currentSegment.startTime!,
          endTime: currentSegment.endTime!,
          startSeconds: currentSegment.startSeconds!,
          text: textLines.join(" ").trim(),
        });
      }

      currentSegment = {
        startTime: timestampMatch[1].replace(",", "."),
        endTime: timestampMatch[2].replace(",", "."),
        startSeconds: parseTimestamp(timestampMatch[1].replace(",", ".")),
      };
      textLines = [];
    } else if (trimmed && currentSegment && !/^\d+$/.test(trimmed)) {
      // Skip cue identifiers (just numbers) and collect text lines
      // Remove VTT tags like <v Speaker> etc.
      const cleanedText = trimmed.replace(/<[^>]+>/g, "").trim();
      if (cleanedText) {
        textLines.push(cleanedText);
      }
    } else if (!trimmed && currentSegment && textLines.length > 0) {
      // Empty line = end of cue
      segments.push({
        startTime: currentSegment.startTime!,
        endTime: currentSegment.endTime!,
        startSeconds: currentSegment.startSeconds!,
        text: textLines.join(" ").trim(),
      });
      currentSegment = null;
      textLines = [];
    }
  }

  // Don't forget the last segment
  if (currentSegment && textLines.length > 0) {
    segments.push({
      startTime: currentSegment.startTime!,
      endTime: currentSegment.endTime!,
      startSeconds: currentSegment.startSeconds!,
      text: textLines.join(" ").trim(),
    });
  }

  const fullText = segments.map((s) => s.text).join(" ");

  return { segments, fullText };
}

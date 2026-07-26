export interface TextExtractionResult {
  content: string;
  lineCount: number;
  wordCount: number;
}

/**
 * Process plain text content
 */
export function processText(content: string): TextExtractionResult {
  const cleaned = content.trim();
  const lines = cleaned.split("\n");
  const words = cleaned.split(/\s+/).filter(Boolean);

  return {
    content: cleaned,
    lineCount: lines.length,
    wordCount: words.length,
  };
}

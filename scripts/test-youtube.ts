/**
 * Test YouTube transcript extraction
 * Usage: bun run scripts/test-youtube.ts <youtube-url>
 * Example: bun run scripts/test-youtube.ts https://youtu.be/OgyORlzV0uw
 */

import { fetchTranscript } from "youtube-transcript";
import { YouTubeTranscriptApi } from "youtube-transcript-api-js";

const url = process.argv[2];
if (!url) {
  console.log("Usage: bun run scripts/test-youtube.ts <youtube-url>");
  process.exit(1);
}

// Extract video ID
function extractVideoId(url: string): string | null {
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

const videoId = extractVideoId(url);
if (!videoId) {
  console.log("❌ Could not extract video ID from URL:", url);
  process.exit(1);
}

console.log(`\n🎬 Testing transcript extraction for: ${videoId}`);
console.log(`   URL: ${url}\n`);

// Strategy 1: youtube-transcript
console.log("━━━ Strategy 1: youtube-transcript ━━━");

const s1attempts = [
  { label: "with lang=en", fn: () => fetchTranscript(videoId, { lang: "en" }) },
  { label: "no lang filter", fn: () => fetchTranscript(videoId) },
  { label: "full URL", fn: () => fetchTranscript(`https://www.youtube.com/watch?v=${videoId}`) },
];

let s1Success = false;
for (const attempt of s1attempts) {
  try {
    const result = await attempt.fn();
    if (result && result.length > 0) {
      console.log(`  ✅ ${attempt.label}: ${result.length} entries`);
      console.log(`     First: "${result[0].text}" at ${result[0].offset}ms`);
      console.log(`     Last:  "${result[result.length - 1].text}" at ${result[result.length - 1].offset}ms`);
      s1Success = true;
      break;
    } else {
      console.log(`  ⚠️  ${attempt.label}: empty result`);
    }
  } catch (err: any) {
    console.log(`  ❌ ${attempt.label}: ${err.message}`);
  }
}
if (!s1Success) console.log("  ❌ All youtube-transcript attempts failed\n");

// Strategy 2: youtube-transcript-api-js
console.log("\n━━━ Strategy 2: youtube-transcript-api-js ━━━");

let s2Success = false;
try {
  const api = new YouTubeTranscriptApi();
  
  // Try with English
  let result;
  try {
    result = await api.fetch(videoId, ["en"]);
    console.log(`  ✅ fetch(en): ${result.snippets.length} snippets`);
  } catch (err: any) {
    console.log(`  ❌ fetch(en): ${err.message}`);
    // Try without language
    result = await api.fetch(videoId);
    console.log(`  ✅ fetch(no-lang): ${result.snippets.length} snippets`);
  }

  if (result && result.snippets.length > 0) {
    s2Success = true;
    const first = result.snippets[0];
    const last = result.snippets[result.snippets.length - 1];
    console.log(`     Language: ${result.language} (${result.languageCode})`);
    console.log(`     Generated: ${result.isGenerated}`);
    console.log(`     First: "${first.text}" at ${first.start}s`);
    console.log(`     Last:  "${last.text}" at ${last.start}s`);
    
    const totalChars = result.snippets.reduce((sum: number, s: any) => sum + s.text.length, 0);
    console.log(`     Total text: ${totalChars} chars`);
  }
} catch (err: any) {
  console.log(`  ❌ Failed: ${err.message}`);
}

// Summary
console.log("\n━━━ Summary ━━━");
console.log(`  Strategy 1 (youtube-transcript):     ${s1Success ? "✅ WORKS" : "❌ FAILED"}`);
console.log(`  Strategy 2 (youtube-transcript-api): ${s2Success ? "✅ WORKS" : "❌ FAILED"}`);
console.log(`  Overall: ${s1Success || s2Success ? "✅ Transcript CAN be fetched" : "❌ No strategy works from this machine"}`);
console.log("");

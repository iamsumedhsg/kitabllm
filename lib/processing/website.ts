import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import * as cheerio from "cheerio";

export interface WebsiteExtractionResult {
  title: string;
  content: string;
  excerpt: string;
  url: string;
  siteName?: string;
}

/**
 * Extract readable content from a URL
 */
export async function extractWebsite(url: string): Promise<WebsiteExtractionResult> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // First pass: clean with cheerio (remove nav, footer, ads)
  const $ = cheerio.load(html);
  $("nav, footer, header, .advertisement, .ad, [role='banner'], [role='navigation'], script, style, iframe").remove();
  const cleanedHtml = $.html();

  // Second pass: extract with Readability
  const dom = new JSDOM(cleanedHtml, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent) {
    // Fallback: just get the text content
    const fallbackDom = new JSDOM(cleanedHtml, { url });
    const bodyText = fallbackDom.window.document.body?.textContent || "";
    return {
      title: $("title").text() || url,
      content: bodyText.trim(),
      excerpt: bodyText.slice(0, 200),
      url,
    };
  }

  return {
    title: article.title || url,
    content: article.textContent.trim(),
    excerpt: article.excerpt || article.textContent.slice(0, 200),
    url,
    siteName: article.siteName || undefined,
  };
}

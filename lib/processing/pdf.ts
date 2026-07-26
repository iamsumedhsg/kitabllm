import { PDFParse } from "pdf-parse";

export interface PDFPage {
  text: string;
  pageNumber: number;
}

export interface PDFExtractionResult {
  text: string;
  pages: PDFPage[];
  numPages: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

/**
 * Extract text from a PDF buffer
 */
export async function extractPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  const textResult = await parser.getText();
  const infoResult = await parser.getInfo();

  const pages: PDFPage[] = textResult.pages
    .map((page, index) => ({
      text: page.text.trim(),
      pageNumber: index + 1,
    }))
    .filter((page) => page.text.length > 0);

  const fullText = textResult.text || pages.map((p) => p.text).join("\n\n");

  await parser.destroy();

  return {
    text: fullText,
    pages,
    numPages: pages.length,
    metadata: {
      title: infoResult.info?.title || undefined,
      author: infoResult.info?.author || undefined,
      subject: infoResult.info?.subject || undefined,
    },
  };
}

/**
 * Debug script: Check what chunks exist for a given page number
 * Run: bunx tsx scripts/debug-pages.ts
 */
import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // 1. Check total chunk count and page distribution
  const totalRes = await pool.query(`
    SELECT COUNT(*) as total, 
           COUNT("pageNumber") as with_page,
           COUNT(*) - COUNT("pageNumber") as without_page
    FROM "Chunk"
  `);
  console.log("\n=== CHUNK OVERVIEW ===");
  console.log(totalRes.rows[0]);

  // 2. Check page number distribution
  const pageDistRes = await pool.query(`
    SELECT "pageNumber", COUNT(*) as chunks, 
           AVG(LENGTH(content)) as avg_content_length
    FROM "Chunk"
    WHERE "pageNumber" IS NOT NULL
    GROUP BY "pageNumber"
    ORDER BY "pageNumber"
    LIMIT 40
  `);
  console.log("\n=== PAGE DISTRIBUTION (first 40 pages) ===");
  console.table(pageDistRes.rows);

  // 3. Show actual content for page 35
  const page35Res = await pool.query(`
    SELECT id, "chunkNumber", "pageNumber", LENGTH(content) as content_len,
           LEFT(content, 200) as content_preview
    FROM "Chunk"
    WHERE "pageNumber" = 35
    ORDER BY "chunkNumber"
  `);
  console.log("\n=== PAGE 35 CHUNKS ===");
  console.log(`Found ${page35Res.rows.length} chunks for page 35`);
  for (const row of page35Res.rows) {
    console.log(`\n--- Chunk #${row.chunkNumber} (${row.content_len} chars) ---`);
    console.log(row.content_preview);
  }

  // 4. For comparison, show page 1 content
  const page1Res = await pool.query(`
    SELECT id, "chunkNumber", "pageNumber", LENGTH(content) as content_len,
           LEFT(content, 200) as content_preview
    FROM "Chunk"
    WHERE "pageNumber" = 1
    ORDER BY "chunkNumber"
  `);
  console.log("\n=== PAGE 1 CHUNKS (for comparison) ===");
  console.log(`Found ${page1Res.rows.length} chunks for page 1`);
  for (const row of page1Res.rows) {
    console.log(`\n--- Chunk #${row.chunkNumber} (${row.content_len} chars) ---`);
    console.log(row.content_preview);
  }

  // 5. Check the source this came from
  const sourceRes = await pool.query(`
    SELECT s.id, s.filename, s.type, s.status, s.metadata
    FROM "Source" s
    INNER JOIN "Chunk" c ON c."sourceId" = s.id
    WHERE c."pageNumber" = 35
    LIMIT 1
  `);
  console.log("\n=== SOURCE INFO ===");
  console.log(sourceRes.rows[0]);

  await pool.end();
}

main().catch(console.error);

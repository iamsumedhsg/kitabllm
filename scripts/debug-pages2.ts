import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Check if there are multiple sources for same notebook
  const sourcesRes = await pool.query(`
    SELECT s.id, s.filename, s.type, s.status, s."notebookId",
           (SELECT COUNT(*) FROM "Chunk" WHERE "sourceId" = s.id) as chunk_count
    FROM "Source" s
    ORDER BY s."createdAt"
  `);
  console.log("\n=== ALL SOURCES ===");
  console.table(sourcesRes.rows);

  // Check page 35 chunks with their sourceId
  const page35Res = await pool.query(`
    SELECT c.id, c."sourceId", c."chunkNumber", c."pageNumber", 
           LENGTH(c.content) as len, LEFT(c.content, 80) as preview
    FROM "Chunk" c
    WHERE c."pageNumber" = 35
  `);
  console.log("\n=== PAGE 35 - ALL CHUNKS WITH SOURCE ID ===");
  console.table(page35Res.rows);

  // Check a page with more content - page 33 or 34
  const page34Res = await pool.query(`
    SELECT c."sourceId", c."chunkNumber", c."pageNumber",
           LENGTH(c.content) as len, LEFT(c.content, 100) as preview
    FROM "Chunk" c
    WHERE c."pageNumber" = 34
    ORDER BY c."chunkNumber"
  `);
  console.log("\n=== PAGE 34 CHUNKS ===");
  console.table(page34Res.rows);

  // Check notebook ID to source mapping
  const notebookRes = await pool.query(`
    SELECT n.id, n.title, 
           (SELECT COUNT(*) FROM "Source" WHERE "notebookId" = n.id) as sources
    FROM "Notebook" n
  `);
  console.log("\n=== NOTEBOOKS ===");
  console.table(notebookRes.rows);

  await pool.end();
}

main().catch(console.error);

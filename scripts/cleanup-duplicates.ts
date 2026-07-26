/**
 * Cleanup: Remove duplicate chunks (keep only one set per source)
 * Run: bun run scripts/cleanup-duplicates.ts
 */
import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Find duplicates: same sourceId + chunkNumber appearing multiple times
  const dupeRes = await pool.query(`
    SELECT "sourceId", "chunkNumber", COUNT(*) as cnt
    FROM "Chunk"
    GROUP BY "sourceId", "chunkNumber"
    HAVING COUNT(*) > 1
    ORDER BY "sourceId", "chunkNumber"
  `);

  console.log(`Found ${dupeRes.rows.length} chunk positions with duplicates`);

  if (dupeRes.rows.length === 0) {
    console.log("No duplicates found. Database is clean.");
    await pool.end();
    return;
  }

  // For each duplicate set, keep the first (oldest) and delete the rest
  let totalDeleted = 0;
  for (const row of dupeRes.rows) {
    const deleteRes = await pool.query(`
      DELETE FROM "Chunk"
      WHERE id IN (
        SELECT id FROM "Chunk"
        WHERE "sourceId" = $1 AND "chunkNumber" = $2
        ORDER BY "createdAt" ASC
        OFFSET 1
      )
    `, [row.sourceId, row.chunkNumber]);
    totalDeleted += deleteRes.rowCount || 0;
  }

  console.log(`Deleted ${totalDeleted} duplicate chunks`);

  // Verify
  const afterRes = await pool.query(`SELECT COUNT(*) as total FROM "Chunk"`);
  console.log(`Remaining chunks: ${afterRes.rows[0].total}`);

  await pool.end();
}

main().catch(console.error);

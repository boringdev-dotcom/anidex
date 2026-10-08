/**
 * Upsert the hand-curated "deep" species (src/data/species/*.json) into Postgres.
 * The server also does this on every start; this script is for local databases.
 *   npm run db:seed
 */
import '../../server/env.ts';
import { pool } from '../../server/db/pool.ts';
import { migrate } from '../../server/db/migrate.ts';
import { seedCurated } from '../../server/db/seed.ts';

if (!pool) throw new Error('DATABASE_URL is not set');
await migrate(pool);
console.log(`seeded ${await seedCurated(pool)} curated species`);
await pool.end();

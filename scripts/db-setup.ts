import 'reflect-metadata';
import { AppDataSource } from '@app/database/data-source';

const MAX_RETRIES = 30;
const RETRY_INTERVAL_MS = 2000;

async function waitForDatabase(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await AppDataSource.initialize();
      return;
    } catch {
      process.stdout.write(
        `Database unavailable (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${RETRY_INTERVAL_MS}ms...\n`,
      );

      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), RETRY_INTERVAL_MS);
      });
    }
  }

  throw new Error('Database did not become available in time');
}

async function seedIfEmpty(): Promise<void> {
  const existing = await AppDataSource.query('SELECT COUNT(1)::int AS count FROM jobs');
  const count = Number(existing[0]?.count ?? 0);

  if (count > 0) {
    process.stdout.write('Seed skipped: data already exists\n');
    return;
  }

  const { default: seed } = await import('./seed-runner');
  await seed();
}

async function main(): Promise<void> {
  await waitForDatabase();
  await AppDataSource.runMigrations();
  await seedIfEmpty();
  await AppDataSource.destroy();
  process.stdout.write('Database setup completed\n');
}

main().catch(async (error: unknown) => {
  process.stderr.write(`Database setup failed: ${String(error)}\n`);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});

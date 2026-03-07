import 'reflect-metadata';
import { AppDataSource } from '@app/database/data-source';
import seedRunner from './seed-runner';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const existing = await AppDataSource.query('SELECT COUNT(1)::int AS count FROM jobs');

  if (Number(existing[0]?.count ?? 0) > 0) {
    process.stdout.write('Seed skipped: data already exists\n');
    await AppDataSource.destroy();
    return;
  }

  await seedRunner();
  process.stdout.write('Seed data created successfully\n');
  await AppDataSource.destroy();
}

main().catch(async (error: unknown) => {
  process.stderr.write(`Seed failed: ${String(error)}\n`);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});

import 'reflect-metadata';
import { AppDataSource } from '@app/database/data-source';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  await AppDataSource.destroy();
  process.stdout.write('Migrations applied successfully\n');
}

main().catch(async (error: unknown) => {
  process.stderr.write(`Migration failed: ${String(error)}\n`);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});

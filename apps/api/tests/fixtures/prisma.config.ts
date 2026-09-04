import { defineConfig } from 'prisma/config';

// Exercise Prisma's real config loader with the scoped deepmerge-ts override.
export default defineConfig({
  schema: '../../prisma/schema.prisma',
  migrations: { path: '../../prisma/migrations' },
});

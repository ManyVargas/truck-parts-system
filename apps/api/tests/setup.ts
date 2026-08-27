import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const monorepoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

for (const candidate of [
  path.join(monorepoRoot, '.env'),
  path.join(monorepoRoot, '.env.test'),
]) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, quiet: true });
  }
}

// Integration tests target a dedicated database when configured.
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

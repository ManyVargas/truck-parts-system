import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

function resolveEnvFilePath(): string | undefined {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '../../.env'),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../.env'),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../.env'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

const envFilePath = resolveEnvFilePath();

if (envFilePath) {
  dotenv.config({ path: envFilePath, quiet: true });
} else {
  dotenv.config({ quiet: true });
}

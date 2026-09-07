import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadTestEnvironment } from './helpers/environment.js';

const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

loadTestEnvironment(monorepoRoot);

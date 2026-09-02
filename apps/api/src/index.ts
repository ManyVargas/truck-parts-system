import './infrastructure/config/load-env.js';

import { createApp } from './app.js';
import { disconnectPrisma } from './infrastructure/database/index.js';

const DEFAULT_PORT = 3000;

const port = Number(process.env.PORT ?? DEFAULT_PORT);

const app = createApp();

const server = app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    try {
      await disconnectPrisma();
      process.exit(0);
    } catch (error) {
      console.error('Error during Prisma disconnect', error);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

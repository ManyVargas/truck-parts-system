import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(process.cwd(), '../..');
  const env = loadEnv(mode, envDir, 'CLOUDFLARE_');
  const tunnelHostname = env.CLOUDFLARE_TUNNEL_HOSTNAME?.trim();

  return {
    envDir,
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'node',
      include: ['tests/**/*.test.{ts,tsx}'],
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: tunnelHostname ? [tunnelHostname] : [],
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});

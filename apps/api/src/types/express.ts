import type { RequestAuth } from '../features/access/types.js';

/* Express Request augmentation requires a namespace merge; there is no module alternative. */
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      /** Path captured at app-level entry, before mounted routers rewrite `req.path`. */
      requestPath: string;
      /** Input parsed by `validate()`. Not written back onto Express getters. */
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
      /** Set by requireAuth. Never includes passwordHash or the raw session token. */
      auth?: RequestAuth;
    }
  }
}

export {};

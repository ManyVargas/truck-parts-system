import type { Request, Response } from 'express';

import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_PATH,
  SESSION_COOKIE_SAME_SITE,
  isSessionCookieSecure,
} from './constants.js';

function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true as const,
    path: SESSION_COOKIE_PATH,
    sameSite: SESSION_COOKIE_SAME_SITE,
    secure: isSessionCookieSecure(process.env.NODE_ENV),
    expires,
  };
}

export function readSessionToken(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) {
    return undefined;
  }

  const prefix = `${SESSION_COOKIE_NAME}=`;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      const value = trimmed.slice(prefix.length);
      return value ? decodeURIComponent(value) : undefined;
    }
  }

  return undefined;
}

export function setSessionCookie(res: Response, sessionToken: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(expiresAt));
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions(new Date(0)));
}

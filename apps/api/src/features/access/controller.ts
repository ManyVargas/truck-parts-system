import type { Request, Response } from 'express';

import { AppError } from '../../infrastructure/errors/app-error.js';
import { toPublicAuthUser, toPublicProfile } from './projection.js';
import { accessService } from './service.js';
import { clearSessionCookie, readSessionToken, setSessionCookie } from './session-cookie.js';
import type { RequestAuth } from './types.js';

function requireValidatedBody<T>(req: Request): T {
  return req.validated?.body as T;
}

function requireRequestAuth(req: Request): RequestAuth {
  if (!req.auth) {
    throw AppError.unauthorized();
  }

  return req.auth;
}

function publicUserFromAuth(auth: RequestAuth) {
  return toPublicAuthUser({
    id: auth.userId,
    username: auth.username,
    name: auth.name,
    role: auth.role,
  });
}

function publicProfileFromAuth(auth: RequestAuth) {
  return toPublicProfile({
    id: auth.userId,
    username: auth.username,
    name: auth.name,
    role: auth.role,
    phone: auth.phone,
    email: auth.email,
    active: auth.active,
    createdAt: auth.createdAt,
    updatedAt: auth.updatedAt,
  });
}

export async function postLogin(req: Request, res: Response): Promise<void> {
  const result = await accessService.login(requireValidatedBody(req), readSessionToken(req));
  setSessionCookie(res, result.sessionToken, result.expiresAt);
  res.status(200).json(toPublicAuthUser(result.user));
}

export async function postLogout(req: Request, res: Response): Promise<void> {
  await accessService.logout(readSessionToken(req));
  clearSessionCookie(res);
  res.status(204).send();
}

export function getSession(req: Request, res: Response): void {
  res.status(200).json(publicUserFromAuth(requireRequestAuth(req)));
}

export function getMe(req: Request, res: Response): void {
  res.status(200).json(publicProfileFromAuth(requireRequestAuth(req)));
}

export async function patchMe(req: Request, res: Response): Promise<void> {
  const user = await accessService.updateOwnProfile(
    requireRequestAuth(req).userId,
    requireValidatedBody(req),
  );
  res.status(200).json(toPublicProfile(user));
}

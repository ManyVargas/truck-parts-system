import { Router } from 'express';

import { validate } from '../../infrastructure/http/validate.js';
import { getMe, getSession, patchMe, postLogin, postLogout } from './controller.js';
import { loginRateLimiter } from './login-rate-limit.js';
import { requireAuth } from './require-auth.js';
import { requireCsrfHeader } from './require-csrf.js';
import { loginBodySchema, updateOwnProfileBodySchema } from './validation.js';

export const accessRouter = Router();

accessRouter.post('/login', loginRateLimiter, validate({ body: loginBodySchema }), postLogin);
accessRouter.post('/logout', requireCsrfHeader, postLogout);
accessRouter.get('/session', requireAuth, getSession);
accessRouter.get('/me', requireAuth, getMe);
accessRouter.patch(
  '/me',
  requireCsrfHeader,
  requireAuth,
  validate({ body: updateOwnProfileBodySchema }),
  patchMe,
);

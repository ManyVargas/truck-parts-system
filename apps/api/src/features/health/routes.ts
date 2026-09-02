import { Router } from 'express';

import { getLive, getReady } from './controller.js';

export const healthRouter = Router();

healthRouter.get('/live', getLive);
healthRouter.get('/ready', getReady);

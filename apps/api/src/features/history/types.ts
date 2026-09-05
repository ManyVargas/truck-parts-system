import type { z } from 'zod';
import type { historyEventSchema } from './validation.js';

export type HistoryEventInput = z.infer<typeof historyEventSchema>;
export type HistoryActor = HistoryEventInput['actor'];

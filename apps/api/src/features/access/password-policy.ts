import { z } from 'zod';

// Never trim, lowercase or normalize passwords. Count Unicode code points.
export const passwordSchema = z.string().refine((value) => Array.from(value).length >= 6, {
  message: 'Password must contain at least 6 characters',
});

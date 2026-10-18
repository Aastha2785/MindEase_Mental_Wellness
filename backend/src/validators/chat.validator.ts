
import { z } from 'zod';

export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20)
    .refine(
      (messages) => messages[messages.length - 1]?.role === 'user',
      'The last message must be from the user',
    ),
});

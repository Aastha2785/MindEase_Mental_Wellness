
import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { generateChatReply } from '../services/chat.service.js';
import { chatRequestSchema } from '../validators/chat.validator.js';

export async function chat(req: AuthRequest, res: Response) {
  const validation = chatRequestSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      message: 'Invalid chat request',
      errors: validation.error.flatten(),
    });
  }

  try {
    const reply = await generateChatReply(validation.data.messages);

    return res.status(200).json({ reply });
  } catch (error: unknown) {
    const err = error as {
      status?: number;
      code?: string;
      message?: string;
      error?: { message?: string; code?: string };
    };

    // Detailed diagnostics stay in the backend terminal.
    console.error('Chat generation failed:', {
      status: err.status,
      code: err.code ?? err.error?.code,
      message: err.error?.message ?? err.message,
    });

    return res.status(502).json({
      message: 'Unable to generate a response right now. Please try again.',
    });
  }
}

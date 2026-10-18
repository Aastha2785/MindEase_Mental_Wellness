
import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_KEY_JOU?.trim();

if (!apiKey) {
  throw new Error(
    'GROQ_KEY_JOU is missing from backend environment variables'
  );
}

export const journalGroq = new Groq({
  apiKey,
  timeout: 30000,
  maxRetries: 1,
});

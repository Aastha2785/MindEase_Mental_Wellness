
import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY?.trim();

if (!apiKey) {
  throw new Error(
    'GROQ_API_KEY is missing from backend environment variables',
  );
}

export const groq = new Groq({
  apiKey,
  timeout: 30000,
  maxRetries: 1,
});

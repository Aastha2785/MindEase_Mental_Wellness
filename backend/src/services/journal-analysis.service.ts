
import { journalGroq } from './journal-groq.service.js';

export type JournalMoodAnalysis = {
  eligible: boolean;
  emotions: {
    happy: number;
    sad: number;
    stressed: number;
    angry: number;
  };
  dominantEmotion: 'happy' | 'sad' | 'stressed' | 'angry' | 'unclear';
  stressPercentage: number;
  anxietyPercentage: number;
  insight: string;
};

const MODEL = 'openai/gpt-oss-120b';

const SYSTEM_PROMPT = `
You are the emotional-text analysis engine for MindEase,
a student mental-wellness application.

Analyze the emotional expression in a journal entry.
Do not diagnose mental-health conditions.

Return ONLY a valid JSON object with this exact structure:
{
  "eligible": true,
  "emotions": {
    "happy": 25,
    "sad": 25,
    "stressed": 25,
    "angry": 25
  },
  "dominantEmotion": "happy",
  "stressPercentage": 25,
  "anxietyPercentage": 20,
  "insight": "A short, kind and supportive insight."
}

Rules:
- Use only the journal text as evidence.
- Percentages for the four emotions must total exactly 100.
- Estimate how strongly each emotion is expressed, not how much
  of the text mentions each emotion.
- Use 0 to 100 for stressPercentage and anxietyPercentage.
- dominantEmotion must be happy, sad, stressed, angry or unclear.
- If the text contains no meaningful emotional evidence, set
  eligible to false, dominantEmotion to unclear, and explain
  briefly that there is not enough emotional information.
- Do not infer an emotion merely because someone asks for advice,
  study tips, facts or general information.
- Never claim to know how a person definitely feels.
- Keep the insight supportive, specific and under 50 words.
- Never include a diagnosis.
`;

function validateAnalysis(value: unknown): JournalMoodAnalysis {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid mood analysis response');
  }

  const result = value as Record<string, any>;
  const emotions = result.emotions;

  if (
    typeof result.eligible !== 'boolean' ||
    !emotions ||
    !['happy', 'sad', 'stressed', 'angry', 'unclear'].includes(
      result.dominantEmotion
    ) ||
    typeof result.insight !== 'string' ||
    !Number.isFinite(result.stressPercentage) ||
    !Number.isFinite(result.anxietyPercentage)
  ) {
    throw new Error('Incomplete mood analysis response');
  }

  const values = [
    emotions.happy,
    emotions.sad,
    emotions.stressed,
    emotions.angry,
  ];

  if (
    !values.every(
      (n: unknown) =>
        typeof n === 'number' &&
        Number.isInteger(n) &&
        n >= 0 &&
        n <= 100
    ) ||
    values.reduce((sum: number, n: number) => sum + n, 0) !== 100 ||
    result.stressPercentage < 0 ||
    result.stressPercentage > 100 ||
    result.anxietyPercentage < 0 ||
    result.anxietyPercentage > 100
  ) {
    throw new Error('Mood percentages are invalid');
  }

  return result as JournalMoodAnalysis;
}

export async function analyzeJournalText(
  journalText: string
): Promise<JournalMoodAnalysis> {
  const text = journalText.trim();

  if (text.length < 10 || text.length > 10000) {
    throw new Error(
      'Journal text must contain between 10 and 10000 characters.'
    );
  }

  const completion = await journalGroq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analyze this journal entry:\n\n${text}`,
      },
    ],
    temperature: 0.2,
    max_completion_tokens: 600,
    response_format: { type: 'json_object' },
  });

  const content = completion.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('The mood analysis returned an empty response.');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('The mood analysis returned invalid JSON.');
  }

  return validateAnalysis(parsed);
}

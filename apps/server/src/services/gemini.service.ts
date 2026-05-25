import { GoogleGenerativeAI } from '@google/generative-ai';
import { ValidationError, ExternalAPIError } from '../errors';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// responseMimeType forces Gemini to return raw JSON — no markdown fences, no prose wrapping
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' },
});

export interface SongSuggestion {
  title: string;
  artist: string;
}

// Patterns that try to override the system prompt or inject new instructions
const INJECTION_PATTERNS = [
  /ignore\s+(previous|prior|above)\s+instructions/i,
  /you\s+are\s+now/i,
  /system\s*:/i,
  /forget\s+(everything|all)/i,
  /new\s+instructions/i,
  /disregard/i,
];

function validateVibeInput(vibe: string): void {
  if (vibe.length > 300) {
    throw new ValidationError('Vibe description must be 300 characters or fewer');
  }
  if (INJECTION_PATTERNS.some((pattern) => pattern.test(vibe))) {
    throw new ValidationError('Invalid vibe description');
  }
}

function buildSystemPrompt(): string {
  const year = new Date().getFullYear();
  return `You are a music curator. Today's year is ${year}. Given a mood or vibe description, suggest exactly 20 songs that match it.

Prefer songs released in the last 3-4 years where possible. Only reach further back if the vibe explicitly calls for older music (e.g. "nostalgic 80s", "classic rock", "old school R&B"). For genre or cultural requests, include recent releases from that scene — not just the well-known older hits.

Return ONLY a JSON array with exactly 20 objects. Each object must have exactly two fields: "title" and "artist".
No explanations, no extra fields, no markdown — raw JSON array only.

Example format:
[
  { "title": "Song Name", "artist": "Artist Name" },
  ...
]`;
}

export const geminiService = {
  async getSuggestions(vibe: string): Promise<SongSuggestion[]> {
    // sync check — runs in <1ms, no network cost
    validateVibeInput(vibe);

    let result;
    try {
      result = await model.generateContent(`${buildSystemPrompt()}\n\nVibe: ${vibe}`);
    } catch (err) {
      throw new ExternalAPIError('Gemini request failed');
    }

    const raw = result.response.text();

    let suggestions: unknown;
    try {
      suggestions = JSON.parse(raw);
    } catch {
      throw new ExternalAPIError('Gemini returned malformed JSON');
    }

    if (
      !Array.isArray(suggestions) ||
      suggestions.length < 20 ||
      !suggestions.every(
        (s) =>
          typeof s === 'object' &&
          s !== null &&
          typeof (s as Record<string, unknown>).title === 'string' &&
          typeof (s as Record<string, unknown>).artist === 'string'
      )
    ) {
      throw new ExternalAPIError('Gemini returned an unexpected response shape');
    }

    return suggestions as SongSuggestion[];
  },
};

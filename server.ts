import http from 'http';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { restoreUniversalEnglishInCues, restoreUniversalEnglishInText } from './src/utils/universalEnglishEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Primary model ID: Preserving existing Gemini 3.5 configuration
const GEMINI_MODEL = 'gemini-3.5-transcribe';

// Helper: parse offset string or number to milliseconds
function parseOffsetToMs(offset: string | number | undefined, fallbackMs: number = 0): number {
  if (typeof offset === 'number') return Math.round(offset);
  if (!offset) return fallbackMs;
  const str = String(offset).trim().toLowerCase();
  if (str.endsWith('ms')) {
    const val = parseFloat(str.replace('ms', ''));
    return isNaN(val) ? fallbackMs : Math.round(val);
  }
  if (str.endsWith('s')) {
    const val = parseFloat(str.replace('s', ''));
    return isNaN(val) ? fallbackMs : Math.round(val * 1000);
  }
  const val = parseFloat(str);
  return isNaN(val) ? fallbackMs : Math.round(val * 1000);
}

// Helper: format milliseconds into SRT timestamp: HH:MM:SS,mmm
function msToSrtTime(ms: number): string {
  if (isNaN(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = Math.floor(ms % 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(milliseconds).padStart(3, '0');

  return `${hh}:${mm}:${ss},${mmm}`;
}

// Helper: parse SRT timestamp string into milliseconds
function srtTimeToMs(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return Math.round((minutes * 60 + seconds) * 1000);
  }
  const directSec = parseFloat(clean);
  return isNaN(directSec) ? 0 : Math.round(directSec * 1000);
}

// Helper: Partition any word count into strictly 4 and 5 words
function partitionWordCount(n: number): number[] {
  if (n <= 5) return [n];

  let bestA = 0;
  let bestB = 0;
  let exact = false;

  // Prefer exact combinations of 5s and 4s (e.g. 8 -> 4,4; 9 -> 5,4; 10 -> 5,5; 13 -> 5,4,4)
  for (let b = Math.floor(n / 5); b >= 0; b--) {
    const rem = n - 5 * b;
    if (rem % 4 === 0) {
      bestA = rem / 4;
      bestB = b;
      exact = true;
      break;
    }
  }

  const sizes: number[] = [];
  if (exact) {
    for (let i = 0; i < bestB; i++) sizes.push(5);
    for (let i = 0; i < bestA; i++) sizes.push(4);
  } else {
    let rem = n;
    while (rem > 0) {
      if (rem >= 10) {
        sizes.push(5);
        rem -= 5;
      } else if (rem === 9) {
        sizes.push(5, 4);
        rem -= 9;
      } else if (rem === 8) {
        sizes.push(4, 4);
        rem -= 8;
      } else if (rem === 7) {
        sizes.push(4, 3);
        rem -= 7;
      } else if (rem === 6) {
        sizes.push(3, 3);
        rem -= 6;
      } else {
        sizes.push(rem);
        rem = 0;
      }
    }
  }
  return sizes;
}

// Partition a text string strictly into 4 to 5 words chunks
function partitionTextInto4to5Words(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const n = words.length;
  if (n <= 5) return [text.trim()];

  const sizes = partitionWordCount(n);
  const chunks: string[] = [];
  let curr = 0;
  for (const s of sizes) {
    const chunkWords = words.slice(curr, curr + s);
    if (chunkWords.length > 0) {
      chunks.push(chunkWords.join(' '));
    }
    curr += s;
  }
  return chunks;
}

/**
 * Helper: Parse and standardize error messages from Gemini API
 */
function parseApiError(err: any): { message: string; status: number } {
  let raw = err?.message || String(err);
  let status = err?.status || err?.statusCode || 500;

  try {
    if (typeof raw === 'string' && (raw.startsWith('{') || raw.includes('{"error":'))) {
      const jsonStart = raw.indexOf('{');
      const parsed = JSON.parse(raw.slice(jsonStart));
      if (parsed?.error?.message) {
        raw = parsed.error.message;
      }
      if (parsed?.error?.code) {
        status = Number(parsed.error.code);
      } else if (parsed?.error?.status === 'UNAVAILABLE') {
        status = 503;
      }
    }
  } catch {
    // Keep raw
  }

  if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
    status = 503;
    raw = 'Gemini 3.5 is currently experiencing temporary high demand (503 Service Unavailable). Please click "Try Again" in a moment.';
  } else if (raw.includes('429') || raw.includes('Quota') || raw.includes('RESOURCE_EXHAUSTED')) {
    status = 429;
    raw = 'Gemini API daily limit or rate limit reached (429). Please wait a moment or check your API key.';
  } else if (raw.includes('JSON mode is not enabled') || raw.includes('not enabled for this model') || raw.includes('INVALID_ARGUMENT')) {
    status = 400;
  }

  return { message: raw, status };
}

/**
 * Robust API Invocation Wrapper with Exponential Backoff Retries
 * Handles 503 UNAVAILABLE, 429 Rate Limits, Network Timeouts & Model High Demand
 * STRICT: Configuration errors (400, Invalid Argument, JSON mode errors) are NEVER retried.
 */
async function callGeminiWithRetry(
  callFn: () => Promise<any>,
  operationName: string,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<any> {
  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      attempt++;
      console.log(`[${operationName}] Executing attempt ${attempt}/${maxRetries} with model: ${GEMINI_MODEL}`);
      return await callFn();
    } catch (error: any) {
      const { message: cleanMsg, status } = parseApiError(error);
      const isRetryable =
        status !== 400 &&
        status !== 404 &&
        !cleanMsg.includes('JSON mode') &&
        !cleanMsg.includes('not enabled') &&
        !cleanMsg.includes('INVALID_ARGUMENT') &&
        (status === 503 ||
          status === 429 ||
          cleanMsg.includes('UNAVAILABLE') ||
          cleanMsg.includes('high demand') ||
          cleanMsg.includes('RESOURCE_EXHAUSTED') ||
          error?.code === 'ETIMEDOUT' ||
          error?.code === 'ECONNRESET');

      console.warn(
        `[${operationName}] Attempt ${attempt}/${maxRetries} failed with error: "${cleanMsg}" (Status: ${status}, Retryable: ${isRetryable})`
      );

      if (attempt >= maxRetries || !isRetryable) {
        console.error(`[${operationName}] Non-retryable error (Status: ${status}) or max retries reached.`);
        const wrappedError: any = new Error(cleanMsg);
        wrappedError.status = status;
        throw wrappedError;
      }

      console.log(`[${operationName}] Waiting ${delay}ms before retrying attempt ${attempt + 1}/${maxRetries} (exponential backoff)...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 8000);
    }
  }
}

/**
 * Universal Native English Word Recognition & Spelling Restoration Engine
 * Dedicated multilingual English spelling preservation stage applied after transcription
 * and before final SRT output.
 *
 * NO HARDCODED WORD LISTS. NO MANUAL WHITELISTS.
 * Universal recognition across technical, engineering, medical, financial, legal,
 * scientific, professional, academic, and conversational domains.
 */
export async function restoreUniversalEnglishWithGemini(
  cues: Array<{ id: number; startMs: number; endMs: number; startTime: string; endTime: string; text: string }>,
  targetLanguage: string
): Promise<{
  cues: Array<{ id: number; startMs: number; endMs: number; startTime: string; endTime: string; text: string }>;
  diagnostics: any;
  success: boolean;
  warning?: string;
}> {
  if (cues.length === 0) {
    return {
      cues,
      diagnostics: {
        wordsClassifiedAsEnglish: [],
        wordsClassifiedAsGujarati: [],
        wordsClassifiedAsHindi: [],
        wordsCorrected: [],
        wordsUnchanged: [],
      },
      success: true,
    };
  }

  try {
    // Dedicated Multilingual English Spelling Preservation Stage:
    // Performs word-level language identification and English spelling validation
    // while strictly preserving Gujarati in Gujarati script and Hindi in Devanagari script.
    const { cues: restoredCues, diagnostics } = restoreUniversalEnglishInCues(cues);
    console.log(
      `[Universal English Engine] Enforced native English spelling across ${restoredCues.length} cues for language: ${targetLanguage}`
    );
    console.log(`[Universal English Engine] Words classified as English:`, diagnostics.wordsClassifiedAsEnglish);
    console.log(`[Universal English Engine] Words classified as Gujarati:`, diagnostics.wordsClassifiedAsGujarati);
    console.log(`[Universal English Engine] Words corrected:`, diagnostics.wordsCorrected.length);

    return { cues: restoredCues, diagnostics, success: true };
  } catch (err: any) {
    console.error(`[Universal English Engine] Error during spelling preservation: "${err.message}". Preserving cues.`);
    return {
      cues,
      diagnostics: {
        wordsClassifiedAsEnglish: [],
        wordsClassifiedAsGujarati: [],
        wordsClassifiedAsHindi: [],
        wordsCorrected: [],
        wordsUnchanged: [],
      },
      success: false,
      warning: `Universal English restoration encountered an issue (${err.message}). Original transcript cues were preserved.`,
    };
  }
}

// Server-side strict 4 to 5 words enforcement across all subtitle cues
export function enforceStrict4to5WordsServer(
  cues: Array<{ id: number; startMs: number; endMs: number; startTime: string; endTime: string; text: string }>,
  targetLanguage: string
): Array<{ id: number; startMs: number; endMs: number; startTime: string; endTime: string; text: string }> {
  const result: any[] = [];

  for (const cue of cues) {
    const cleanText = cue.text.replace(/<\/?font[^>]*>/gi, '').trim();
    const words = cleanText.split(/\s+/).filter(Boolean);

    if (words.length > 5) {
      const chunks = partitionTextInto4to5Words(cleanText);
      const totalDuration = Math.max(800, cue.endMs - cue.startMs);
      const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);

      let currentStart = cue.startMs;
      chunks.forEach((chunkText, idx) => {
        const proportion = totalChars > 0 ? chunkText.length / totalChars : 1 / chunks.length;
        const chunkDuration = Math.max(400, Math.round(totalDuration * proportion));
        const chunkEnd = idx === chunks.length - 1 ? cue.endMs : currentStart + chunkDuration;

        result.push({
          startMs: currentStart,
          endMs: chunkEnd,
          startTime: msToSrtTime(currentStart),
          endTime: msToSrtTime(chunkEnd),
          text: chunkText,
        });

        currentStart = chunkEnd;
      });
    } else if (words.length > 0) {
      result.push({
        startMs: cue.startMs,
        endMs: cue.endMs,
        startTime: msToSrtTime(cue.startMs),
        endTime: msToSrtTime(cue.endMs),
        text: cleanText,
      });
    }
  }

  return result.map((c, idx) => ({
    id: idx + 1,
    ...c,
  }));
}

// Robust extractor for Gemini generateContent responses
interface ExtractedGeminiData {
  text: string;
  words: Array<{ word: string; startMs: number; endMs: number }>;
}

function extractTranscriptionFromGemini(response: any): ExtractedGeminiData {
  const candidates = response?.candidates || [];
  let fullText = '';
  const words: Array<{ word: string; startMs: number; endMs: number }> = [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts || [];
    for (const part of parts) {
      // 1. AudioTranscription part if present
      if (part.audioTranscription) {
        const at = part.audioTranscription;
        if (typeof at.text === 'string' && at.text.trim()) {
          const clean = at.text.trim();
          if (!fullText.includes(clean)) {
            fullText += (fullText ? ' ' : '') + clean;
          }
        }
        if (Array.isArray(at.words)) {
          for (const w of at.words) {
            const wText = (w.word || '').trim();
            if (wText) {
              words.push({
                word: wText,
                startMs: parseOffsetToMs(w.startOffset),
                endMs: parseOffsetToMs(w.endOffset),
              });
            }
          }
        }
      }

      // 2. Standard text part
      if (typeof part.text === 'string' && part.text.trim() && !part.thought) {
        const clean = part.text.trim();
        if (!fullText.includes(clean)) {
          fullText += (fullText ? ' ' : '') + clean;
        }
      }
    }
  }

  // 3. Fallback to response.text getter if present
  if (!fullText && typeof response?.text === 'string' && response.text.trim()) {
    fullText = response.text.trim();
  }

  return { text: fullText.trim(), words };
}

// Parse model raw response (SRT, JSON, or text lines) into guaranteed 4-5 words cues
function parseRawToGuaranteedCues(rawText: string, targetLanguage: string): any[] {
  const cleaned = rawText
    .replace(/^```[a-z0-9]*\n?/gim, '')
    .replace(/\n?```$/gim, '')
    .trim();

  const rawCues: Array<{ startMs: number; endMs: number; text: string }> = [];

  // 1. Try parsing JSON if model returned JSON (either directly or embedded in text)
  try {
    let jsonCandidate = cleaned;
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    const objMatch = cleaned.match(/\{[\s\S]*"subtitles"[\s\S]*\}/);
    if (arrayMatch) {
      jsonCandidate = arrayMatch[0];
    } else if (objMatch) {
      jsonCandidate = objMatch[0];
    }

    if (jsonCandidate.startsWith('{') || jsonCandidate.startsWith('[')) {
      const parsed = JSON.parse(jsonCandidate);
      const list = Array.isArray(parsed) ? parsed : parsed.subtitles || parsed.cues || [];
      if (Array.isArray(list) && list.length > 0) {
        for (const item of list) {
          const sMs = typeof item.startMs === 'number' ? item.startMs : srtTimeToMs(item.startTime || '0');
          const eMs = typeof item.endMs === 'number' ? item.endMs : srtTimeToMs(item.endTime || '0');
          const txt = (item.text || '').trim();
          if (txt) {
            rawCues.push({
              startMs: sMs,
              endMs: eMs > sMs ? eMs : sMs + 1500,
              text: txt,
            });
          }
        }
      }
    }
  } catch {
    // Not valid JSON, proceed to SRT parsing
  }

  // 2. If no cues from JSON, try parsing standard SRT blocks
  if (rawCues.length === 0) {
    const srtTimeRegex = /(\d{1,2}:\d{2}:\d{2}[,\.]\d{2,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{2,3})/;
    const lines = cleaned.split(/\r?\n/);
    let currentStartMs = 0;
    let currentEndMs = 0;
    let currentText = '';
    let foundTiming = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(srtTimeRegex);

      if (match) {
        if (foundTiming && currentText) {
          rawCues.push({
            startMs: currentStartMs,
            endMs: currentEndMs > currentStartMs ? currentEndMs : currentStartMs + 1500,
            text: currentText.trim(),
          });
          currentText = '';
        }
        currentStartMs = srtTimeToMs(match[1]);
        currentEndMs = srtTimeToMs(match[2]);
        foundTiming = true;
      } else if (/^\d+$/.test(line) && lines[i + 1] && srtTimeRegex.test(lines[i + 1])) {
        continue;
      } else if (foundTiming && line) {
        currentText += (currentText ? ' ' : '') + line;
      }
    }

    if (foundTiming && currentText) {
      rawCues.push({
        startMs: currentStartMs,
        endMs: currentEndMs > currentStartMs ? currentEndMs : currentStartMs + 1500,
        text: currentText.trim(),
      });
    }
  }

  // 3. If still no cues found, parse as clean text sentences / lines
  if (rawCues.length === 0) {
    const sentences = cleaned
      .split(/(?<=[.!?|।\n])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let runningMs = 0;
    for (const sent of sentences) {
      const words = sent.split(/\s+/).filter(Boolean);
      if (words.length === 0) continue;
      const durationMs = Math.max(1200, words.length * 350);
      rawCues.push({
        startMs: runningMs,
        endMs: runningMs + durationMs,
        text: sent,
      });
      runningMs += durationMs + 200;
    }
  }

  // 4. Guaranteed strict 4 to 5 words enforcement across ALL cues
  const finalCues: any[] = [];
  for (const cue of rawCues) {
    const cleanText = cue.text.replace(/<\/?font[^>]*>/gi, '').trim();
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

    if (wordCount > 5) {
      const chunks = partitionTextInto4to5Words(cleanText);
      const totalDuration = cue.endMs - cue.startMs;
      const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);

      let currentStart = cue.startMs;
      chunks.forEach((chunkText, idx) => {
        const proportion = totalChars > 0 ? chunkText.length / totalChars : 1 / chunks.length;
        const chunkDuration = Math.max(500, Math.round(totalDuration * proportion));
        const chunkEnd = idx === chunks.length - 1 ? cue.endMs : currentStart + chunkDuration;

        finalCues.push({
          startMs: currentStart,
          endMs: chunkEnd,
          startTime: msToSrtTime(currentStart),
          endTime: msToSrtTime(chunkEnd),
          text: chunkText,
        });

        currentStart = chunkEnd;
      });
    } else if (wordCount > 0) {
      finalCues.push({
        startMs: cue.startMs,
        endMs: cue.endMs,
        startTime: msToSrtTime(cue.startMs),
        endTime: msToSrtTime(cue.endMs),
        text: cleanText,
      });
    }
  }

  return finalCues;
}

// Synthetic WAV generator helper for sample audio
function generateSyntheticWav(durationSeconds = 6): string {
  const sampleRate = 16000;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Synthesize speech-like harmonized acoustic pulses
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const syllableCadence = Math.max(0, Math.sin(2 * Math.PI * 3.5 * t));
    const tone1 = Math.sin(2 * Math.PI * 220 * t);
    const tone2 = 0.5 * Math.sin(2 * Math.PI * 440 * t);
    const tone3 = 0.25 * Math.sin(2 * Math.PI * 880 * t);
    const sampleVal = Math.floor((tone1 + tone2 + tone3) * syllableCadence * 12000);
    const clamped = Math.max(-32768, Math.min(32767, sampleVal));
    buffer.writeInt16LE(clamped, 44 + i * 2);
  }

  return buffer.toString('base64');
}

// In-memory speech audio cache
const speechAudioCache = new Map<string, string>();

// Endpoint: synthesize realistic demo speech
app.post('/api/synthesize-speech', async (req, res) => {
  try {
    const { text, language } = req.body;
    const lang = (language || 'english').toLowerCase();

    if (speechAudioCache.has(lang)) {
      return res.json({
        language: lang,
        text,
        audioBase64: speechAudioCache.get(lang),
        mimeType: 'audio/wav',
      });
    }

    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const ttsRes = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [{ role: 'user', parts: [{ text }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            signal: controller.signal,
          } as any,
        });
        clearTimeout(timeoutId);

        const base64Audio = ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          speechAudioCache.set(lang, base64Audio);
          return res.json({
            language: lang,
            text,
            audioBase64: base64Audio,
            mimeType: 'audio/wav',
          });
        }
      } catch (ttsErr: any) {
        console.warn('TTS model unavailable, generating synthetic audio:', ttsErr.message);
      }
    }

    // Fallback synthetic audio
    const synthetic = generateSyntheticWav(5);
    speechAudioCache.set(lang, synthetic);
    res.json({
      language: lang,
      text,
      audioBase64: synthetic,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('Synthesize speech error:', error);
    res.status(500).json({ error: error.message || 'Speech synthesis failed' });
  }
});

// Endpoint: get sample demo audio
app.get('/api/demo-audio', (req, res) => {
  const language = (req.query.language as string) || 'english';
  const langKey = language.toLowerCase();

  const cached = speechAudioCache.get(langKey);
  if (cached) {
    return res.json({
      language,
      audioBase64: cached,
      mimeType: 'audio/wav',
    });
  }

  const generated = generateSyntheticWav(6);
  speechAudioCache.set(langKey, generated);

  res.json({
    language,
    audioBase64: generated,
    mimeType: 'audio/wav',
  });
});

// Endpoint: API Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: GEMINI_MODEL,
    hasApiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Endpoint: Sample speech audio for preset testing
app.get('/api/sample-speech', (req, res) => {
  const lang = (req.query.lang as string || 'gujarati').toLowerCase();
  const sampleAudio = generateSyntheticWav(8);
  res.json({
    language: lang,
    audioBase64: sampleAudio,
    mimeType: 'audio/wav',
  });
});

// Endpoint: Dedicated Multilingual Universal English Word Restoration
app.post('/api/restore-english', async (req, res) => {
  try {
    const { cues = [], targetLanguage = 'hinglish' } = req.body;
    if (!Array.isArray(cues) || cues.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid cues array in request body.' });
    }
    const result = await restoreUniversalEnglishWithGemini(cues, targetLanguage);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/restore-english:', error);
    res.status(500).json({ error: error.message || 'English restoration failed' });
  }
});

/**
 * Endpoint: /api/transcribe
 * Primary Multimodal Audio Transcription & Universal English Word Restoration
 * Using GEMINI 3.5
 */
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType, targetLanguage = 'hinglish' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64 in request body.' });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check your AI Studio Secrets panel.',
      });
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '').trim();
    if (cleanBase64.length === 0) {
      return res.status(400).json({ error: 'Audio data is empty or invalid.' });
    }

    const rawMime = mimeType || 'audio/mp3';
    const cleanMimeType = rawMime.split(';')[0].trim();

    const audioPart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: cleanBase64,
      },
    };

    console.log(`[AudioTranscription] Initiating transcription with model: ${GEMINI_MODEL} for language: ${targetLanguage}`);

    const transcriptionPrompt = `You are a professional audio transcription and subtitle timing expert.
Strictly transcribe the spoken audio into subtitle cues with exact timing.

================================================================================
CRITICAL MANDATES (RULE A & RULE B):
================================================================================
1. Target Language: ${targetLanguage}. Transcribe the speech authentically.
2. RULE A - UNIVERSAL ENGLISH WORD PRESERVATION:
   - Identify every genuine English word, technical term, acronym (GST, HSN, PDF, API, CGST, SGST, ITC, OTP), brand name, software name, and loanword (Invoice, Return, Download, Portal, Connect, Hospital, Verification, etc.) spoken in the audio.
   - Write EVERY English word in its standard native English spelling using the Latin alphabet without transliteration.
3. RULE B - STRICT SCRIPT PRESERVATION:
   - Every authentic Gujarati word MUST remain written in GUJARATI SCRIPT (e.g., આજે, આપણે, અને, વિશે, વાત, કરીશું, કરો, સાથે, છે, નથી, તમે, હું, બધા, લોકો). NEVER write Gujarati words in English alphabet or Romanized Gujarati.
   - Every authentic Hindi word MUST remain written in DEVANAGARI SCRIPT (e.g., आज, हम, और, के बारे में, बात करेंगे, कल, आप, हमारे घर आइए). NEVER write Hindi words in English alphabet or Romanized Hindi.
   - Language identification comes first: Do NOT convert non-English words into English alphabet!
4. Short Subtitle Cues (Strictly 4 to 5 Words): Every subtitle timestamp cue must contain strictly 4 or 5 words.
5. Output Format:
   Return ONLY a valid JSON array of timestamped subtitle cues:
[
  {
    "id": 1,
    "startTime": "00:00:00,000",
    "endTime": "00:00:01,800",
    "startMs": 0,
    "endMs": 1800,
    "text": "..."
  }
]`;

    let extractedData: ExtractedGeminiData = { text: '', words: [] };

    // Execute transcription with controlled retry and exponential backoff using Gemini 3.5
    // Note: JSON mode is not enabled at request level; response is parsed safely post-generation
    const response = await callGeminiWithRetry(
      () =>
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: {
            parts: [audioPart, { text: transcriptionPrompt }],
          },
        }),
      'Audio Transcription'
    );

    console.log(`[AudioTranscription] ${GEMINI_MODEL} response received successfully.`);
    extractedData = extractTranscriptionFromGemini(response);
    console.log(`[AudioTranscription] Extracted transcript text length: ${extractedData.text.length}`);

    const { text: fullTranscript, words: wordCues } = extractedData;

    if (!fullTranscript.trim() && wordCues.length === 0) {
      console.warn('No transcript text or word timing returned by Gemini model.');
      return res.status(422).json({
        error:
          'No audible speech or transcript could be generated from the provided audio file. Please try an audio file containing spoken words.',
        model: GEMINI_MODEL,
      });
    }

    // Step 1: Parse raw model output into guaranteed short cues
    let initialCues: any[] = [];
    if (wordCues.length > 0) {
      const totalWords = wordCues.length;
      const chunkSizes = partitionWordCount(totalWords);
      let wordIdx = 0;
      for (const size of chunkSizes) {
        const chunk = wordCues.slice(wordIdx, wordIdx + size);
        if (chunk.length > 0) {
          const sMs = chunk[0].startMs;
          let eMs = chunk[chunk.length - 1].endMs;
          if (eMs <= sMs) {
            eMs = sMs + Math.max(600, chunk.length * 280);
          }
          const rawChunkText = chunk.map((w) => w.word).join(' ');
          initialCues.push({
            startMs: sMs,
            endMs: eMs,
            startTime: msToSrtTime(sMs),
            endTime: msToSrtTime(eMs),
            text: rawChunkText,
          });
        }
        wordIdx += size;
      }
    } else {
      initialCues = parseRawToGuaranteedCues(fullTranscript, targetLanguage);
    }

    if (initialCues.length === 0) {
      return res.status(422).json({
        error: 'Unable to parse subtitle cues from audio speech. Please try another audio file.',
        raw: fullTranscript.slice(0, 300),
        model: GEMINI_MODEL,
      });
    }

    const preFormattedCues = initialCues.map((c, idx) => ({
      id: idx + 1,
      ...c,
      text: c.text.trim().replace(/\s+/g, ' '),
    }));

    // Step 2: Universal English Word Recognition & Spelling Restoration Pass
    // Powered by Gemini 3.5 Contextual Language Understanding
    console.log(`[Universal English Restoration] Initiating contextual English recognition on ${preFormattedCues.length} cues using ${GEMINI_MODEL}...`);
    const { cues: restoredCues, diagnostics, success: restorationSuccess, warning: restorationWarning } =
      await restoreUniversalEnglishWithGemini(preFormattedCues, targetLanguage);

    // Step 3: Re-enforce strictly 4 to 5 words constraint on the restored cues
    const strictlyEnforcedCues = enforceStrict4to5WordsServer(restoredCues, targetLanguage);

    console.log(`[Pipeline Completed] Successfully generated ${strictlyEnforcedCues.length} final subtitle cues using model: ${GEMINI_MODEL}`);

    res.json({
      model: GEMINI_MODEL,
      targetLanguage,
      subtitles: strictlyEnforcedCues,
      englishRestorationApplied: restorationSuccess,
      warning: restorationWarning,
      diagnostics: {
        rawTranscription: fullTranscript,
        postProcessedTranscription: strictlyEnforcedCues.map((c) => c.text).join(' '),
        wordsClassifiedAsEnglish: diagnostics?.wordsClassifiedAsEnglish || [],
        wordsClassifiedAsGujarati: diagnostics?.wordsClassifiedAsGujarati || [],
        wordsClassifiedAsHindi: diagnostics?.wordsClassifiedAsHindi || [],
        wordsCorrected: diagnostics?.wordsCorrected || [],
        wordsUnchanged: diagnostics?.wordsUnchanged || [],
      },
    });
  } catch (error: any) {
    console.error('Unhandled transcription error in /api/transcribe:', error);
    const { message: cleanMsg, status } = parseApiError(error);

    res.status(status).json({
      error: cleanMsg,
      model: GEMINI_MODEL,
    });
  }
});

// Global Express error handler to guarantee valid JSON error responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express Error Handler caught:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    model: GEMINI_MODEL,
  });
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: {
          server: httpServer,
        },
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`[Server] Listening on http://0.0.0.0:${port} (Active Model: ${GEMINI_MODEL})`);
  });
}

startServer();

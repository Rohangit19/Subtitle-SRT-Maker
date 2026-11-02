import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey && apiKey.length > 5),
    timestamp: new Date().toISOString(),
  });
});

// Audio transcription and SRT subtitle generation endpoint
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType, targetLanguage, wordsPerTimestamp, mode } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audio data in request body' });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check your AI Studio Secrets panel.',
      });
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
    const cleanMimeType = mimeType || 'audio/mp3';
    const targetWords = Number(wordsPerTimestamp) || 4; // strictly 4-5 words default

    // Language guidelines for the model prompt
    let langInstruction = '';
    switch (targetLanguage?.toLowerCase()) {
      case 'gujarati':
        langInstruction = `
Target Language: Gujarati (ગુજરાતી).
Transcribe all speech into standard Gujarati script (દા.ત. "નમસ્તે મિત્રો કેમ છો"). If the speaker speaks English or another language, translate it directly into natural Gujarati script with accurate phrasing.`;
        break;
      case 'hindi':
        langInstruction = `
Target Language: Hindi (हिन्दी).
Transcribe all speech into standard Hindi Devanagari script (उदा. "नमस्ते दोस्तों, कैसे हैं आप?"). If the speaker speaks another language, translate it into natural Hindi script.`;
        break;
      case 'english':
        langInstruction = `
Target Language: English.
Transcribe or translate all speech into natural, accurate, grammatically correct English (e.g. "Hello everyone, welcome back.").`;
        break;
      case 'hinglish':
        langInstruction = `
Target Language: Hinglish (Hindi written phonetically using Latin/English alphabet).
CRITICAL: Do NOT use Devanagari script. Use conversational Romanized Hindi, popular in messaging and subtitle captions (e.g. "Aap sabhi ka swagat hai", "kya chal raha hai aajkal", "yeh video zaroor dekhein").`;
        break;
      case 'gujlish':
        langInstruction = `
Target Language: Gujlish (Gujarati written phonetically using Latin/English alphabet).
CRITICAL: Do NOT use Gujarati script. Use conversational Romanized Gujarati, popular in WhatsApp and casual reels (e.g. "Tame badha kem cho", "aaje shu vishesh che", "aa video pura joyo").`;
        break;
      default:
        langInstruction = `
Target Language: Keep original spoken language (Gujarati, Hindi, English, Hinglish, or Gujlish) in its natural conversational script or romanized form.`;
    }

    const systemPrompt = `You are a professional audio transcription and subtitle synchronization master specialized in South Asian & English languages (Gujarati, Hindi, English, Hinglish, Gujlish).
Your job is to transcribe the provided audio with HIGH PRECISION timing and format it as structured subtitle cues.

MANDATORY RULES:
1. STRICT RULE: ONLY 4 TO 5 WORDS IN ONE TIMESTAMP (NO EXCEPTIONS):
   - Every single subtitle cue MUST contain STRICTLY 4 OR 5 WORDS.
   - DO NOT put 6, 7, 8, 9, 10 or more words in one cue.
   - Break every sentence down into short sequential 4-5 word segments.
   - Example 1: If 9 words are spoken, output TWO cues: 5 words, then 4 words.
   - Example 2: If 14 words are spoken, output THREE cues: 5 words, 5 words, 4 words.
   - Subtitles must be snappy, rapid, and readable for reels/videos.

2. TIME ACCURACY & SYNCHRONIZATION:
   - Provide exact millisecond timestamps (startMs and endMs) matching precisely when those exact 4-5 words are uttered in the audio.
   - Format 'startTime' and 'endTime' in standard SRT format: "HH:MM:SS,mmm" (e.g., "00:00:01,250" --> "00:00:03,120").
   - Ensure chronological order: cue[i].startMs must be >= cue[i-1].endMs. No overlapping or inverted timestamps.
   - Cover the entire spoken portions of the audio file without skipping words or filler sounds that carry meaning.

3. ENGLISH WORDS IN ENGLISH SPELLINGS (MANDATORY REQUIREMENT):
   - Whenever ANY English word, technical term, modern vocabulary, or loanword is spoken (e.g., "video", "AI", "computer", "podcast", "channel", "subscribe", "link", "smartphone", "edit", "online", "welcome", "technology", "software", "screen", "camera", "app", "music", "time", "content", "start", "like", "share", etc.), that English word MUST be written in PROPER, STANDARD ENGLISH SPELLING with Latin characters.
   - In Hinglish (Romanized Hindi) and Gujlish (Romanized Gujarati): ensure all English words retain their normal English dictionary spelling (e.g., "video", "subscribe", "channel", "podcast", "AI", "tool", "features").
   - In Gujarati and Hindi scripts: keep English technical terms, brand names, and modern loanwords in clear English script (e.g., "આ AI tool ખૂબ જ useful છે", "यह YouTube video channel subscribe करें") rather than distorted phonetic transliteration.

4. SCRIPT & LANGUAGE ACCURACY:
${langInstruction}
   - Mode requested: ${mode === 'translate' ? 'Translate spoken content into the specified target language' : 'Transcribe accurately in the target language / script specified'}.

5. CLEANLINESS:
   - Ensure clean punctuation (commas, periods, question marks) suitable for video captions.
   - Do NOT include timestamp headers inside the text string itself. Only put the subtitle phrase in 'text'.`;

    const userPrompt = `Listen carefully to the audio and transcribe it into time-synchronized subtitle cues adhering STRICTLY to ONLY 4 TO 5 WORDS per timestamp cue in the requested language.`;

    const audioPart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: cleanBase64,
      },
    };

    const textPart = {
      text: userPrompt,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [audioPart, textPart],
      },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLanguage: {
              type: Type.STRING,
              description: 'The primary language identified in the audio',
            },
            audioDurationSec: {
              type: Type.NUMBER,
              description: 'Approximate duration in seconds of spoken audio',
            },
            subtitles: {
              type: Type.ARRAY,
              description: 'List of subtitle segments with strictly 4-5 words each',
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER, description: 'Sequential 1-based index' },
                  startTime: {
                    type: Type.STRING,
                    description: 'SRT format timestamp HH:MM:SS,mmm',
                  },
                  endTime: {
                    type: Type.STRING,
                    description: 'SRT format timestamp HH:MM:SS,mmm',
                  },
                  startMs: {
                    type: Type.INTEGER,
                    description: 'Start time in milliseconds',
                  },
                  endMs: {
                    type: Type.INTEGER,
                    description: 'End time in milliseconds',
                  },
                  text: {
                    type: Type.STRING,
                    description: 'Transcribed text containing strictly 4 to 5 words',
                  },
                },
                required: ['id', 'startTime', 'endTime', 'startMs', 'endMs', 'text'],
              },
            },
          },
          required: ['subtitles'],
        },
      },
    });

    const responseText = response.text || '{}';
    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse model JSON:', responseText);
      return res.status(500).json({
        error: 'Failed to parse model response into valid subtitle JSON',
        raw: responseText,
      });
    }

    // Helper: format milliseconds to SRT time
    const formatSrtTime = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      const remMs = Math.floor(ms % 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(remMs).padStart(3, '0')}`;
    };

    // Helper: Partition any text strictly into 4 to 5 words chunks
    const partitionTextInto4to5Words = (text: string): string[] => {
      const words = text.trim().split(/\s+/).filter(Boolean);
      const n = words.length;
      if (n <= 5) return [text.trim()];

      let bestA = 0;
      let bestB = 0;
      let exact = false;

      // Try exact partition into 4s and 5s (e.g. 8 -> 4,4; 9 -> 5,4; 10 -> 5,5; 13 -> 5,4,4)
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
    };

    // Deterministic post-processing to GUARANTEE strict 4 to 5 words per timestamp
    if (parsedData.subtitles && Array.isArray(parsedData.subtitles)) {
      const guaranteedCues: any[] = [];

      for (const cue of parsedData.subtitles) {
        let startMs = typeof cue.startMs === 'number' ? cue.startMs : 0;
        let endMs = typeof cue.endMs === 'number' ? cue.endMs : startMs + 1500;
        if (endMs <= startMs) {
          endMs = startMs + 1200;
        }

        const rawText = (cue.text || '').trim();
        const wordCount = rawText.split(/\s+/).filter(Boolean).length;

        if (wordCount > 5) {
          // Strictly partition into 4-5 words chunks with proportional time distribution
          const chunks = partitionTextInto4to5Words(rawText);
          const totalDuration = endMs - startMs;
          const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);

          let currentStart = startMs;
          chunks.forEach((chunkText, idx) => {
            const proportion = totalChars > 0 ? chunkText.length / totalChars : 1 / chunks.length;
            const chunkDuration = Math.max(500, Math.round(totalDuration * proportion));
            const chunkEnd = idx === chunks.length - 1 ? endMs : currentStart + chunkDuration;

            guaranteedCues.push({
              startMs: currentStart,
              endMs: chunkEnd,
              startTime: formatSrtTime(currentStart),
              endTime: formatSrtTime(chunkEnd),
              text: chunkText,
            });

            currentStart = chunkEnd;
          });
        } else {
          guaranteedCues.push({
            startMs,
            endMs,
            startTime: cue.startTime && cue.startTime.includes(':') ? cue.startTime : formatSrtTime(startMs),
            endTime: cue.endTime && cue.endTime.includes(':') ? cue.endTime : formatSrtTime(endMs),
            text: rawText,
          });
        }
      }

      // Re-index all cues sequentially 1..N
      parsedData.subtitles = guaranteedCues.map((cue, idx) => ({
        id: idx + 1,
        ...cue,
      }));
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error('Transcription error:', error);
    res.status(500).json({
      error: error.message || 'An error occurred during audio transcription',
    });
  }
});

// Translation / Refinement endpoint
app.post('/api/translate-subtitles', async (req, res) => {
  try {
    const { subtitles, targetLanguage } = req.body;
    if (!subtitles || !Array.isArray(subtitles)) {
      return res.status(400).json({ error: 'Missing subtitles array' });
    }

    const prompt = `Translate the following subtitle text cues into ${targetLanguage}.
Keep the exact same number of items and keep the translations concise (4-5 words per cue).
Input subtitles:
${JSON.stringify(subtitles.map((s: any) => ({ id: s.id, text: s.text })))}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              text: { type: Type.STRING },
            },
            required: ['id', 'text'],
          },
        },
      },
    });

    const translatedList = JSON.parse(response.text || '[]');
    const textMap = new Map<number, string>();
    translatedList.forEach((item: any) => {
      textMap.set(item.id, item.text);
    });

    const updatedSubtitles = subtitles.map((cue: any) => ({
      ...cue,
      text: textMap.get(cue.id) || cue.text,
    }));

    res.json({ subtitles: updatedSubtitles });
  } catch (err: any) {
    console.error('Translation error:', err);
    res.status(500).json({ error: err.message || 'Failed to translate subtitles' });
  }
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();

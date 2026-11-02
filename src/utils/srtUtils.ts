import { SubtitleCue } from '../types/subtitle';

/**
 * Format milliseconds into SRT timestamp: HH:MM:SS,mmm
 */
export function msToSrtTime(ms: number): string {
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

/**
 * Format milliseconds into WebVTT timestamp: HH:MM:SS.mmm
 */
export function msToVttTime(ms: number): string {
  return msToSrtTime(ms).replace(',', '.');
}

/**
 * Format milliseconds into human readable display: MM:SS.s
 */
export function msToDisplayTime(ms: number): string {
  if (isNaN(ms) || ms < 0) ms = 0;
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(1);
  return `${String(minutes).padStart(2, '0')}:${seconds.padStart(4, '0')}`;
}

/**
 * Parse an SRT timestamp string (HH:MM:SS,mmm or HH:MM:SS.mmm) into milliseconds
 */
export function srtTimeToMs(timeStr: string): number {
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

/**
 * Count words in a string, respecting multi-language unicode spaces
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Convert cues array to standardized .SRT string
 */
export function cuesToSrt(cues: SubtitleCue[]): string {
  return cues
    .map((cue, index) => {
      const id = index + 1;
      const start = msToSrtTime(cue.startMs);
      const end = msToSrtTime(cue.endMs);
      return `${id}\n${start} --> ${end}\n${cue.text.trim()}\n`;
    })
    .join('\n');
}

/**
 * Convert cues array to standardized .VTT string
 */
export function cuesToVtt(cues: SubtitleCue[]): string {
  const body = cues
    .map((cue, index) => {
      const id = index + 1;
      const start = msToVttTime(cue.startMs);
      const end = msToVttTime(cue.endMs);
      return `${id}\n${start} --> ${end}\n${cue.text.trim()}`;
    })
    .join('\n\n');
  return `WEBVTT\n\n${body}\n`;
}

/**
 * Convert cues array to clean plain text transcript
 */
export function cuesToPlainText(cues: SubtitleCue[]): string {
  return cues.map((cue) => cue.text.trim()).join(' ');
}

/**
 * Parse an uploaded .srt file string into SubtitleCue[]
 */
export function parseSrt(srtContent: string): SubtitleCue[] {
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIndex = 0;
    if (/^\d+$/.test(lines[0].trim())) {
      timeLineIndex = 1;
    }

    if (lines.length <= timeLineIndex) continue;
    const timeLine = lines[timeLineIndex];
    const match = timeLine.match(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{2,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{2,3})/);

    if (match) {
      const startStr = match[1];
      const endStr = match[2];
      const startMs = srtTimeToMs(startStr);
      const endMs = srtTimeToMs(endStr);
      const text = lines.slice(timeLineIndex + 1).join(' ').trim();

      cues.push({
        id: cues.length + 1,
        startTime: msToSrtTime(startMs),
        endTime: msToSrtTime(endMs),
        startMs,
        endMs,
        text,
      });
    }
  }

  return cues;
}

/**
 * Shift all cues in time by offsetMs (+ or -)
 */
export function shiftCues(cues: SubtitleCue[], offsetMs: number): SubtitleCue[] {
  return cues.map((cue) => {
    const newStart = Math.max(0, cue.startMs + offsetMs);
    const duration = cue.endMs - cue.startMs;
    const newEnd = Math.max(newStart + 300, newStart + duration);
    return {
      ...cue,
      startMs: newStart,
      endMs: newEnd,
      startTime: msToSrtTime(newStart),
      endTime: msToSrtTime(newEnd),
    };
  });
}

/**
 * Auto-split a cue containing >6 words into chunks of targetWords (default 4-5 words)
 * with proportional timing distributed evenly across the word lengths
/**
 * Partition text strictly into 4 to 5 words chunks
 */
export function partitionTextInto4to5Words(text: string): string[] {
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
}

/**
 * Split a cue containing >5 words into strictly 4 to 5 words chunks with proportional timestamps
 */
export function splitCueIntoChunks(cue: SubtitleCue): SubtitleCue[] {
  const rawText = cue.text.trim();
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 5) {
    return [cue];
  }

  const chunks = partitionTextInto4to5Words(rawText);
  const totalDuration = cue.endMs - cue.startMs;
  const totalChars = chunks.reduce((acc, c) => acc + c.length, 0);

  let currentStart = cue.startMs;
  const result: SubtitleCue[] = [];

  chunks.forEach((chunkText, idx) => {
    const proportion = totalChars > 0 ? chunkText.length / totalChars : 1 / chunks.length;
    const chunkDuration = Math.max(500, Math.round(totalDuration * proportion));
    const chunkEnd = idx === chunks.length - 1 ? cue.endMs : currentStart + chunkDuration;

    result.push({
      id: cue.id + idx,
      startMs: currentStart,
      endMs: Math.max(currentStart + 500, chunkEnd),
      startTime: msToSrtTime(currentStart),
      endTime: msToSrtTime(Math.max(currentStart + 500, chunkEnd)),
      text: chunkText,
    });

    currentStart = chunkEnd;
  });

  return result;
}

/**
 * Enforce strictly 4 to 5 words on an entire array of subtitle cues
 */
export function enforceStrict4to5Words(cues: SubtitleCue[]): SubtitleCue[] {
  const result: SubtitleCue[] = [];
  for (const cue of cues) {
    const split = splitCueIntoChunks(cue);
    result.push(...split);
  }
  return reindexCues(result);
}

/**
 * Re-index cue IDs to 1..N
 */
export function reindexCues(cues: SubtitleCue[]): SubtitleCue[] {
  return cues.map((cue, idx) => ({
    ...cue,
    id: idx + 1,
  }));
}

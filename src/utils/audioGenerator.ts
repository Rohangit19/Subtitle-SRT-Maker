/**
 * Audio helpers for synthesizing sample audio buffers, converting AudioBlobs to base64,
 * and creating sample audio files for instant testing.
 */

export interface SamplePreset {
  id: string;
  title: string;
  language: 'gujarati' | 'hindi' | 'english' | 'hinglish' | 'gujlish';
  description: string;
  durationSec: number;
  spokenText: string;
  defaultCues: Array<{
    id: number;
    startMs: number;
    endMs: number;
    text: string;
  }>;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'sample-hinglish',
    title: 'Hinglish Podcast Clip',
    language: 'hinglish',
    description: 'Casual conversational tech conversation in Romanized Hindi',
    durationSec: 10,
    spokenText: 'Hey dosto welcome back to our podcast. Aaj hum baat karenge AI tools ke baare mein. Subtitles banana ab bohot aasan ho gaya hai.',
    defaultCues: [
      { id: 1, startMs: 500, endMs: 2400, text: 'Hey dosto welcome back' },
      { id: 2, startMs: 2500, endMs: 4600, text: 'to our tech podcast.' },
      { id: 3, startMs: 4800, endMs: 7200, text: 'Aaj hum baat karenge' },
      { id: 4, startMs: 7400, endMs: 9800, text: 'AI tools ke baare mein.' },
    ],
  },
  {
    id: 'sample-gujarati',
    title: 'Gujarati Business & Tax',
    language: 'gujarati',
    description: 'Gujarati speech with GST, Return, Invoice, Portal, PDF, Download and Connect preserved',
    durationSec: 11,
    spokenText: 'આજે આપણે GST Return અને Invoice વિશે વાત કરીશું. આ Portal પરથી PDF Download કરીને Connect કરો.',
    defaultCues: [
      { id: 1, startMs: 400, endMs: 2600, text: 'આજે આપણે GST Return' },
      { id: 2, startMs: 2700, endMs: 5000, text: 'અને Invoice વિશે વાત' },
      { id: 3, startMs: 5100, endMs: 7800, text: 'કરીશું. આ Portal પરથી' },
      { id: 4, startMs: 7900, endMs: 10500, text: 'PDF Download કરીને Connect કરો.' },
    ],
  },
  {
    id: 'sample-hindi',
    title: 'Hindi Tech & Business',
    language: 'hindi',
    description: 'Devanagari Hindi with GST, Return, Invoice, Software and Hospital Verification',
    durationSec: 10,
    spokenText: 'आज हम GST Return और Invoice के बारे में बात करेंगे। नया Software और Hospital Verification होगा।',
    defaultCues: [
      { id: 1, startMs: 500, endMs: 2400, text: 'आज हम GST Return' },
      { id: 2, startMs: 2500, endMs: 4800, text: 'और Invoice के बारे' },
      { id: 3, startMs: 5000, endMs: 7300, text: 'में बात करेंगे। नया' },
      { id: 4, startMs: 7500, endMs: 9800, text: 'Software और Hospital Verification होगा।' },
    ],
  },
  {
    id: 'sample-gujlish',
    title: 'Gujlish Social Reel',
    language: 'gujlish',
    description: 'Romanized Gujarati colloquial reel dialogue',
    durationSec: 9,
    spokenText: 'Tame badha kem cho mitra? Aaje ame navi vat sikhisu. Aa video share karjo.',
    defaultCues: [
      { id: 1, startMs: 400, endMs: 2200, text: 'Tame badha kem cho' },
      { id: 2, startMs: 2300, endMs: 4500, text: 'mara vhala mitra aaje?' },
      { id: 3, startMs: 4700, endMs: 6900, text: 'Aaje ame navi vat' },
      { id: 4, startMs: 7000, endMs: 9200, text: 'sikhisu sathe mali ne.' },
    ],
  },
  {
    id: 'sample-english',
    title: 'English Explainer Video',
    language: 'english',
    description: 'Clear instructional audio clip with rapid caption chunks',
    durationSec: 11,
    spokenText: 'Welcome to the audio subtitle generator. Generate accurate subtitles in seconds and export directly to SRT.',
    defaultCues: [
      { id: 1, startMs: 400, endMs: 2400, text: 'Welcome to the audio' },
      { id: 2, startMs: 2500, endMs: 4600, text: 'subtitle generator application.' },
      { id: 3, startMs: 4800, endMs: 7400, text: 'Generate accurate subtitles in seconds' },
      { id: 4, startMs: 7600, endMs: 10200, text: 'and export directly to SRT.' },
    ],
  },
];

/**
 * Generate a synthetic spoken WAV file using Web Audio API frequency-modulated vocal synthesis
 * so that the user has an actual audio file with voice-like cadence and rhythm to play and transcribe!
 */
export function generateSyntheticWavBlob(durationSec: number = 8): Blob {
  const sampleRate = 22050;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  // WAV Header writing
  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat: PCM
  view.setUint16(22, 1, true); // NumChannels: Mono
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  // Formant-like vocal synthesis (simulating spoken syllables and cadence)
  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Rhythmic cadence envelope (speech bursts separated by micro-pauses)
    const cadence = Math.sin(t * 3.5 * Math.PI) > -0.2 ? 1 : 0.05;
    const syllabic = Math.sin(t * 8 * Math.PI) * 0.5 + 0.5;

    // Pitch formant mixture: Fundamental ~140Hz, 1st formant ~700Hz, 2nd formant ~1800Hz
    const f0 = Math.sin(2 * Math.PI * 140 * t + Math.sin(2 * Math.PI * 5 * t) * 0.2);
    const f1 = Math.sin(2 * Math.PI * 650 * t) * 0.35;
    const f2 = Math.sin(2 * Math.PI * 1750 * t) * 0.15;

    const sample = (f0 * 0.5 + f1 + f2) * cadence * syllabic * 0.6;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Convert a File or Blob to base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

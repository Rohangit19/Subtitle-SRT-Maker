export type SupportedLanguage =
  | 'gujarati'
  | 'hindi'
  | 'english'
  | 'hinglish'
  | 'gujlish'
  | 'original';

export interface LanguageConfig {
  id: SupportedLanguage;
  name: string;
  nativeName: string;
  badge: string;
  description: string;
  sampleText: string;
}

export interface SubtitleCue {
  id: number;
  startTime: string; // "00:00:01,250"
  endTime: string;   // "00:00:03,100"
  startMs: number;
  endMs: number;
  text: string;
}

export interface TranscriptionResponse {
  detectedLanguage?: string;
  audioDurationSec?: number;
  subtitles: SubtitleCue[];
}

export interface AudioMetadata {
  name: string;
  size: number;
  type: string;
  duration: number;
  url: string;
  blob?: Blob;
}

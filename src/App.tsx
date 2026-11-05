/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { AudioUploadSection } from './components/AudioUploadSection';
import { ProcessingPage } from './components/ProcessingPage';
import { OutputPage } from './components/OutputPage';
import { SupportedLanguage, SubtitleCue } from './types/subtitle';
import { cuesToSrt, msToSrtTime, enforceStrict4to5Words, normalizeEnglishWords } from './utils/srtUtils';
import { blobToBase64 } from './utils/audioGenerator';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'upload' | 'processing' | 'output'>('home');

  // Audio state
  const [audioBlob, setAudioBlob] = useState<Blob | undefined>(undefined);
  const [audioName, setAudioName] = useState<string>('');
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/mp3');

  // Subtitle state
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('hinglish');
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [srtText, setSrtText] = useState<string>('');

  // Processing state
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [serverReady, setServerReady] = useState<boolean>(false);

  // Health check on initial load
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.status === 'ok') {
          setServerReady(true);
        }
      })
      .catch((err) => {
        console.warn('API health check error:', err);
      });
  }, []);

  // Handle file selection
  const handleAudioReady = (
    fileBlob: Blob,
    fileName: string,
    mimeType: string,
    initialCues?: any[]
  ) => {
    setErrorMsg(null);
    setAudioBlob(fileBlob);
    setAudioName(fileName);
    setAudioMimeType(mimeType);

    if (initialCues && initialCues.length > 0) {
      const formatted: SubtitleCue[] = initialCues.map((c, i) => ({
        id: i + 1,
        startMs: c.startMs,
        endMs: c.endMs,
        startTime: msToSrtTime(c.startMs),
        endTime: msToSrtTime(c.endMs),
        text: normalizeEnglishWords(c.text),
      }));
      const strictlyEnforced = enforceStrict4to5Words(formatted);
      setCues(strictlyEnforced);
      setSrtText(cuesToSrt(strictlyEnforced));
    }
  };

  // Generate SRT Subtitles
  const handleGenerateSubtitles = async () => {
    if (!audioBlob) {
      setErrorMsg('Please select an audio file first.');
      return;
    }

    setIsTranscribing(true);
    setErrorMsg(null);
    setTranscriptionStatus('Listening to audio waveforms...');
    // Immediately navigate to the intermediate entertaining progress page!
    setCurrentPage('processing');

    try {
      const base64Data = await blobToBase64(audioBlob);
      setTranscriptionStatus(`Transcribing speech in ${selectedLanguage.toUpperCase()}...`);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Data,
          mimeType: audioMimeType,
          targetLanguage: selectedLanguage,
          wordsPerTimestamp: 4, // 4-5 words strictly
          mode: 'transcribe',
        }),
      });

      setTranscriptionStatus('Enforcing Native English Spelling & timing calibration...');

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        if (responseText.includes('<!doctype') || responseText.includes('<html')) {
          throw new Error('Server connection was interrupted or is warming up. Please try generating again.');
        }
        throw new Error('Invalid response received from transcription server.');
      }

      if (!response.ok) {
        if (response.status === 503 || data?.error?.includes('503') || data?.error?.includes('high demand') || data?.error?.includes('UNAVAILABLE')) {
          throw new Error('Gemini 3.8 Flash is currently experiencing temporary high demand (503 Service Unavailable). Please click "Try Again" below to retry.');
        }
        if (response.status === 429 || data?.error?.includes('Quota') || data?.error?.includes('429')) {
          throw new Error('Gemini API daily limit or rate limit reached on Free Tier. Please wait a bit or use a billing-enabled key in Settings > Secrets.');
        }
        throw new Error(data?.error || `Transcription error (status ${response.status})`);
      }

      if (!data.subtitles || data.subtitles.length === 0) {
        throw new Error('No speech detected in this audio file. Please try another audio recording.');
      }

      setTranscriptionStatus('Polishing Notepad preview and subtitle cues...');

      const strictlyEnforced = enforceStrict4to5Words(data.subtitles);
      setCues(strictlyEnforced);
      const generatedSrt = cuesToSrt(strictlyEnforced);
      setSrtText(generatedSrt);

      // Brief joyful completion pause so the entertaining progress bar hits 100%
      setTimeout(() => {
        setIsTranscribing(false);
        setTranscriptionStatus('');
        setCurrentPage('output');
      }, 500);
    } catch (err: any) {
      console.error('Transcription failed:', err);
      setIsTranscribing(false);
      setErrorMsg(err.message || 'Failed to generate subtitles. Please try again.');
    }
  };

  const handleReset = () => {
    setAudioBlob(undefined);
    setAudioName('');
    setCues([]);
    setSrtText('');
    setErrorMsg(null);
    setIsTranscribing(false);
    setTranscriptionStatus('');
    setCurrentPage('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      {/* Minimal Header */}
      <Header onNavigateHome={() => setCurrentPage('home')} serverReady={serverReady} />

      <main>
        {/* Error Notification on Home or Upload page */}
        {errorMsg && currentPage !== 'processing' && (
          <div className="mx-auto max-w-xl px-4 pt-4">
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="font-bold underline ml-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Page 1: Home Page */}
        {currentPage === 'home' && (
          <HomePage onStart={() => setCurrentPage('upload')} />
        )}

        {/* Page 2: Audio Upload & Language Selection */}
        {currentPage === 'upload' && (
          <AudioUploadSection
            onAudioReady={handleAudioReady}
            onGenerateSubtitles={handleGenerateSubtitles}
            isTranscribing={isTranscribing}
            transcriptionStatus={transcriptionStatus}
            selectedLanguage={selectedLanguage}
            onChangeLanguage={setSelectedLanguage}
            hasAudioLoaded={Boolean(audioBlob)}
            currentAudioName={audioName}
            onBackToHome={() => setCurrentPage('home')}
          />
        )}

        {/* Intermediate Page (Between 2 and 3): Interactive & Entertaining Progress Bar */}
        {currentPage === 'processing' && (
          <ProcessingPage
            fileName={audioName || 'audio_file.wav'}
            selectedLanguage={selectedLanguage}
            statusMessage={transcriptionStatus}
            isTranscribing={isTranscribing}
            errorMsg={errorMsg}
            onCancel={() => {
              setIsTranscribing(false);
              setCurrentPage('upload');
            }}
            onRetry={handleGenerateSubtitles}
          />
        )}

        {/* Page 3: Output in Notepad Pad */}
        {currentPage === 'output' && (
          <OutputPage
            cues={cues}
            srtText={srtText}
            onChangeSrtText={setSrtText}
            audioName={audioName || 'subtitles.wav'}
            targetLanguage={selectedLanguage}
            onBackToUpload={() => setCurrentPage('upload')}
            onStartNewProject={handleReset}
          />
        )}
      </main>
    </div>
  );
}

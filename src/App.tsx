/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { AudioUploadSection } from './components/AudioUploadSection';
import { OutputPage } from './components/OutputPage';
import { SupportedLanguage, SubtitleCue } from './types/subtitle';
import { cuesToSrt, msToSrtTime, enforceStrict4to5Words } from './utils/srtUtils';
import { blobToBase64 } from './utils/audioGenerator';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'upload' | 'output'>('home');

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
        text: c.text,
      }));
      setCues(formatted);
      setSrtText(cuesToSrt(formatted));
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
    setTranscriptionStatus('Uploading audio...');

    try {
      const base64Data = await blobToBase64(audioBlob);
      setTranscriptionStatus(`Transcribing in ${selectedLanguage.toUpperCase()}...`);

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error status ${response.status}`);
      }

      const data = await response.json();
      if (!data.subtitles || data.subtitles.length === 0) {
        throw new Error('No subtitles could be generated from the audio.');
      }

      const strictlyEnforced = enforceStrict4to5Words(data.subtitles);
      setCues(strictlyEnforced);
      const generatedSrt = cuesToSrt(strictlyEnforced);
      setSrtText(generatedSrt);

      // Transition to Page 3 (Notepad Output)
      setCurrentPage('output');
    } catch (err: any) {
      console.error('Transcription failed:', err);
      setErrorMsg(err.message || 'Failed to generate subtitles. Please try again.');
    } finally {
      setIsTranscribing(false);
      setTranscriptionStatus('');
    }
  };

  const handleReset = () => {
    setAudioBlob(undefined);
    setAudioName('');
    setCues([]);
    setSrtText('');
    setErrorMsg(null);
    setCurrentPage('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      {/* Minimal Header */}
      <Header onNavigateHome={() => setCurrentPage('home')} serverReady={serverReady} />

      <main>
        {/* Error Notification */}
        {errorMsg && (
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

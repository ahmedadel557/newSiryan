'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from './useToast';

// Minimal Web Speech API declarations (not in all TypeScript lib.dom versions)
interface SpeechRecognitionAlternative { transcript: string }
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResultEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrEvent extends Event {
  readonly error: string;
}
interface SpeechRec extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:   ((e: SpeechRecognitionResultEvent) => void) | null;
  onerror:    ((e: SpeechRecognitionErrEvent)    => void) | null;
  onend:      (() => void) | null;
  start(): void;
  stop():  void;
}
type SpeechRecognitionCtor = new () => SpeechRec;

export interface VoiceInputResult {
  transcript: string;
  audioBlob: Blob | null;
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionCtor | null;
}

export function useVoiceInput() {
  const { showToast } = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  const streamRef      = useRef<MediaStream | null>(null);
  const recorderRef    = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRec | null>(null);
  const chunksRef      = useRef<BlobPart[]>([]);
  const finalRef       = useRef('');
  const activeRef      = useRef(false);

  const startRecording = useCallback(async () => {
    if (activeRef.current || !isSupported) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: unknown) {
      const name = (err as DOMException).name ?? '';
      showToast(
        name === 'NotAllowedError' || name === 'PermissionDeniedError'
          ? 'Microphone permission denied'
          : 'Could not access microphone',
        'error'
      );
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    finalRef.current = '';

    // MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    recorder.addEventListener('dataavailable', (e: BlobEvent) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    });
    recorder.start(100);
    recorderRef.current = recorder;

    // SpeechRecognition
    const Ctor = getSpeechRecognitionCtor()!;
    const recognition = new Ctor();
    recognition.lang = 'ar-EG';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalRef.current += text + ' ';
        } else {
          interim += text;
        }
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrEvent) => {
      if (event.error === 'not-allowed') {
        showToast('Microphone permission denied', 'error');
      }
      // 'no-speech' and other transient errors: silent
    };

    recognition.start();
    recognitionRef.current = recognition;
    activeRef.current = true;
    setIsRecording(true);
  }, [isSupported, showToast]);

  const stopRecording = useCallback(async (): Promise<VoiceInputResult> => {
    if (!activeRef.current) return { transcript: '', audioBlob: null };

    activeRef.current = false;
    setIsRecording(false);
    setInterimTranscript('');

    const [audioBlob] = await Promise.all([
      new Promise<Blob | null>((resolve) => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive') { resolve(null); return; }
        recorder.addEventListener(
          'stop',
          () => {
            const type = recorder.mimeType || 'audio/webm';
            const blob = new Blob(chunksRef.current, { type });
            resolve(blob.size > 0 ? blob : null);
          },
          { once: true }
        );
        recorder.stop();
        streamRef.current?.getTracks().forEach((t) => t.stop());
      }),
      new Promise<void>((resolve) => {
        const rec = recognitionRef.current;
        if (!rec) { resolve(); return; }
        rec.addEventListener('end', () => resolve(), { once: true });
        try { rec.stop(); } catch { resolve(); }
      }),
    ]);

    const transcript = finalRef.current.trim();

    chunksRef.current = [];
    finalRef.current = '';
    recorderRef.current = null;
    recognitionRef.current = null;
    streamRef.current = null;

    return { transcript, audioBlob };
  }, []);

  // Detect browser support after hydration so SSR and client start with the same false value
  useEffect(() => {
    setIsSupported(
      typeof window.MediaRecorder !== 'undefined' &&
        getSpeechRecognitionCtor() !== null,
    );
  }, []);

  // Stop cleanly on unmount
  useEffect(() => {
    return () => {
      if (!activeRef.current) return;
      activeRef.current = false;
      try { recorderRef.current?.stop(); } catch { /* ignore */ }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    };
  }, []);

  return { isRecording, isSupported, interimTranscript, startRecording, stopRecording };
}

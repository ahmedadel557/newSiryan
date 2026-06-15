# Known Limitations & Bugs

## [2026-06-15] Voice input — Chromium-only

**Component**: `apps/frontend/src/hooks/shared/useVoiceInput.ts`
**Symptom**: Mic button not shown on Firefox or Safari.
**Root cause**: `SpeechRecognition` (and `webkitSpeechRecognition`) are only available in Chromium-based browsers (Chrome, Edge). Firefox has the API behind a flag; Safari does not implement it.
**Mitigation**: `isSupported` flag hides the mic button entirely — users on unsupported browsers fall back to text input normally. No broken UI.
**Fix path**: If cross-browser voice is needed in the future, integrate a third-party STT service (e.g. Whisper via the backend) and stream the MediaRecorder blob to it instead of relying on the Web Speech API.

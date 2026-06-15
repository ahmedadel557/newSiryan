# Known Limitations & Bugs

## [2026-06-15] Voice input — Chromium-only

**Component**: `apps/frontend/src/hooks/shared/useVoiceInput.ts`
**Symptom**: Mic button not shown on Firefox or Safari.
**Root cause**: `SpeechRecognition` (and `webkitSpeechRecognition`) are only available in Chromium-based browsers (Chrome, Edge). Firefox has the API behind a flag; Safari does not implement it.
**Mitigation**: `isSupported` flag hides the mic button entirely — users on unsupported browsers fall back to text input normally. No broken UI.
**Fix path**: If cross-browser voice is needed in the future, integrate a third-party STT service (e.g. Whisper via the backend) and stream the MediaRecorder blob to it instead of relying on the Web Speech API.

## [2026-06-15] Docker build failure — axios not in package.json (FIXED)

**Component**: `apps/backend/src/services/aiModel.service.ts`
**Symptom**: Production Docker build fails with `TS2307: Cannot find module 'axios'`.
**Root cause**: `aiModel.service.ts` imported `axios`, but the package was never added to `apps/backend/package.json`. Local dev worked because `axios` was hoisted from the monorepo root's `node_modules`, but the Docker build installs per-workspace dependencies only, so the module was missing.
**Fix**: Removed the `axios` import entirely and rewrote `doRequest()` to use Node 20's built-in global `fetch` with `AbortController` for the 30s timeout. No new dependency added. `getChatCompletion` signature, retry logic, and response parsing unchanged.
**Status**: Fixed. `npx tsc --noEmit` → 0 errors.

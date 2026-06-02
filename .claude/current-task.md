# Current Task

## Task
Doctor System — Part 3 (Frontend): Video Call + In-Call Chat (2026-06-02)

## Status
COMPLETE. **The full 3-part Doctor system is now done.**

## Context / Decision
Part 3 was genuinely greenfield (the Part-2 video page was a placeholder). Built a fully custom
video UI (no prebuilt Stream visual components) + in-call-only chat for both doctor and patient,
on `@stream-io/video-react-sdk` (1.37.4) + `stream-chat`.

## Completed This Session
- `stream-chat` installed (skipped `stream-chat-react` — prebuilt UI).
- Service: doctor `createVideoCall`/`endVideoCall`; patient `getVideoCallToken`.
- Hooks: `useVideoCall` (doctor), `usePatientVideoCall` (patient), `useInCallChat`.
- Components (`components/doctor/video/`): ParticipantVideo (headless `bindVideoElement`),
  RemoteVideoTile, LocalVideoTile (PiP), CallControls, InCallChat, CallStatusOverlay, VideoCallLayout.
- Pages: doctor video page (placeholder → live), patient video page (new).
- Patient entry: `AppointmentRow` "Join call" enabled within 5-min window; online-appointment
  placeholder now links to the video page.
- `npx tsc --noEmit` (frontend) → 0 errors. New files lint-clean except repo-wide `no-explicit-any`
  baseline (Stream types / catch blocks).

## Key implementation notes
- Doctor opens via POST `createVideoCall` (creates Stream call) then joins `{create:false}`;
  patient uses GET token then joins. `<StreamVideo>`/`<StreamCall>` = headless providers; video via
  `call.bindVideoElement`. `apiKey` from token response (env fallback). Tokens: stage
  `var(--forest-950)`, End Call `var(--critical)`.

## Next Steps
- **Test full doctor flow locally with real Stream credentials** (see `todos.md`): backend
  `STREAM_API_KEY`/`STREAM_API_SECRET`, frontend `NEXT_PUBLIC_STREAM_API_KEY`. In-call chat needs
  the **Chat product enabled** on the Stream app.

---

## Previous Task
Doctor System — Part 2 (Frontend): integrate Part-1 endpoints + new pages (2026-06-02) — COMPLETE.

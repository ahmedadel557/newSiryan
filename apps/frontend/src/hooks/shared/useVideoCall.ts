'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StreamVideoClient, Call } from '@stream-io/video-react-sdk';
import { doctorService } from '@/services/doctor.service';

const CALL_TYPE = 'default';

function isDeviceError(e: unknown): boolean {
  const name = (e as any)?.name ?? '';
  return name === 'NotFoundError' || name === 'NotAllowedError' || name === 'OverconstrainedError';
}

function deviceErrorMessage(name: string): string {
  if (name === 'NotAllowedError') return 'Camera/microphone access was denied — video is disabled.';
  if (name === 'OverconstrainedError') return 'Camera settings are not supported — video is disabled.';
  return 'Camera is unavailable — video is disabled.';
}

async function probeDevices(call: Call): Promise<string | null> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const noCamera = !devices.some(d => d.kind === 'videoinput');
    const noMic = !devices.some(d => d.kind === 'audioinput');

    if (noCamera) try { await call.camera.disable(); } catch { /* ignore */ }
    if (noMic) try { await call.microphone.disable(); } catch { /* ignore */ }
    if (noCamera && noMic) return 'No camera or microphone detected — connected without media.';
    if (noCamera) return 'No camera detected — video is disabled.';
    if (noMic) return 'No microphone detected — audio is disabled.';
  } catch {
    // enumerateDevices unavailable — proceed normally, join will handle errors
  }
  return null;
}

/** Doctor-side call lifecycle: opens the room (POST create) then joins the Stream call. */
export function useVideoCall() {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaWarning, setMediaWarning] = useState<string | null>(null);

  const clientRef = useRef<StreamVideoClient | null>(null);
  const callRef = useRef<Call | null>(null);
  const endedRef = useRef(false);
  const deviceErrHandlerRef = useRef<((e: PromiseRejectionEvent) => void) | null>(null);

  // Store appointment id so the tokenProvider can refresh without prop drilling.
  const appointmentIdRef = useRef<string | null>(null);

  // Stable token provider — reused by the video client AND the in-call chat so both
  // WebSockets silently refresh their token on the 1 h expiry. Reads the appointment
  // id from a ref at call time so the identity never changes across renders.
  const tokenProvider = useCallback(async () => {
    const fresh = await doctorService.createVideoCall(appointmentIdRef.current!);
    return fresh.token;
  }, []);

  const initCall = useCallback(async (appointmentId: string, userId: string, userName: string) => {
    setIsConnecting(true);
    setError(null);
    setMediaWarning(null);

    // Eagerly disconnect any leftover client from a previous failed attempt so
    // that StreamVideoClient.getOrCreateInstance() always gets a fresh start.
    if (clientRef.current) {
      try { await clientRef.current.disconnectUser(); } catch { /* best-effort */ }
      clientRef.current = null;
    }

    let c: StreamVideoClient | null = null;
    try {
      const data = await doctorService.createVideoCall(appointmentId);
      const key = data.apiKey || (process.env.NEXT_PUBLIC_STREAM_API_KEY as string);
      appointmentIdRef.current = appointmentId;

      // Use getOrCreateInstance (NOT `new StreamVideoClient`): the SDK keeps a
      // per-(apiKey,user) singleton map. Calling `new` directly logs
      // "A StreamVideoClient already exists for <user>" and opens a SECOND
      // WebSocket whenever this hook re-runs (React StrictMode double-mount,
      // fast navigation, retry) — a duplicate connection that fragments call
      // state and contributes to flaky media/participant sync. getOrCreateInstance
      // reuses the live client when one exists and creates a fresh one otherwise.
      // The tokenProvider lets the SDK refresh the token silently on the 1 h
      // expiry so long consultations don't lose the WebSocket.
      c = StreamVideoClient.getOrCreateInstance({
        apiKey: key,
        user: { id: userId, name: userName },
        token: data.token,
        tokenProvider,
      });
      const theCall = c.call(CALL_TYPE, data.callId);

      // Probe devices and proactively disable absent ones so the SDK never calls
      // getUserMedia for a device that isn't there — prevents stray permission
      // prompts and the unhandledRejection that partially breaks mute controls.
      const probeWarn = await probeDevices(theCall);
      let pendingWarn = probeWarn;

      try {
        await theCall.join({ create: false });
      } catch (joinErr: unknown) {
        if (isDeviceError(joinErr)) {
          const name = (joinErr as any)?.name;
          pendingWarn = name === 'NotAllowedError'
            ? 'Camera/microphone access was denied — connected without media.'
            : probeWarn ?? 'No camera or microphone detected — connected without media.';
        } else {
          throw joinErr;
        }
      }

      if (pendingWarn) setMediaWarning(pendingWarn);

      // Catch SDK-internal camera acquisition errors that fire asynchronously
      // after join() resolves (enumerateDevices lists a device that is physically absent).
      const deviceErrHandler = (event: PromiseRejectionEvent) => {
        const name = (event.reason as any)?.name ?? '';
        if (isDeviceError({ name })) {
          event.preventDefault();
          setMediaWarning(prev => prev ?? deviceErrorMessage(name));
        }
      };
      if (deviceErrHandlerRef.current) window.removeEventListener('unhandledrejection', deviceErrHandlerRef.current);
      window.addEventListener('unhandledrejection', deviceErrHandler);
      deviceErrHandlerRef.current = deviceErrHandler;

      const appt = data.appointment;
      const patientId = appt?.patient?._id?.toString?.() ?? appt?.patient?.toString?.() ?? appt?.patient ?? null;

      clientRef.current = c;
      callRef.current = theCall;
      endedRef.current = false;
      setClient(c);
      setCall(theCall);
      setCallId(data.callId);
      setToken(data.token);
      setApiKey(key);
      setOtherUserId(patientId);
      setIsConnected(true);
    } catch (e: any) {
      // If client was created but join failed, disconnect it so the singleton
      // map is clean and a retry can create a fresh instance.
      if (c) {
        try { await c.disconnectUser(); } catch { /* best-effort */ }
      }
      setError(e?.response?.data?.message ?? e?.message ?? 'Could not start the video call');
    } finally {
      setIsConnecting(false);
    }
  }, [tokenProvider]);

  const endCall = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (deviceErrHandlerRef.current) {
      window.removeEventListener('unhandledrejection', deviceErrHandlerRef.current);
      deviceErrHandlerRef.current = null;
    }
    const theCall = callRef.current;
    const c = clientRef.current;
    const id = theCall?.id;
    try { await theCall?.leave(); } catch { /* already left */ }
    try { if (id) await doctorService.endVideoCall(id); } catch { /* best-effort */ }
    try { await c?.disconnectUser(); } catch { /* best-effort */ }
    clientRef.current = null;
    callRef.current = null;
    setCall(null);
    setClient(null);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => { if (callRef.current) endCall(); };
  }, [endCall]);

  return { client, call, callId, token, apiKey, otherUserId, isConnecting, isConnected, error, mediaWarning, initCall, endCall, tokenProvider };
}

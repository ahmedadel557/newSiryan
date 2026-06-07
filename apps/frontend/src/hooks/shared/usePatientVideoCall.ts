'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StreamVideoClient, Call } from '@stream-io/video-react-sdk';
import { patientService } from '@/services/patient.service';

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
    // enumerateDevices unavailable — proceed normally
  }
  return null;
}

/** Patient-side call lifecycle: fetches a token and joins the call the doctor opened. */
export function usePatientVideoCall() {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
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
    const fresh = await patientService.getVideoCallToken(appointmentIdRef.current!);
    return fresh.token;
  }, []);

  const initCall = useCallback(async (appointmentId: string, userId: string, userName: string) => {
    setIsConnecting(true);
    setError(null);
    setMediaWarning(null);

    // Disconnect any leftover client from a previous failed attempt so a retry
    // always gets a fresh StreamVideoClient instance.
    if (clientRef.current) {
      try { await clientRef.current.disconnectUser(); } catch { /* best-effort */ }
      clientRef.current = null;
    }

    let c: StreamVideoClient | null = null;
    try {
      const data = await patientService.getVideoCallToken(appointmentId);
      const key = data.apiKey || (process.env.NEXT_PUBLIC_STREAM_API_KEY as string);
      appointmentIdRef.current = appointmentId;

      // Use getOrCreateInstance (NOT `new StreamVideoClient`): the SDK keeps a
      // per-(apiKey,user) singleton map. Calling `new` directly logs
      // "A StreamVideoClient already exists for <user>" and opens a SECOND
      // WebSocket whenever this hook re-runs (React StrictMode double-mount,
      // early-join retry via the video:call:started socket event, fast
      // navigation) — a duplicate connection that fragments call state. The
      // tokenProvider lets the SDK refresh the token silently on the 1 h expiry.
      c = StreamVideoClient.getOrCreateInstance({
        apiKey: key,
        user: { id: userId, name: userName },
        token: data.token,
        tokenProvider,
      });
      const theCall = c.call(CALL_TYPE, data.callId);

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

      clientRef.current = c;
      callRef.current = theCall;
      endedRef.current = false;
      setClient(c);
      setCall(theCall);
      setCallId(data.callId);
      setToken(data.token);
      setApiKey(key);
      setIsConnected(true);
    } catch (e: any) {
      // Disconnect the client if it was created before the failure so the next
      // retry (or page re-mount) starts from a clean state.
      if (c) {
        try { await c.disconnectUser(); } catch { /* best-effort */ }
      }
      setError(
        e?.response?.data?.message ??
          'The call has not started yet. Please wait for your doctor to open the room, then try again.',
      );
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
    try { await callRef.current?.leave(); } catch { /* already left */ }
    try { await clientRef.current?.disconnectUser(); } catch { /* best-effort */ }
    clientRef.current = null;
    callRef.current = null;
    setCall(null);
    setClient(null);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => { if (callRef.current) endCall(); };
  }, [endCall]);

  return { client, call, callId, token, apiKey, otherUserId: null as string | null, isConnecting, isConnected, error, mediaWarning, initCall, endCall, tokenProvider };
}

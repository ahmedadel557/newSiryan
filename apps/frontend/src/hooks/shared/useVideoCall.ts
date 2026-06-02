'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StreamVideoClient, Call } from '@stream-io/video-react-sdk';
import { doctorService } from '@/services/doctor.service';

const CALL_TYPE = 'default';

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

  const clientRef = useRef<StreamVideoClient | null>(null);
  const callRef = useRef<Call | null>(null);
  const endedRef = useRef(false);

  const initCall = useCallback(async (appointmentId: string, userId: string, userName: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      const data = await doctorService.createVideoCall(appointmentId);
      const key = data.apiKey || (process.env.NEXT_PUBLIC_STREAM_API_KEY as string);
      const c = StreamVideoClient.getOrCreateInstance({ apiKey: key, user: { id: userId, name: userName }, token: data.token });
      const theCall = c.call(CALL_TYPE, data.callId);
      await theCall.join({ create: false });

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
      setError(e?.response?.data?.message ?? e?.message ?? 'Could not start the video call');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const endCall = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
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

  return { client, call, callId, token, apiKey, otherUserId, isConnecting, isConnected, error, initCall, endCall };
}

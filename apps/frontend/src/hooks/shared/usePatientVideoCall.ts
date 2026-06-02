'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StreamVideoClient, Call } from '@stream-io/video-react-sdk';
import { patientService } from '@/services/patient.service';

const CALL_TYPE = 'default';

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

  const clientRef = useRef<StreamVideoClient | null>(null);
  const callRef = useRef<Call | null>(null);
  const endedRef = useRef(false);

  const initCall = useCallback(async (appointmentId: string, userId: string, userName: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      const data = await patientService.getVideoCallToken(appointmentId);
      const key = data.apiKey || (process.env.NEXT_PUBLIC_STREAM_API_KEY as string);
      const c = StreamVideoClient.getOrCreateInstance({ apiKey: key, user: { id: userId, name: userName }, token: data.token });
      const theCall = c.call(CALL_TYPE, data.callId);
      await theCall.join({ create: false });

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
      setError(
        e?.response?.data?.message ??
          'The call has not started yet. Please wait for your doctor to open the room, then try again.',
      );
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const endCall = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
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

  // otherUserId stays null on patient side (chat just watches the doctor-created channel).
  return { client, call, callId, token, apiKey, otherUserId: null as string | null, isConnecting, isConnected, error, initCall, endCall };
}

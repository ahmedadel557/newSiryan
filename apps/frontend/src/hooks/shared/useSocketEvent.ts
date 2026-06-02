'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from '@/services/socket.client';

export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const wrapped = (payload: T) => handlerRef.current(payload);
    socket.on(event, wrapped);
    return () => {
      socket.off(event, wrapped);
    };
  }, [event]); // stable — only re-registers if the event name changes
}

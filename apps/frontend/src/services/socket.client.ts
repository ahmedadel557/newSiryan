'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function originFromApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? '';
  return raw.replace(/\/api\/?$/, '');
}

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (!socket) {
    socket = io(originFromApiUrl(), {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  } else if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { redisClient } from './redis';

let io: Server | null = null;

interface SocketUser {
  id: string;
  role: string;
}

function parseCookies(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('='));
  }
  return out;
}

function parseUserFromCookie(rawCookie: string | undefined): SocketUser | null {
  const token = parseCookies(rawCookie).access_token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string };
    return { id: decoded.id, role: decoded.role };
  } catch {
    return null;
  }
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const user =
      parseUserFromCookie(socket.handshake.headers.cookie) ??
      (socket.handshake.auth?.token
        ? (() => {
            try {
              const decoded = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET!) as {
                id: string;
                role: string;
              };
              return { id: decoded.id, role: decoded.role };
            } catch {
              return null;
            }
          })()
        : null);

    if (!user) return next(new Error('Unauthorized'));
    (socket.data as { user: SocketUser }).user = user;
    next();
  });

  io.on('connection', (socket) => {
    const user = (socket.data as { user: SocketUser }).user;
    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);

    // Inform newly connected socket if maintenance mode is already active
    if (redisClient.isReady) {
      redisClient.get('system:maintenance').then((raw) => {
        if (raw) socket.emit('system_maintenance', JSON.parse(raw));
      }).catch(() => {});
    }
  });

  return io;
}

// Attach Redis pub/sub adapter so Socket.IO events work across multiple server instances.
// Called after initSocket once Redis is connected.
export async function attachRedisAdapter(): Promise<void> {
  if (!io) return;
  if (!redisClient.isReady) return;
  try {
    const subClient = redisClient.duplicate();
    await subClient.connect();
    io.adapter(createAdapter(redisClient, subClient));
    console.log('Socket.IO Redis adapter attached');
  } catch (err) {
    console.error('Socket.IO Redis adapter failed to attach:', err);
  }
}

export function getIO(): Server | null {
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitToRole(role: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(`role:${role}`).emit(event, payload);
}

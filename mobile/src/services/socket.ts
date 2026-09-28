import { io, Socket } from 'socket.io-client';
import { config } from '../config/env';

export function createChatSocket(token: string): Socket {
  return io(config.socketUrl, {
    auth: { token },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    timeout: 10000,
  });
}

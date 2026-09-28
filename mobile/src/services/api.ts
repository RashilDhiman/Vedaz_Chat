import { config } from '../config/env';
import type { ChatMessage, User } from '../types/chat';

const PAGE_SIZE = 50;
const REQUEST_TIMEOUT_MS = 12000;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type LoginResponse = {
  token: string;
  user: User;
  created: boolean;
};

type HistoryResponse = {
  room: string;
  messages: ChatMessage[];
};

type SendResponse = {
  message: ChatMessage;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.apiUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        body && typeof body.error === 'string' ? body.error : 'Request failed.';
      throw new ApiError(response.status, message);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'The server took too long to respond.');
    }
    throw new ApiError(
      0,
      'Cannot reach the server. Start the backend and check the host in src/config/env.ts.',
    );
  } finally {
    clearTimeout(timer);
  }
}

export function login(username: string): Promise<LoginResponse> {
  return request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
}

export function fetchMessages(
  token: string,
  options: { before?: number; limit?: number } = {},
): Promise<ChatMessage[]> {
  const params = new URLSearchParams();
  params.set('limit', String(options.limit ?? PAGE_SIZE));
  if (options.before) {
    params.set('before', String(options.before));
  }
  return request<HistoryResponse>(
    `/api/messages?${params.toString()}`,
    { method: 'GET' },
    token,
  ).then(body => body.messages);
}

export function postMessage(token: string, text: string): Promise<ChatMessage> {
  return request<SendResponse>(
    '/api/messages',
    { method: 'POST', body: JSON.stringify({ text }) },
    token,
  ).then(body => body.message);
}

export const MESSAGE_PAGE_SIZE = PAGE_SIZE;

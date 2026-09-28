import type { ChatMessage, MessageStatus } from '../types/chat';

const STATUS_RANK: Record<MessageStatus, number> = {
  failed: 0,
  sending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
};

export function strongerStatus(
  current: MessageStatus,
  incoming: MessageStatus,
): MessageStatus {
  return STATUS_RANK[current] >= STATUS_RANK[incoming] ? current : incoming;
}

export function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const map = new Map<string, ChatMessage>();

  for (const message of current) {
    map.set(storageKey(message), message);
  }

  for (const message of incoming) {
    const clientKey = message.clientId ? `client:${message.clientId}` : null;
    const existing = (clientKey && map.get(clientKey)) || map.get(message.id);
    const merged: ChatMessage = existing
      ? {
          ...existing,
          ...message,
          clientId: message.clientId ?? existing.clientId,
          status: strongerStatus(existing.status, message.status),
          pending: false,
        }
      : message;

    if (clientKey) {
      map.delete(clientKey);
    }
    map.delete(message.id);
    map.set(message.id, merged);
  }

  return [...map.values()].sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt - b.createdAt;
    }
    return a.id.localeCompare(b.id);
  });
}

export function applyStatus(
  messages: ChatMessage[],
  id: string,
  status: MessageStatus,
): ChatMessage[] {
  return messages.map(message =>
    message.id === id
      ? { ...message, status: strongerStatus(message.status, status) }
      : message,
  );
}

function storageKey(message: ChatMessage): string {
  if (message.pending && message.clientId) {
    return `client:${message.clientId}`;
  }
  return message.id;
}

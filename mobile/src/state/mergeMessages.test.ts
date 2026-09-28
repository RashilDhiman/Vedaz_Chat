import { applyStatus, mergeMessages } from './mergeMessages';
import type { ChatMessage } from '../types/chat';
import { formatDayLabel } from '../utils/formatTime';

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    room: 'general',
    senderId: 'u1',
    senderName: 'Asha',
    text: 'Hello',
    createdAt: 1_700_000_000_000,
    status: 'sent',
    ...overrides,
  };
}

describe('mergeMessages', () => {
  it('replaces an optimistic message when the server echo arrives', () => {
    const optimistic = message({
      id: 'local:abc',
      clientId: 'abc',
      status: 'sending',
      pending: true,
      text: 'Hello',
    });
    const confirmed = message({
      id: 'server-1',
      clientId: 'abc',
      status: 'sent',
      createdAt: optimistic.createdAt + 5,
    });

    const merged = mergeMessages([optimistic], [confirmed]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('server-1');
    expect(merged[0].status).toBe('sent');
    expect(merged[0].pending).toBe(false);
  });

  it('keeps a read receipt if an older sent echo arrives later', () => {
    const current = message({ id: 'server-1', status: 'read' });
    const echo = message({ id: 'server-1', status: 'sent' });
    expect(mergeMessages([current], [echo])[0].status).toBe('read');
  });

  it('sorts messages by time', () => {
    const newer = message({ id: 'b', createdAt: 20, text: 'later' });
    const older = message({ id: 'a', createdAt: 10, text: 'earlier' });
    const merged = mergeMessages([newer], [older]);
    expect(merged.map(item => item.id)).toEqual(['a', 'b']);
  });
});

describe('applyStatus', () => {
  it('does not move a message backwards from read to delivered', () => {
    const updated = applyStatus(
      [message({ status: 'read' })],
      'm1',
      'delivered',
    );
    expect(updated[0].status).toBe('read');
  });
});

describe('formatDayLabel', () => {
  it('labels the current day as Today', () => {
    expect(formatDayLabel(Date.now())).toBe('Today');
  });
});

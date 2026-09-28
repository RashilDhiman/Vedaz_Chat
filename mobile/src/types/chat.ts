export type User = {
  id: string;
  username: string;
  createdAt: number;
  lastSeen: number | null;
};

export type Session = {
  token: string;
  user: User;
};

export type MessageStatus =
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type ChatMessage = {
  id: string;
  clientId?: string | null;
  room: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
  status: MessageStatus;
  pending?: boolean;
};

export type OnlineUser = {
  id: string;
  username: string;
  typing: boolean;
};

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export type SendAck =
  | { ok: true; message: ChatMessage }
  | { ok: false; error: string };

export type ReceiptAck =
  | { ok: true; message: ChatMessage }
  | { ok: false; error: string };

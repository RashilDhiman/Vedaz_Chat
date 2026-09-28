import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import type { Socket } from 'socket.io-client';
import {
  ApiError,
  fetchMessages,
  login as loginRequest,
  MESSAGE_PAGE_SIZE,
  postMessage,
} from '../services/api';
import { createChatSocket } from '../services/socket';
import { clearSession, loadSession, saveSession } from '../storage/session';
import { applyStatus, mergeMessages } from '../state/mergeMessages';
import type {
  ChatMessage,
  ConnectionState,
  OnlineUser,
  ReceiptAck,
  SendAck,
  Session,
} from '../types/chat';

type ChatContextValue = {
  booting: boolean;
  session: Session | null;
  messages: ChatMessage[];
  onlineUsers: OnlineUser[];
  typingUsers: string[];
  connection: ConnectionState;
  historyLoading: boolean;
  historyError: string | null;
  hasMoreHistory: boolean;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  sendMessage: (text: string) => void;
  retryMessage: (clientId: string) => void;
  setTyping: (isTyping: boolean) => void;
  refreshHistory: () => Promise<void>;
  loadOlder: () => Promise<void>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

function createClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [connection, setConnection] = useState<ConnectionState>('disconnected');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const sessionRef = useRef<Session | null>(null);
  const typingRef = useRef(false);
  const receiptKeys = useRef(new Set<string>());
  const loadingOlder = useRef(false);
  const loadedOlder = useRef(false);
  const historyEpoch = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    loadSession()
      .then(saved => {
        if (!cancelled && saved) {
          setSession(saved);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBooting(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const acknowledge = useCallback((message: ChatMessage) => {
    const current = sessionRef.current;
    const socket = socketRef.current;
    if (
      !current ||
      !socket?.connected ||
      message.senderId === current.user.id
    ) {
      return;
    }
    const key = `${message.id}:read`;
    if (receiptKeys.current.has(key)) {
      return;
    }
    receiptKeys.current.add(key);
    socket.emit(
      'message_receipt',
      { messageId: message.id, status: 'delivered' },
      (_ack: ReceiptAck) => {},
    );
    if (AppState.currentState === 'active') {
      socket.emit(
        'message_receipt',
        { messageId: message.id, status: 'read' },
        (_ack: ReceiptAck) => {},
      );
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) {
      return;
    }
    const epoch = historyEpoch.current;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const page = await fetchMessages(current.token, {
        limit: MESSAGE_PAGE_SIZE,
      });
      if (epoch !== historyEpoch.current) {
        return;
      }
      if (!loadedOlder.current) {
        setHasMoreHistory(page.length === MESSAGE_PAGE_SIZE);
      }
      setMessages(previous => mergeMessages(previous, page));
      page.forEach(acknowledge);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        historyEpoch.current += 1;
        await clearSession();
        setSession(null);
        return;
      }
      if (epoch !== historyEpoch.current) {
        return;
      }
      setHistoryError(
        error instanceof Error ? error.message : 'Could not load messages.',
      );
    } finally {
      if (epoch === historyEpoch.current) {
        setHistoryLoading(false);
      }
    }
  }, [acknowledge]);

  const loadOlder = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || loadingOlder.current || !hasMoreHistory) {
      return;
    }
    const oldest = messagesRef.current.find(item => !item.pending);
    if (!oldest) {
      return;
    }
    const epoch = historyEpoch.current;
    loadingOlder.current = true;
    try {
      const page = await fetchMessages(current.token, {
        before: oldest.createdAt,
        limit: MESSAGE_PAGE_SIZE,
      });
      if (epoch !== historyEpoch.current) {
        return;
      }
      loadedOlder.current = true;
      setHasMoreHistory(page.length === MESSAGE_PAGE_SIZE);
      setMessages(previous => mergeMessages(page, previous));
      page.forEach(acknowledge);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        historyEpoch.current += 1;
        await clearSession();
        setSession(null);
        return;
      }
      if (epoch !== historyEpoch.current) {
        return;
      }
      setHistoryError(
        error instanceof Error
          ? error.message
          : 'Could not load earlier messages.',
      );
    } finally {
      loadingOlder.current = false;
    }
  }, [acknowledge, hasMoreHistory]);

  useEffect(() => {
    if (!session) {
      loadedOlder.current = false;
      setConnection('disconnected');
      setMessages([]);
      setOnlineUsers([]);
      setTypingUsers([]);
      setHasMoreHistory(false);
      return;
    }

    let active = true;
    const socket = createChatSocket(session.token);
    socketRef.current = socket;
    setConnection('connecting');

    const onReady = (payload: { onlineUsers?: OnlineUser[] }) => {
      if (!active) {
        return;
      }
      setConnection('connected');
      setOnlineUsers(payload.onlineUsers ?? []);
    };

    const onPresence = (payload: { onlineUsers?: OnlineUser[] }) => {
      setOnlineUsers(payload.onlineUsers ?? []);
    };

    const onTyping = (payload: { typingUsers?: string[] }) => {
      const names = (payload.typingUsers ?? []).filter(
        name => name !== session.user.username,
      );
      setTypingUsers(names);
    };

    const onMessage = (message: ChatMessage) => {
      setMessages(previous => mergeMessages(previous, [message]));
      acknowledge(message);
    };

    const onStatus = (payload: {
      id?: string;
      status?: ChatMessage['status'];
    }) => {
      if (!payload.id || !payload.status) {
        return;
      }
      setMessages(previous =>
        applyStatus(
          previous,
          payload.id as string,
          payload.status as ChatMessage['status'],
        ),
      );
    };

    const onDisconnect = () => {
      if (active) {
        setConnection('disconnected');
        setTypingUsers([]);
      }
    };

    const onConnectError = (error: Error) => {
      if (!active) {
        return;
      }
      setConnection('disconnected');
      if (error.message === 'Unauthorized') {
        clearSession().finally(() => {
          if (active) {
            setSession(null);
            setHistoryError('Your session expired. Enter your username again.');
          }
        });
      }
    };

    socket.on('ready', onReady);
    socket.on('presence', onPresence);
    socket.on('typing', onTyping);
    socket.on('new_message', onMessage);
    socket.on('message_status', onStatus);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.connect();
    refreshHistory();

    return () => {
      active = false;
      typingRef.current = false;
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [acknowledge, refreshHistory, session]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active' && sessionRef.current) {
        refreshHistory();
      }
    });
    return () => subscription.remove();
  }, [refreshHistory]);

  const login = useCallback(async (username: string) => {
    try {
      const result = await loginRequest(username.trim());
      const nextSession = { token: result.token, user: result.user };
      await saveSession(nextSession);
      setHistoryError(null);
      setSession(nextSession);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Could not sign in.');
    }
  }, []);

  const logout = useCallback(async () => {
    historyEpoch.current += 1;
    loadedOlder.current = false;
    typingRef.current = false;
    socketRef.current?.disconnect();
    await clearSession();
    setSession(null);
    setMessages([]);
    setOnlineUsers([]);
    setTypingUsers([]);
    setHistoryError(null);
  }, []);

  const deliver = useCallback((clientId: string, text: string) => {
    const current = sessionRef.current;
    const socket = socketRef.current;
    if (!current) {
      return;
    }

    const fail = () => {
      setMessages(previous =>
        previous.map(item =>
          item.clientId === clientId
            ? { ...item, status: 'failed', pending: true }
            : item,
        ),
      );
    };

    if (socket?.connected) {
      socket.emit('send_message', { text, clientId }, (ack: SendAck) => {
        if (!ack?.ok) {
          fail();
          setHistoryError(ack?.error || 'Message was not sent.');
          return;
        }
        setMessages(previous => mergeMessages(previous, [ack.message]));
      });
      return;
    }

    postMessage(current.token, text)
      .then(message => {
        setMessages(previous =>
          mergeMessages(previous, [{ ...message, clientId }]),
        );
      })
      .catch(error => {
        fail();
        setHistoryError(
          error instanceof Error ? error.message : 'Message was not sent.',
        );
      });
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const current = sessionRef.current;
      if (!trimmed || !current) {
        return;
      }

      const clientId = createClientId();
      const optimistic: ChatMessage = {
        id: `local:${clientId}`,
        clientId,
        room: 'general',
        senderId: current.user.id,
        senderName: current.user.username,
        text: trimmed,
        createdAt: Date.now(),
        status: 'sending',
        pending: true,
      };
      setMessages(previous => mergeMessages(previous, [optimistic]));
      typingRef.current = false;
      socketRef.current?.emit('typing', { isTyping: false });
      deliver(clientId, trimmed);
    },
    [deliver],
  );

  const retryMessage = useCallback(
    (clientId: string) => {
      const existing = messagesRef.current.find(
        item => item.clientId === clientId,
      );
      if (!existing) {
        return;
      }
      setMessages(previous =>
        previous.map(item =>
          item.clientId === clientId
            ? { ...item, status: 'sending', pending: true }
            : item,
        ),
      );
      deliver(clientId, existing.text);
    },
    [deliver],
  );

  const setTyping = useCallback((isTyping: boolean) => {
    if (typingRef.current === isTyping) {
      return;
    }
    typingRef.current = isTyping;
    socketRef.current?.emit('typing', { isTyping });
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({
      booting,
      session,
      messages,
      onlineUsers,
      typingUsers,
      connection,
      historyLoading,
      historyError,
      hasMoreHistory,
      login,
      logout,
      sendMessage,
      retryMessage,
      setTyping,
      refreshHistory,
      loadOlder,
    }),
    [
      booting,
      session,
      messages,
      onlineUsers,
      typingUsers,
      connection,
      historyLoading,
      historyError,
      hasMoreHistory,
      login,
      logout,
      sendMessage,
      retryMessage,
      setTyping,
      refreshHistory,
      loadOlder,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const value = useContext(ChatContext);
  if (!value) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return value;
}

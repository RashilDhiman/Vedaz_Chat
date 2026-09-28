import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatInput } from '../components/ChatInput';
import { MessageList } from '../components/MessageList';
import { TypingIndicator } from '../components/TypingIndicator';
import { useChat } from '../context/ChatContext';
import { avatarColor, initials } from '../theme/avatar';
import { colors } from '../theme/colors';
import type { ConnectionState, OnlineUser } from '../types/chat';

export function ChatScreen() {
  const {
    session,
    messages,
    onlineUsers,
    typingUsers,
    connection,
    historyLoading,
    historyError,
    hasMoreHistory,
    logout,
    sendMessage,
    retryMessage,
    setTyping,
    refreshHistory,
    loadOlder,
  } = useChat();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const username = session?.user.username ?? '';
  const faces = onlineUsers.slice(0, 4);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.mark}>
            <Text style={styles.markLetter}>V</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Vedaz</Text>
            <Text style={styles.room}>The Room</Text>
          </View>
          <Pressable
            onPress={logout}
            accessibilityRole="button"
            accessibilityLabel="Leave room"
            hitSlop={8}
            style={styles.leave}
          >
            <Text style={styles.leaveText}>Leave</Text>
          </Pressable>
        </View>
        <View style={styles.presenceRow}>
          <View style={styles.faces}>
            {faces.map(user => {
              const fill = { backgroundColor: avatarColor(user.username) };
              return (
                <View key={user.id} style={[styles.face, fill]}>
                  <Text style={styles.faceLetter}>{initials(user.username)}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.status} numberOfLines={1}>
            {headerStatus(connection, onlineUsers, typingUsers, username)}
          </Text>
        </View>
      </SafeAreaView>

      {historyError ? (
        <Pressable onPress={refreshHistory} style={styles.banner}>
          <Text style={styles.bannerText}>{historyError} Tap to retry.</Text>
        </Pressable>
      ) : null}

      <MessageList
        messages={messages}
        myUserId={session?.user.id}
        refreshing={historyLoading}
        hasMore={hasMoreHistory}
        onRefresh={refreshHistory}
        onLoadOlder={loadOlder}
        onRetry={retryMessage}
      />
      <TypingIndicator usernames={typingUsers} />
      <SafeAreaView
        edges={keyboardOpen ? [] : ['bottom']}
        style={styles.composer}
      >
        <ChatInput onSend={sendMessage} onTypingChange={setTyping} />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function headerStatus(
  connection: ConnectionState,
  users: OnlineUser[],
  typingUsers: string[],
  self: string,
): string {
  if (connection === 'connecting') {
    return 'Connecting';
  }
  if (connection === 'disconnected') {
    return 'Reconnecting';
  }
  if (typingUsers.length === 1) {
    return `${typingUsers[0]} is writing`;
  }
  if (typingUsers.length > 1) {
    return `${typingUsers.length} people are writing`;
  }
  const others = users.filter(user => user.username !== self);
  if (users.length <= 1) {
    return 'You are the only one here';
  }
  const preview = others
    .slice(0, 2)
    .map(user => user.username)
    .join(', ');
  const extra = others.length > 2 ? ` +${others.length - 2}` : '';
  return `${users.length} here · ${preview}${extra}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.night,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.night,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226,177,90,0.18)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markLetter: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  room: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 1,
  },
  leave: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
  },
  leaveText: {
    color: colors.gold,
    fontWeight: '700',
    fontSize: 13,
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  faces: {
    flexDirection: 'row',
  },
  face: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -6,
    borderWidth: 2,
    borderColor: colors.night,
  },
  faceLetter: {
    color: colors.night,
    fontSize: 11,
    fontWeight: '700',
  },
  status: {
    flex: 1,
    marginLeft: 12,
    color: colors.inkSoft,
    fontSize: 13,
  },
  banner: {
    backgroundColor: '#3A2428',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerText: {
    color: colors.danger,
    fontSize: 13,
  },
  composer: {
    backgroundColor: colors.night,
  },
});

import { useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { colors } from '../theme/colors';
import type { ChatMessage } from '../types/chat';
import { formatDayLabel } from '../utils/formatTime';
import { MessageBubble } from './MessageBubble';

const GROUP_WINDOW_MS = 2 * 60 * 1000;

type ListItem =
  | { type: 'day'; id: string; label: string }
  | {
      type: 'message';
      id: string;
      message: ChatMessage;
      showName: boolean;
      grouped: boolean;
    };

type Props = {
  messages: ChatMessage[];
  myUserId?: string;
  refreshing: boolean;
  hasMore: boolean;
  onRefresh: () => void;
  onLoadOlder: () => void;
  onRetry: (clientId: string) => void;
};

export function MessageList({
  messages,
  myUserId,
  refreshing,
  hasMore,
  onRefresh,
  onLoadOlder,
  onRetry,
}: Props) {
  const listRef = useRef<FlatList<ListItem>>(null);
  const stickToBottom = useRef(true);
  const items = groupMessages(messages, myUserId);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    stickToBottom.current = distanceFromBottom < 140;
  };

  return (
    <FlatList
      ref={listRef}
      style={styles.list}
      data={items}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.gold}
        />
      }
      ListHeaderComponent={
        hasMore ? (
          <Pressable onPress={onLoadOlder} style={styles.chip}>
            <Text style={styles.chipText}>Load earlier messages</Text>
          </Pressable>
        ) : (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Vedaz room</Text>
            <Text style={styles.noticeText}>
              Everyone here sees a message the moment it is sent. The thread
              stays after you leave and come back.
            </Text>
          </View>
        )
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyMark}>
            <Text style={styles.emptyMarkText}>V</Text>
          </View>
          <Text style={styles.emptyTitle}>The room is open</Text>
          <Text style={styles.emptyBody}>
            Write the first note. Anyone connected will see it at once.
          </Text>
        </View>
      }
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onContentSizeChange={() => {
        if (stickToBottom.current) {
          listRef.current?.scrollToEnd({ animated: true });
        }
      }}
      renderItem={({ item }) => {
        if (item.type === 'day') {
          return (
            <View style={styles.dayRow}>
              <Text style={styles.day}>{item.label}</Text>
            </View>
          );
        }
        return (
          <MessageBubble
            message={item.message}
            mine={item.message.senderId === myUserId}
            showName={item.showName}
            grouped={item.grouped}
            onRetry={onRetry}
          />
        );
      }}
      ListFooterComponent={
        refreshing && messages.length === 0 ? (
          <ActivityIndicator color={colors.gold} />
        ) : undefined
      }
    />
  );
}

function groupMessages(messages: ChatMessage[], myUserId?: string): ListItem[] {
  const items: ListItem[] = [];
  let lastMessage: ChatMessage | null = null;

  for (const message of messages) {
    const label = formatDayLabel(message.createdAt);
    const previousLabel = lastMessage
      ? formatDayLabel(lastMessage.createdAt)
      : '';
    if (label !== previousLabel) {
      items.push({ type: 'day', id: `day-${label}-${message.id}`, label });
    }

    const grouped = Boolean(
      lastMessage &&
        lastMessage.senderId === message.senderId &&
        label === previousLabel &&
        message.createdAt - lastMessage.createdAt < GROUP_WINDOW_MS,
    );

    items.push({
      type: 'message',
      id: message.id,
      message,
      showName: !grouped && message.senderId !== myUserId,
      grouped,
    });
    lastMessage = message;
  }

  return items;
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.night,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 8,
    flexGrow: 1,
  },
  dayRow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  day: {
    backgroundColor: colors.chip,
    color: colors.gold,
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  notice: {
    alignSelf: 'center',
    maxWidth: 320,
    backgroundColor: colors.plum,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  noticeTitle: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  noticeText: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 48,
  },
  emptyMark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.plum,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyMarkText: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: '700',
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyBody: {
    color: colors.inkSoft,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  chip: {
    alignSelf: 'center',
    marginVertical: 8,
    backgroundColor: colors.chip,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
  },
});

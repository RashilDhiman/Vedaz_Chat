import { Pressable, StyleSheet, Text, View } from 'react-native';
import { avatarColor, initials } from '../theme/avatar';
import { colors } from '../theme/colors';
import type { ChatMessage, MessageStatus } from '../types/chat';
import { formatMessageTime } from '../utils/formatTime';

type Props = {
  message: ChatMessage;
  mine: boolean;
  showName: boolean;
  grouped: boolean;
  onRetry: (clientId: string) => void;
};

export function MessageBubble({
  message,
  mine,
  showName,
  grouped,
  onRetry,
}: Props) {
  const time = formatMessageTime(message.createdAt);
  const fill = { backgroundColor: avatarColor(message.senderName) };
  const nameColor = { color: avatarColor(message.senderName) };

  return (
    <View
      style={[
        styles.row,
        mine ? styles.rowMine : styles.rowTheirs,
        grouped ? styles.grouped : null,
      ]}
    >
      {mine ? null : showName ? (
        <View style={[styles.avatar, fill]}>
          <Text style={styles.avatarLetter}>{initials(message.senderName)}</Text>
        </View>
      ) : (
        <View style={styles.avatarGap} />
      )}
      <Pressable
        disabled={message.status !== 'failed' || !message.clientId}
        onPress={() => message.clientId && onRetry(message.clientId)}
        style={[styles.card, mine ? styles.mine : styles.theirs]}
      >
        {showName ? (
          <Text style={[styles.sender, nameColor]}>{message.senderName}</Text>
        ) : null}
        <Text style={styles.text}>{message.text}</Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{time}</Text>
          {mine ? <StatusLabel status={message.status} /> : null}
        </View>
      </Pressable>
    </View>
  );
}

function StatusLabel({ status }: { status: MessageStatus }) {
  const read = status === 'read';
  return (
    <Text style={[styles.status, read ? styles.statusRead : null]}>
      {labelFor(status)}
    </Text>
  );
}

function labelFor(status: MessageStatus): string {
  if (status === 'sending') {
    return 'Sending';
  }
  if (status === 'failed') {
    return 'Tap to retry';
  }
  if (status === 'delivered') {
    return 'Delivered';
  }
  if (status === 'read') {
    return 'Read';
  }
  return 'Sent';
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  grouped: {
    marginBottom: 4,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarGap: {
    width: 36,
  },
  avatarLetter: {
    color: colors.night,
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderWidth: 1,
  },
  mine: {
    backgroundColor: colors.own,
    borderColor: colors.line,
    borderBottomRightRadius: 6,
  },
  theirs: {
    backgroundColor: colors.other,
    borderColor: 'rgba(255,255,255,0.06)',
    borderBottomLeftRadius: 6,
  },
  sender: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  text: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  time: {
    color: colors.inkSoft,
    fontSize: 11,
  },
  status: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  statusRead: {
    color: colors.gold,
  },
});

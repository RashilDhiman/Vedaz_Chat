import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  onSend: (text: string) => void;
  onTypingChange: (isTyping: boolean) => void;
};

const TYPING_IDLE_MS = 1200;

export function ChatInput({ onSend, onTypingChange }: Props) {
  const [draft, setDraft] = useState('');
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canSend = draft.trim().length > 0;

  useEffect(() => {
    return () => {
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
      }
      onTypingChange(false);
    };
  }, [onTypingChange]);

  const changeText = (value: string) => {
    setDraft(value);
    const typing = value.trim().length > 0;
    onTypingChange(typing);
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }
    if (typing) {
      idleTimer.current = setTimeout(
        () => onTypingChange(false),
        TYPING_IDLE_MS,
      );
    }
  };

  const send = () => {
    const text = draft.trim();
    if (!text) {
      return;
    }
    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }
    onTypingChange(false);
    onSend(text);
    setDraft('');
  };

  return (
    <View style={styles.bar}>
      <TextInput
        value={draft}
        onChangeText={changeText}
        placeholder="Write to the room"
        placeholderTextColor={colors.inkSoft}
        style={styles.input}
        multiline
        maxLength={2000}
        accessibilityLabel="Message"
      />
      <Pressable
        onPress={send}
        disabled={!canSend}
        style={[styles.send, canSend ? styles.sendReady : styles.sendIdle]}
        accessibilityRole="button"
        accessibilityLabel="Send message"
      >
        <Text style={[styles.sendIcon, canSend ? styles.sendIconReady : null]}>
          ↑
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.night,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 24,
    backgroundColor: colors.plum,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: 16,
    color: colors.ink,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendReady: {
    backgroundColor: colors.gold,
  },
  sendIdle: {
    backgroundColor: colors.plum,
  },
  sendIcon: {
    color: colors.inkSoft,
    fontSize: 22,
    fontWeight: '700',
  },
  sendIconReady: {
    color: colors.night,
  },
});

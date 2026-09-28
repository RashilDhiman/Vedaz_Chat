import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChat } from '../context/ChatContext';
import { colors } from '../theme/colors';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{2,20}$/;

export function LoginScreen() {
  const { login } = useChat();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const trimmed = username.trim();
    if (!USERNAME_PATTERN.test(trimmed)) {
      setError('Use 2–20 letters, numbers, or underscores.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(trimmed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not enter the room.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <View style={styles.mark}>
            <Text style={styles.markLetter}>V</Text>
          </View>
          <Text style={styles.kicker}>Vedaz</Text>
          <Text style={styles.title}>A quieter room for live conversation.</Text>
          <Text style={styles.subtitle}>
            Enter a name. Messages arrive at once, and the thread is still here
            when you return.
          </Text>

          <Text style={styles.label}>Your name</Text>
          <TextInput
            value={username}
            onChangeText={value => {
              setUsername(value);
              if (error) {
                setError(null);
              }
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Asha"
            placeholderTextColor={colors.inkSoft}
            style={styles.input}
            maxLength={20}
            returnKeyType="go"
            onSubmitEditing={submit}
            accessibilityLabel="Username"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            onPress={submit}
            disabled={submitting}
            style={[styles.button, submitting && styles.buttonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Enter the room"
          >
            {submitting ? (
              <ActivityIndicator color={colors.night} />
            ) : (
              <Text style={styles.buttonLabel}>Enter the room</Text>
            )}
          </Pressable>

          <View style={styles.notes}>
            <Text style={styles.note}>Live delivery</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.note}>Saved history</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.note}>Who is here</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.night,
  },
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 36,
    justifyContent: 'center',
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  markLetter: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: '700',
  },
  kicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
  },
  title: {
    marginTop: 10,
    color: colors.ink,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 12,
    color: colors.inkSoft,
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 340,
  },
  label: {
    marginTop: 32,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.ink,
  },
  error: {
    color: colors.danger,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    marginTop: 22,
    backgroundColor: colors.gold,
    borderRadius: 999,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: colors.night,
    fontSize: 16,
    fontWeight: '700',
  },
  notes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
  },
  note: {
    color: colors.inkSoft,
    fontSize: 13,
  },
  dot: {
    color: colors.gold,
    fontSize: 16,
  },
});

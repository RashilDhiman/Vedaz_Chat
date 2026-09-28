import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  usernames: string[];
};

export function TypingIndicator({ usernames }: Props) {
  if (usernames.length === 0) {
    return null;
  }

  const label =
    usernames.length === 1
      ? `${usernames[0]} is writing`
      : usernames.length === 2
      ? `${usernames[0]} and ${usernames[1]} are writing`
      : `${usernames[0]} and ${usernames.length - 1} others are writing`;

  return (
    <View style={styles.wrap}>
      <View style={styles.dot} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  text: {
    color: colors.gold,
    fontSize: 13,
    fontStyle: 'italic',
  },
});

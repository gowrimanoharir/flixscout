import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, gradientAngle, fontFamily, fontSize, radius, layout } from '@/theme';

interface Props {
  role: 'user' | 'assistant' | 'error';
  text: string;
}

export function ChatBubble({ role, text }: Props) {
  const isUser = role === 'user';
  const isError = role === 'error';

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && (
        <LinearGradient
          colors={gradients.dark}
          start={gradientAngle.start}
          end={gradientAngle.end}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>✦</Text>
        </LinearGradient>
      )}
      <View style={[
        styles.bubble,
        isUser ? styles.bubbleUser : styles.bubbleAssistant,
        isError && styles.bubbleError,
      ]}>
        <Text style={[styles.bubbleText, isError && styles.bubbleTextError]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: layout.avatarSize,
    height: layout.avatarSize,
    borderRadius: radius.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 11,
    color: colors.text,
  },
  bubble: {
    maxWidth: '75%',
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderWidth: 1,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderTopLeftRadius: radius.bubbleTip,
    borderTopRightRadius: radius.bubble,
    borderBottomLeftRadius: radius.bubble,
    borderBottomRightRadius: radius.bubble,
  },
  bubbleUser: {
    backgroundColor: colors.lavAlpha12,
    borderColor: colors.lavAlpha20,
    borderTopLeftRadius: radius.bubble,
    borderTopRightRadius: radius.bubbleTip,
    borderBottomLeftRadius: radius.bubble,
    borderBottomRightRadius: radius.bubble,
  },
  bubbleError: {
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
    borderTopLeftRadius: radius.bubbleTip,
    borderTopRightRadius: radius.bubble,
    borderBottomLeftRadius: radius.bubble,
    borderBottomRightRadius: radius.bubble,
  },
  bubbleText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
    color: colors.text,
    lineHeight: fontSize.body * 1.55,
  },
  bubbleTextError: {
    color: colors.errorText,
  },
});

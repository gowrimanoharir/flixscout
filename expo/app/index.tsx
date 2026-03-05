import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DESKTOP_BREAKPOINT } from './_layout';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { GradientText } from '@/components/GradientText';
import { ChatBubble } from '@/components/ChatBubble';
import { ClarificationChips } from '@/components/ClarificationChips';
import { useAgent } from '@/hooks/useAgent';
import type { ChatItem } from '@/hooks/useAgent';
import {
  colors,
  gradients,
  gradientAngle,
  fontFamily,
  fontSize,
  letterSpacing,
  radius,
  spacing,
  layout,
} from '@/theme';

const SUGGESTIONS = [
  'French thriller on Netflix',
  'Short comedy under 90 min',
  'Sci-fi from the last 5 years',
  'Korean drama highly rated',
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const agent = useAgent();

  // Floating animation for the telescope emoji (empty state only)
  const offsetY = useSharedValue(0);
  useEffect(() => {
    offsetY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offsetY.value }],
  }));

  const desktopPadH = isDesktop ? 48 : spacing.chatPadH;
  const hasActivity = agent.items.length > 0 || agent.isLoading;

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || agent.isLoading) return;
    setInput('');
    agent.send(msg);
  }

  function renderItem(item: ChatItem) {
    switch (item.kind) {
      case 'user':
        return <ChatBubble key={item.id} role="user" text={item.text} />;
      case 'assistant':
        return <ChatBubble key={item.id} role="assistant" text={item.text} />;
      case 'error':
        return <ChatBubble key={item.id} role="error" text={item.text} />;
      case 'clarification':
        return (
          <ClarificationChips
            key={item.id}
            questions={item.questions}
            onSubmit={agent.submitClarification}
          />
        );
      case 'cards': {
        const summary = item.titles
          .map(t => `• ${t.title} — ${t.platform}`)
          .join('\n');
        return (
          <ChatBubble
            key={item.id}
            role="assistant"
            text={`Found ${item.titles.length} title${item.titles.length !== 1 ? 's' : ''} on your platforms:\n\n${summary}`}
          />
        );
      }
      default:
        return null;
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Nav ── */}
      <View style={[styles.nav, { paddingHorizontal: isDesktop ? 48 : 20 }]}>
        <GradientText style={styles.logoText}>FlixScout</GradientText>
        <View style={styles.navBadge}>
          <Text style={styles.navBadgeText}>Beta</Text>
        </View>
      </View>

      {/* ── Chat area ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={[styles.chatContent, { paddingHorizontal: desktopPadH }]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {!hasActivity ? (
          /* ── Empty state ── */
          <View style={styles.emptyState}>

            <Animated.Text style={[styles.emptyIcon, floatStyle]}>
              🔭
            </Animated.Text>

            <GradientText style={styles.emptyTitle}>
              What do you want to watch?
            </GradientText>

            <Text style={[styles.emptySub, isDesktop && styles.emptySubDesktop]}>
              Tell me your mood, a genre, a vibe — I'll scout your platforms and find it.
            </Text>

            <View style={[styles.hintStrip, isDesktop && styles.hintStripDesktop]}>
              <Text style={styles.hintIcon}>💬</Text>
              <Text style={styles.hintText}>
                Type naturally — include your{' '}
                <Text style={styles.hintHighlight}>streaming services</Text>
                , mood, language, runtime, anything. Or tap a suggestion to start.
              </Text>
            </View>

            <View style={[styles.orDivider, isDesktop && styles.orDividerDesktop]}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>quick start</Text>
              <View style={styles.orLine} />
            </View>

            <View style={[styles.suggestions, isDesktop && styles.suggestionsDesktop]}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.sugPill}
                  onPress={() => handleSend(s)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sugPillText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

          </View>
        ) : (
          /* ── Chat messages ── */
          <View style={styles.messages}>
            {agent.items.map(renderItem)}
            {agent.isLoading && <TypingIndicator text={agent.statusText} />}
          </View>
        )}
      </ScrollView>

      {/* ── Input bar ── */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.inputBarV }]}>
        <View style={[styles.inputRow, { paddingHorizontal: isDesktop ? 48 : spacing.inputBarH }]}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="I'm in the mood for…"
              placeholderTextColor={colors.text3}
              value={input}
              onChangeText={setInput}
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
              blurOnSubmit={false}
              editable={!agent.isLoading}
            />
          </View>
          <TouchableOpacity
            onPress={() => handleSend()}
            activeOpacity={0.8}
            disabled={agent.isLoading}
          >
            <LinearGradient
              colors={gradients.dark}
              start={gradientAngle.start}
              end={gradientAngle.end}
              style={[styles.sendBtn, agent.isLoading && styles.sendBtnDisabled]}
            >
              <Text style={styles.sendArrow}>↑</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

function TypingIndicator({ text }: { text: string | null }) {
  return (
    <View style={styles.typingRow}>
      <LinearGradient
        colors={gradients.dark}
        start={gradientAngle.start}
        end={gradientAngle.end}
        style={styles.typingAvatar}
      >
        <Text style={styles.typingAvatarText}>✦</Text>
      </LinearGradient>
      <View style={styles.typingBubble}>
        <Text style={styles.typingText}>{text ?? '…'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Nav
  nav: {
    height: layout.navHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.navBg,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(16px)' } : {}),
  } as object,
  logoText: {
    fontFamily: fontFamily.logo,
    fontSize: fontSize.logo,
    letterSpacing: letterSpacing.logo,
  },
  navBadge: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  navBadgeText: {
    fontFamily: fontFamily.bodyMed,
    fontSize: fontSize.navBadge,
    color: colors.text2,
    letterSpacing: letterSpacing.navBadge,
  },

  // Chat area
  chatArea: {
    flex: 1,
  },
  chatContent: {
    flexGrow: 1,
    paddingVertical: spacing.chatPadV,
  },

  // Messages list
  messages: {
    gap: spacing.msgGap,
  },

  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  typingAvatar: {
    width: layout.avatarSize,
    height: layout.avatarSize,
    borderRadius: radius.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  typingAvatarText: {
    fontSize: 11,
    color: colors.text,
  },
  typingBubble: {
    paddingVertical: 10,
    paddingHorizontal: 13,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  typingText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
    color: colors.text2,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    gap: 13,
    paddingTop: 48,
    paddingBottom: 32,
  },
  emptyIcon: {
    fontSize: 34,
  },
  emptyTitle: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.heading,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
    color: colors.text2,
    textAlign: 'center',
    lineHeight: fontSize.body * 1.6,
    maxWidth: 250,
  },
  emptySubDesktop: { maxWidth: 480 },
  hintStripDesktop: { maxWidth: 560 },
  orDividerDesktop: { maxWidth: 560 },
  suggestionsDesktop: { maxWidth: 560, flexDirection: 'row', flexWrap: 'wrap' },

  // Hint strip
  hintStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.skyAlpha05,
    borderWidth: 1,
    borderColor: colors.skyAlpha12,
    borderRadius: radius.hint,
    padding: 10,
    paddingHorizontal: 13,
    maxWidth: 300,
    width: '100%',
  },
  hintIcon: {
    fontSize: 13,
    marginTop: 1,
    opacity: 0.7,
  },
  hintText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: fontSize.chip,
    color: colors.text2,
    lineHeight: fontSize.chip * 1.55,
  },
  hintHighlight: {
    color: colors.accentSky,
    fontFamily: fontFamily.bodyMed,
  },

  // Or divider
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 300,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.text3,
  },

  // Suggestion pills
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'center',
    maxWidth: 300,
  },
  sugPill: {
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border2,
  },
  sugPillText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.chip,
    color: colors.text2,
  },

  // Input bar
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.inputBarBg,
    paddingTop: spacing.inputBarV,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } : {}),
  } as object,
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: radius.input,
    paddingVertical: spacing.inputPadV,
    paddingHorizontal: spacing.inputPadH,
  },
  input: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.body,
    color: colors.text,
  },
  sendBtn: {
    width: layout.sendBtnSize,
    height: layout.sendBtnSize,
    borderRadius: radius.sendBtn,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.skyAlpha12,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendArrow: {
    color: colors.text,
    fontSize: 16,
    fontFamily: fontFamily.bodySemi,
  },
});

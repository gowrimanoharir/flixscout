import { useState, useEffect } from 'react';
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

  // Floating animation for the telescope emoji
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Nav — truly full-width ── */}
      <View style={[styles.nav, { paddingHorizontal: isDesktop ? 48 : 20 }]}>
        <GradientText style={styles.logoText}>FlixScout</GradientText>
        <View style={styles.navBadge}>
          <Text style={styles.navBadgeText}>Beta</Text>
        </View>
      </View>

      {/* ── Chat area — full-width with desktop padding ── */}
      <ScrollView
        style={styles.chatArea}
        contentContainerStyle={[styles.chatContent, { paddingHorizontal: desktopPadH }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.emptyState}>

          {/* Floating icon */}
          <Animated.Text style={[styles.emptyIcon, floatStyle]}>
            🔭
          </Animated.Text>

          {/* Heading */}
          <GradientText style={styles.emptyTitle}>
            What do you want to watch?
          </GradientText>

          {/* Subtitle */}
          <Text style={[styles.emptySub, isDesktop && styles.emptySubDesktop]}>
            Tell me your mood, a genre, a vibe — I'll scout your platforms and find it.
          </Text>

          {/* Hint strip */}
          <View style={[styles.hintStrip, isDesktop && styles.hintStripDesktop]}>
            <Text style={styles.hintIcon}>💬</Text>
            <Text style={styles.hintText}>
              Type naturally — include your{' '}
              <Text style={styles.hintHighlight}>streaming services</Text>
              , mood, language, runtime, anything. Or tap a suggestion to start.
            </Text>
          </View>

          {/* Quick start divider */}
          <View style={[styles.orDivider, isDesktop && styles.orDividerDesktop]}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>quick start</Text>
            <View style={styles.orLine} />
          </View>

          {/* Suggestion pills */}
          <View style={[styles.suggestions, isDesktop && styles.suggestionsDesktop]}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.sugPill}
                onPress={() => setInput(s)}
                activeOpacity={0.7}
              >
                <Text style={styles.sugPillText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

        </View>
      </ScrollView>

      {/* ── Input bar — full-width ── */}
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
            />
          </View>
          <TouchableOpacity activeOpacity={0.8}>
            <LinearGradient
              colors={gradients.dark}
              start={gradientAngle.start}
              end={gradientAngle.end}
              style={styles.sendBtn}
            >
              <SendIcon />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

function SendIcon() {
  return (
    <Text style={styles.sendArrow}>↑</Text>
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
    paddingHorizontal: spacing.inputBarH,
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
  sendArrow: {
    color: colors.text,
    fontSize: 16,
    fontFamily: fontFamily.bodySemi,
  },
});

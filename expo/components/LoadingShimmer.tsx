import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, gradientAngle, fontFamily, fontSize, radius, layout } from '@/theme';

interface Props {
  statusText: string | null;
}

export function LoadingShimmer({ statusText }: Props) {
  const shimmer = useSharedValue(0.25);
  const dot = useSharedValue(1);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    dot.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      false,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value }));

  return (
    <View style={styles.row}>
      <LinearGradient
        colors={gradients.dark}
        start={gradientAngle.start}
        end={gradientAngle.end}
        style={styles.avatar}
      >
        <Text style={styles.avatarText}>✦</Text>
      </LinearGradient>

      <View style={styles.bubble}>
        {[1, 0.72, 0.48].map((w, i) => (
          <Animated.View
            key={i}
            style={[styles.shimmerLine, { width: `${w * 100}%` as `${number}%` }, shimmerStyle]}
          />
        ))}
        {statusText ? (
          <View style={styles.statusRow}>
            <Animated.View style={[styles.dot, dotStyle]} />
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        ) : null}
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
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 13,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    flex: 1,
    maxWidth: 220,
  },
  shimmerLine: {
    height: 9,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  dot: {
    width: layout.dotSize,
    height: layout.dotSize,
    borderRadius: radius.dot,
    backgroundColor: colors.accentSky,
  },
  statusText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.loadStatus,
    color: colors.text2,
  },
});

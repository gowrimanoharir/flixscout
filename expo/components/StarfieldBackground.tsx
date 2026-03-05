// 90 twinkling star-specks matching the flixscout-final.html milky way background.
// Positions are seeded-deterministic so they're stable across renders.
// Uses Reanimated withRepeat/withSequence for native-threaded opacity tween.

import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

// ── Seeded LCG random (deterministic star positions) ──────────────────────
function seededRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface StarData {
  id: number;
  x: string;   // percentage string e.g. "23.45%"
  y: string;
  size: number; // 1.5 or 2
  min: number;  // min opacity
  max: number;  // max opacity
  dur: number;  // half-period in ms
  delay: number; // initial delay in ms
}

const r = seededRand(42);
const STARS: StarData[] = Array.from({ length: 90 }, (_, id) => ({
  id,
  x: `${(r() * 100).toFixed(2)}%`,
  y: `${(r() * 100).toFixed(2)}%`,
  size: r() < 0.12 ? 2 : 1.5,
  min: parseFloat((r() * 0.2 + 0.08).toFixed(2)),
  max: parseFloat((r() * 0.35 + 0.25).toFixed(2)),
  dur: Math.round((r() * 4 + 2) * 1000),
  delay: Math.round(r() * 5 * 1000),
}));

// ── Single star ────────────────────────────────────────────────────────────
function Star({ x, y, size, min, max, dur, delay }: Omit<StarData, 'id'>) {
  const opacity = useSharedValue(min);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(max, { duration: dur / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(min, { duration: dur / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.star,
        { left: x, top: y, width: size, height: size, borderRadius: size / 2 } as object,
        animStyle,
      ]}
    />
  );
}

// ── Exported component ─────────────────────────────────────────────────────
export function StarfieldBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {STARS.map(({ id, ...star }) => (
        <Star key={id} {...star} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
});

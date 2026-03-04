// Platform-aware gradient text.
// Web: CSS backgroundClip trick renders true gradient text.
// Native: solid accentSky — MaskedView approach deferred to polish phase.

import { Text, Platform } from 'react-native';
import type { TextProps } from 'react-native';
import { colors, gradients } from '@/theme';

interface GradientTextProps extends TextProps {
  children: React.ReactNode;
}

export function GradientText({ style, children, ...props }: GradientTextProps) {
  if (Platform.OS === 'web') {
    return (
      <Text
        style={[
          style,
          {
            background: `linear-gradient(135deg, ${gradients.light[0]}, ${gradients.light[1]})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          } as object,
        ]}
        {...props}
      >
        {children}
      </Text>
    );
  }

  return (
    <Text style={[style, { color: colors.accentSky }]} {...props}>
      {children}
    </Text>
  );
}

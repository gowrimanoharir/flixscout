import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, gradientAngle, fontFamily, fontSize, radius, layout } from '@/theme';
import type { ClarificationQuestion } from '@/shared/types';

interface Props {
  questions: ClarificationQuestion[];
  onSubmit: (answers: Record<string, string[]>) => void;
}

export function ClarificationChips({ questions, onSubmit }: Props) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const allAnswered = questions.every(q => (answers[q.question]?.length ?? 0) > 0);

  function toggle(question: string, option: string) {
    setAnswers(prev => {
      const current = prev[question] ?? [];
      const isSelected = current.includes(option);
      return {
        ...prev,
        [question]: isSelected
          ? current.filter(o => o !== option)
          : [...current, option],
      };
    });
  }

  return (
    <View style={styles.container}>
      {questions.map(q => (
        <View key={q.question} style={styles.block}>
          <Text style={styles.questionText}>{q.question}</Text>
          <View style={styles.chips}>
            {q.options.map(opt => {
              const selected = (answers[q.question] ?? []).includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggle(q.question, opt)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}

      {allAnswered && (
        <TouchableOpacity onPress={() => onSubmit(answers)} activeOpacity={0.8}>
          <LinearGradient
            colors={gradients.dark}
            start={gradientAngle.start}
            end={gradientAngle.end}
            style={styles.submitBtn}
          >
            <Text style={styles.submitText}>Scout it →</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    // align with assistant bubble text content (avatar width + row gap)
    marginLeft: layout.avatarSize + 8,
  },
  block: {
    gap: 7,
  },
  questionText: {
    fontFamily: fontFamily.bodyMed,
    fontSize: fontSize.body,
    color: colors.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.border2,
  },
  chipSelected: {
    backgroundColor: colors.skyAlpha10,
    borderColor: colors.skyAlpha30,
  },
  chipText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.chip,
    color: colors.text2,
  },
  chipTextSelected: {
    color: colors.accentSky,
    fontFamily: fontFamily.bodyMed,
  },
  submitBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: radius.continueBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: fontSize.body,
    color: colors.text,
  },
});

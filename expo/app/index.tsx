// TODO: Phase 6 — Main chat screen
// Implements all 5 screen states: empty, clarification, loading, results, no-results
// Design reference: flixscout-final.html

import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>FlixScout</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.text,
    fontSize: 20,
  },
});

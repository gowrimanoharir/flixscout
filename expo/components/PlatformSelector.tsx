import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fontFamily, fontSize, radius } from '@/theme';
import { useRegionPlatforms } from '@/hooks/useRegionPlatforms';
import { useCountryServices } from '@/hooks/useCountryServices';

interface Props {
  selected: string[];             // array of service id slugs e.g. ["netflix","prime"]
  onChange: (platforms: string[]) => void;
}

export function PlatformSelector({ selected, onChange }: Props) {
  const region = useRegionPlatforms();
  const { services, loading } = useCountryServices(region.countryCode);
  const [customInput, setCustomInput] = useState('');
  const [customPlatforms, setCustomPlatforms] = useState<string[]>([]);

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(p => p !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function addCustom() {
    const id = customInput.trim().toLowerCase();
    if (!id) return;
    if (!customPlatforms.includes(id)) {
      setCustomPlatforms(prev => [...prev, id]);
    }
    if (!selected.includes(id)) {
      onChange([...selected, id]);
    }
    setCustomInput('');
  }

  function removeCustom(id: string) {
    setCustomPlatforms(prev => prev.filter(p => p !== id));
    onChange(selected.filter(p => p !== id));
  }

  return (
    <View style={styles.container}>

      {/* Header: region badge + count */}
      <View style={styles.header}>
        <View style={styles.regionBadge}>
          <Text style={styles.regionText}>{region.flag} {region.label}</Text>
        </View>
        {selected.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{selected.length} selected</Text>
          </View>
        )}
      </View>

      {/* Platform chips */}
      {loading ? (
        <ActivityIndicator size="small" color={colors.accentSky} style={styles.loader} />
      ) : (
        <View style={styles.chips}>
          {services.map(({ id, name }) => {
            const isSelected = selected.includes(id);
            return (
              <TouchableOpacity
                key={id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggle(id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}

          {customPlatforms.map(id => {
            const isSelected = selected.includes(id);
            return (
              <View key={id} style={[styles.chip, styles.customChip, isSelected && styles.chipSelected]}>
                <TouchableOpacity onPress={() => toggle(id)} activeOpacity={0.7}>
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {id}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeCustom(id)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>×</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Add custom service */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder="Add a service…"
          placeholderTextColor={colors.text3}
          value={customInput}
          onChangeText={setCustomInput}
          onSubmitEditing={addCustom}
          returnKeyType="done"
        />
        {customInput.trim() ? (
          <TouchableOpacity onPress={addCustom} style={styles.addBtn} activeOpacity={0.7}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        ) : null}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 9,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  regionBadge: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  regionText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.meta,
    color: colors.text2,
  },
  countBadge: {
    backgroundColor: colors.skyAlpha10,
    borderWidth: 1,
    borderColor: colors.skyAlpha20,
    borderRadius: radius.countBadge,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  countText: {
    fontFamily: fontFamily.bodyMed,
    fontSize: fontSize.meta,
    color: colors.accentSky,
  },
  loader: {
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
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
  customChip: {
    gap: 5,
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
  removeBtn: {
    padding: 1,
  },
  removeBtnText: {
    fontSize: 14,
    color: colors.text3,
    lineHeight: 14,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  addInput: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: fontSize.chip,
    color: colors.text,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: radius.input,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.skyAlpha10,
    borderWidth: 1,
    borderColor: colors.skyAlpha20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 18,
    color: colors.accentSky,
    lineHeight: 20,
  },
});

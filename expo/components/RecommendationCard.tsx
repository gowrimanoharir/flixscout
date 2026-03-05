import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing, layout } from '@/theme';
import type { AvailableTitle } from '@/shared/types';

interface Props {
  title: AvailableTitle;
}

export function RecommendationCard({ title }: Props) {
  const [expanded, setExpanded] = useState(false);

  const metaParts = [
    title.year,
    title.runtime && title.runtime !== 'N/A' ? title.runtime : null,
    title.imdbRating ? `★ ${title.imdbRating}` : null,
  ].filter(Boolean).join('  ·  ');

  const genres = title.genre
    ? title.genre.split(',').map(g => g.trim()).slice(0, 3)
    : [];

  return (
    <View style={styles.card}>
      <View style={styles.top}>

        {/* Poster */}
        {title.posterUrl && title.posterUrl !== 'N/A' ? (
          <Image source={{ uri: title.posterUrl }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Text style={styles.posterEmoji}>🎬</Text>
          </View>
        )}

        {/* Info column */}
        <View style={styles.info}>
          <Text style={styles.titleText} numberOfLines={2}>{title.title}</Text>

          {metaParts ? (
            <Text style={styles.meta}>{metaParts}</Text>
          ) : null}

          {genres.length > 0 && (
            <View style={styles.tags}>
              {genres.map(g => (
                <View key={g} style={styles.tag}>
                  <Text style={styles.tagText}>{g}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.platformBadge}>
            <Text style={styles.platformText}>{title.platform}</Text>
          </View>
        </View>
      </View>

      {/* Synopsis */}
      {title.overview ? (
        <TouchableOpacity onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
          <Text style={styles.overview} numberOfLines={expanded ? undefined : 2}>
            {title.overview}
          </Text>
          <Text style={styles.expandToggle}>
            {expanded ? 'Show less ↑' : 'Show more ↓'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Watch button */}
      <TouchableOpacity
        style={styles.watchBtn}
        onPress={() => Linking.openURL(title.streamUrl)}
        activeOpacity={0.8}
      >
        <Text style={styles.watchBtnText}>Watch on {title.platform} →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: spacing.cardPad,
    gap: 10,
  },
  top: {
    flexDirection: 'row',
    gap: 11,
  },

  // Poster
  poster: {
    width: layout.posterWidth,
    height: layout.posterHeight,
    borderRadius: radius.cardInner,
    flexShrink: 0,
  },
  posterPlaceholder: {
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterEmoji: {
    fontSize: 22,
  },

  // Info
  info: {
    flex: 1,
    gap: 5,
  },
  titleText: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.cardTitle,
    color: colors.text,
    lineHeight: fontSize.cardTitle * 1.3,
  },
  meta: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.meta,
    color: colors.text2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    backgroundColor: colors.surface3,
    borderRadius: radius.genreTag,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  tagText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.meta,
    color: colors.text2,
  },
  platformBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.skyAlpha10,
    borderWidth: 1,
    borderColor: colors.skyAlpha20,
    borderRadius: radius.platformBadge,
    paddingVertical: 2,
    paddingHorizontal: 7,
    marginTop: 2,
  },
  platformText: {
    fontFamily: fontFamily.bodyMed,
    fontSize: fontSize.meta,
    color: colors.accentSky,
  },

  // Synopsis
  overview: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.chip,
    color: colors.text2,
    lineHeight: fontSize.chip * 1.55,
  },
  expandToggle: {
    fontFamily: fontFamily.bodyMed,
    fontSize: fontSize.meta,
    color: colors.accentSky,
    marginTop: 3,
  },

  // Watch button
  watchBtn: {
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: radius.actionBtn,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.border2,
    alignSelf: 'flex-start',
  },
  watchBtnText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: fontSize.chip,
    color: colors.text,
  },
});

// components/advocacy/AdvocacyCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { IAdvocacyArticle } from '../../services/Advocacy';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.82;

interface AdvocacyCardProps {
  article: IAdvocacyArticle;
  onPress: () => void;
  compact?: boolean;
  width?: number;
  style?: any;
  commentCount?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  educational: '#197d1d',
  'success-story': '#2196F3',
  'policy-brief': '#FF9800',
  'community-resource': '#9C27B0',
};

const CATEGORY_LABELS: Record<string, string> = {
  educational: 'Education',
  'success-story': 'Success Story',
  'policy-brief': 'Policy',
  'community-resource': 'Community',
};

const AdvocacyCard: React.FC<AdvocacyCardProps> = ({
  article,
  onPress,
  compact = false,
  width = CARD_WIDTH,
  style,
  commentCount,
}) => {
  const { darkMode } = useTheme();

  const catColor = CATEGORY_COLORS[article.category] || '#757575';
  const catLabel = CATEGORY_LABELS[article.category] || article.category;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <TouchableOpacity
      style={[styles.card, { width }, darkMode && styles.cardDark, compact && styles.cardCompact, style]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Image */}
      <Image
        source={
          article.featuredImage?.url
            ? { uri: article.featuredImage.url }
            : require('../../assets/images/doc_1.jpeg')
        }
        style={compact ? styles.imageCompact : styles.image}
        resizeMode="cover"
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Badge */}
        <View style={[styles.badge, { backgroundColor: catColor }]}>
          <Text style={styles.badgeText}>{catLabel}</Text>
        </View>

        {/* Title */}
        <Text
          style={[styles.title, darkMode && styles.titleDark, compact && styles.titleCompact]}
          numberOfLines={compact ? 2 : 3}
        >
          {article.title}
        </Text>

        {/* Excerpt — only in full mode */}
        {!compact && (
          <Text
            style={[styles.excerpt, darkMode && styles.excerptDark]}
            numberOfLines={2}
          >
            {article.excerpt}
          </Text>
        )}

        {/* Footer */}
        <View style={[styles.footer, darkMode && styles.footerDark]}>
          <View style={styles.authorRow}>
            <Feather name="user" size={12} color={darkMode ? '#B0B0B0' : '#777'} />
            <Text style={[styles.authorText, darkMode && styles.authorTextDark]} numberOfLines={1}>
              {article.author.name}
              {article.author.role ? ` · ${article.author.role}` : ''}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={11} color={darkMode ? '#AAA' : '#999'} />
              <Text style={[styles.metaText, darkMode && styles.metaTextDark]}>
                {article.readTime} min
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="eye" size={11} color={darkMode ? '#AAA' : '#999'} />
              <Text style={[styles.metaText, darkMode && styles.metaTextDark]}>{article.views}</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="heart" size={11} color={darkMode ? '#AAA' : '#999'} />
              <Text style={[styles.metaText, darkMode && styles.metaTextDark]}>{article.likes}</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="message-circle" size={11} color={darkMode ? '#AAA' : '#999'} />
              <Text style={[styles.metaText, darkMode && styles.metaTextDark]}>
                {commentCount ?? article.commentsCount}
              </Text>
            </View>
          </View>

          <Text style={[styles.date, darkMode && styles.dateDark]}>
            {formatDate(article.publishedAt || article.createdAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default AdvocacyCard;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
  },
  cardDark: { backgroundColor: '#1A1A1A' },
  cardCompact: { width: SCREEN_WIDTH * 0.62 },

  image: { width: '100%', height: 150, backgroundColor: '#F0F0F0' },
  imageCompact: { width: '100%', height: 100, backgroundColor: '#F0F0F0' },

  content: { padding: 12 },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },

  title: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 6, lineHeight: 21 },
  titleDark: { color: '#FFF' },
  titleCompact: { fontSize: 14, lineHeight: 19 },

  excerpt: { fontSize: 13, color: '#666', lineHeight: 19, marginBottom: 10 },
  excerptDark: { color: '#ADADAD' },

  footer: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 10, marginTop: 6 },
  footerDark: { borderTopColor: '#2A2A2A' },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 7 },
  authorText: { fontSize: 12, color: '#666', flex: 1 },
  authorTextDark: { color: '#ADADAD' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: '#999' },
  metaTextDark: { color: '#ADADAD' },

  date: { fontSize: 11, color: '#BDBDBD' },
  dateDark: { color: '#777' },
});

// components/advocacy/AdvocacyCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { IAdvocacyArticle } from '../../services/Advocacy';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;

interface AdvocacyCardProps {
  article: IAdvocacyArticle;
  onPress: () => void;
  compact?: boolean;
  width?: number;
  style?: any;  
  commentCount?: number; // <-- live comment count
}

const AdvocacyCard: React.FC<AdvocacyCardProps> = ({
  article,
  onPress,
  compact = false,
  width = CARD_WIDTH,
  style,
  commentCount,
}) => {
  const { darkMode } = useTheme();

  const cardStyles = [
    styles.card,
    { width },
    darkMode && styles.cardDark,
    compact && styles.cardCompact,
    style,
  ];

  const getCategoryColor = (category: string) => {
    const colors = {
      educational: '#197d1dff',
      'success-story': '#2196F3',
      'policy-brief': '#FF9800',
      'community-resource': '#9C27B0',
    };
    return colors[category as keyof typeof colors] || '#757575';
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      educational: 'Education',
      'success-story': 'Success Story',
      'policy-brief': 'Policy',
      'community-resource': 'Community',
    };
    return labels[category as keyof typeof labels] || category;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const titleStyles = [styles.title, darkMode && styles.titleDark, compact && styles.titleCompact];
  const excerptStyles = [styles.excerpt, darkMode && styles.excerptDark];
  const authorStyles = [styles.authorText, darkMode && styles.authorTextDark];
  const dateStyles = [styles.dateText, darkMode && styles.dateTextDark];
  const metaTextStyles = [styles.metaText, darkMode && styles.metaTextDark];

  return (
    <TouchableOpacity style={cardStyles} onPress={onPress} activeOpacity={0.8}>
      {/* Featured Image */}
      <Image
        source={
          article.featuredImage?.url
            ? { uri: article.featuredImage.url }
            : require('../../assets/images/doc_1.jpeg') // fallback
        }
        style={compact ? styles.imageCompact : styles.image}
        resizeMode="cover"
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(article.category) }]}>
          <Text style={styles.categoryText}>{getCategoryLabel(article.category)}</Text>
        </View>

        {/* Title */}
        <Text style={titleStyles} numberOfLines={compact ? 2 : 3}>
          {article.title}
        </Text>

        {/* Excerpt */}
        {!compact && (
          <Text style={excerptStyles} numberOfLines={2}>
            {article.excerpt}
          </Text>
        )}

        {/* Author & Meta Info */}
        <View style={styles.footer}>
          <View style={styles.authorRow}>
            <Feather name="user" size={14} color={darkMode ? '#B0B0B0' : '#666'} />
            <Text style={authorStyles}>
              {article.author.name}
              {article.author.role && ` • ${article.author.role}`}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={14} color={darkMode ? '#B0B0B0' : '#888'} />
              <Text style={metaTextStyles}>{article.readTime} min read</Text>
            </View>

            <View style={styles.metaItem}>
              <Feather name="eye" size={14} color={darkMode ? '#B0B0B0' : '#888'} />
              <Text style={metaTextStyles}>{article.views}</Text>
            </View>

            <View style={styles.metaItem}>
              <Feather name="heart" size={14} color={darkMode ? '#B0B0B0' : '#888'} />
              <Text style={metaTextStyles}>{article.likes}</Text>
            </View>

            <View style={styles.metaItem}>
              <Feather name="message-circle" size={14} color={darkMode ? '#B0B0B0' : '#888'} />
              <Text style={metaTextStyles}>
                {commentCount ?? article.commentsCount} {commentCount === 1 ? 'comment' : 'comments'}
              </Text>
            </View>
          </View>
        </View>

        {/* Date */}
        <Text style={dateStyles}>{formatDate(article.publishedAt || article.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  cardDark: {
    backgroundColor: '#1A1A1A',
    shadowOpacity: 0.3,
  },
  cardCompact: {
    width: SCREEN_WIDTH * 0.7,
  },
  image: { width: '100%', height: 200, backgroundColor: '#F0F0F0' },
  imageCompact: { width: '100%', height: 140, backgroundColor: '#F0F0F0' },
  content: { padding: 16 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  categoryText: { color: '#FFF', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, lineHeight: 24 },
  titleDark: { color: '#FFF' },
  titleCompact: { fontSize: 16, lineHeight: 22 },
  excerpt: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 12 },
  excerptDark: { color: '#B0B0B0' },
  footer: { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12, marginTop: 8 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  authorText: { fontSize: 13, color: '#666', marginLeft: 6 },
  authorTextDark: { color: '#B0B0B0' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#888' },
  metaTextDark: { color: '#B0B0B0' },
  dateText: { fontSize: 12, color: '#999', marginTop: 8 },
  dateTextDark: { color: '#888' },
});

export default AdvocacyCard;

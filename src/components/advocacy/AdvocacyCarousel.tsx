// components/advocacy/AdvocacyCarousel.tsx
import React, { useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import { useNavigation, CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../types/Auth";
import { AppStackParamList } from "../../types/App";
import AdvocacyCard from './AdvocacyCard';
import { useAdvocacy } from '../../hooks/useAdvocacy';
import { useTheme } from '../../context/ThemeContext';
import { useComments } from '../../hooks/useComment';
import { IAdvocacyArticle } from '../../services/Advocacy';
import SectionHeader from '../common/SectionHeader';
import { SPACING } from '../../theme/layout';

type AppStackNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AppStackParamList, "ArticleDetailScreen">,
  NativeStackNavigationProp<AuthStackParamList>
>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Same width as the product and doctor carousels on this screen, so all
// three read as one consistent size instead of this one dwarfing the rest.
const CARD_WIDTH = SCREEN_WIDTH * 0.45;
const CARD_MARGIN = 10;
const AUTO_SCROLL_INTERVAL = 5000; // 5 seconds

const AdvocacyCarousel: React.FC = () => {
  const { featuredArticles, fetchFeaturedArticles, loading } = useAdvocacy();
  const navigation = useNavigation<AppStackNavigationProp>();
  const { darkMode } = useTheme();
  const flatListRef = useRef<FlatList<IAdvocacyArticle>>(null);
  const currentIndexRef = useRef(0);
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch featured articles
  useEffect(() => {
    fetchFeaturedArticles(5);
  }, [fetchFeaturedArticles]);

  // Auto-scroll
  useEffect(() => {
    if (featuredArticles.length > 1) {
      autoScrollTimerRef.current = setInterval(() => {
        currentIndexRef.current = (currentIndexRef.current + 1) % featuredArticles.length;
        flatListRef.current?.scrollToIndex({
          index: currentIndexRef.current,
          animated: true,
        });
      }, AUTO_SCROLL_INTERVAL);
    }
    return () => {
      if (autoScrollTimerRef.current) clearInterval(autoScrollTimerRef.current);
    };
  }, [featuredArticles]);

  const handleArticlePress = (slug: string) => {
    navigation.navigate("ArticleDetailScreen", { slug });
  };

  const onScrollToIndexFailed = (info: any) => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
    }, 500);
  };

  const errorTextStyles = [styles.errorText, darkMode && styles.errorTextDark];
  const noDataTextStyles = [styles.noDataText, darkMode && styles.noDataTextDark];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D81E5B" />
      </View>
    );
  }

  if (!featuredArticles || featuredArticles.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={noDataTextStyles}>No featured articles available</Text>
      </View>
    );
  }

  
    const handleSeeAll = () => {
        navigation.navigate('AllArticleScreen' as any); 
    };

  return (
    <View style={styles.container}>
         <SectionHeader title="Featured Articles" onLinkPress={handleSeeAll} />
    <FlatList
  ref={flatListRef}
  data={featuredArticles}
  keyExtractor={(item) => item._id}
  horizontal
  showsHorizontalScrollIndicator={false}
  snapToInterval={CARD_WIDTH + CARD_MARGIN}
  decelerationRate="fast"
  contentContainerStyle={{ paddingVertical: 5 }}
  onScrollToIndexFailed={onScrollToIndexFailed}
  renderItem={({ item }) => (
    <AdvocacyCard
      article={item}
      width={CARD_WIDTH}
      compact
      onPress={() => handleArticlePress(item.slug)}
      commentCount={item.commentsCount}
      style={{ marginRight: CARD_MARGIN }}
    />
  )}
/>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: SPACING.md },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', height: 200 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', height: 200 },
  errorText: { color: '#D81E5B' },
  errorTextDark: { color: '#ff8fb3' },
  noDataText: { color: '#333' },
  noDataTextDark: { color: '#ddd' },
});

export default AdvocacyCarousel;

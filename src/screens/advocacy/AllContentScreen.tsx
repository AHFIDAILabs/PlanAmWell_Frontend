// screens/advocacy/AllArticlesScreen.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import BottomBar from '../../components/common/BottomBar';
import AdvocacyCard from '../../components/advocacy/AdvocacyCard';
import { useAdvocacy } from '../../hooks/useAdvocacy';
import { IAdvocacyArticle } from '../../services/Advocacy';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../types/App';
import { AuthStackParamList } from '../../types/Auth';
import Header from '../../components/home/header';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;
const CARD_MARGIN = 16;

type AppStackNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AppStackParamList, "ArticleDetailScreen">,
  NativeStackNavigationProp<AuthStackParamList>
>;

export default function AllArticlesScreen() {
   const navigation = useNavigation<AppStackNavigationProp>();
  const { darkMode, colors } = useTheme();
  const { articles, fetchArticles, loading } = useAdvocacy();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch all articles
  useEffect(() => {
    fetchArticles({ page: 1, limit: 100 }); // fetch all or adjust limit
  }, [fetchArticles]);


  // Filtered articles based on search & category
  const filteredArticles = useMemo(() => {
    return articles.filter((article: IAdvocacyArticle) => {
      const matchesSearch =
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory ? article.category === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchQuery, selectedCategory]);


  const renderCategoryFilters = () => {
    const categories = ['all', 'educational', 'success-story', 'policy-brief', 'community-resource'];
    return (
      <View style={styles.filterContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterButton,
              selectedCategory === cat && { backgroundColor: colors.primary }
            ]}
            onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            <Text style={{ color: selectedCategory === cat ? '#fff' : colors.text }}>
              {cat.replace(/-/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };


    const handleArticlePress = (slug: string) => {
     navigation.navigate("ArticleDetailScreen", { slug });
  };


  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.card}]}> 
    <View style={{ flex: 1, backgroundColor: colors.background }}>
         <View style={styles.header}>
        <Feather name="arrow-left" size={24} color="#111" onPress={() => {}} />
        <Text style={styles.headerTitle}>All Articles</Text>
        </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { borderColor: colors.border }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search articles..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filters */}
      {renderCategoryFilters()}

      {/* Articles List */}
      <FlatList
        data={filteredArticles}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => (
          <AdvocacyCard
            article={item}
            width={CARD_WIDTH}
            onPress={() => handleArticlePress(item.slug)}
            style={{ marginHorizontal: CARD_MARGIN, marginBottom: 16 }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={{ color: colors.textMuted }}>No articles found</Text>
          </View>
        }
      />

      {/* Bottom Bar */}
      <BottomBar activeRoute="AllArticlesScreen" cartItemCount={0} />
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  searchContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { fontSize: 16 },
  filterContainer: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, marginBottom: 10, gap: 8 },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
   header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
});

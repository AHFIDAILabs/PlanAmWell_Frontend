import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { Feather } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import RenderHtml from "react-native-render-html";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomBar from "../../components/common/BottomBar";
import CommentSection from "../../components/advocacy/commentSection";
import { useArticle } from "../../hooks/useArticle";
import { useAuth } from "../../hooks/useAuth";
import { useAdvocacy } from "../../hooks/useAdvocacy";

type ArticleDetailRouteParams = { slug: string };
type ArticleDetailRouteProp = RouteProp<
  Record<string, ArticleDetailRouteParams>,
  "ArticleDetailScreen"
>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ArticleDetailScreen({
  route,
}: {
  route: ArticleDetailRouteProp;
}) {
  const navigation = useNavigation();
  const { slug } = route.params;
  const { darkMode, colors } = useTheme();
  const { isAuthenticated } = useAuth();

  const {
    article,
    loading: articleLoading,
    error: articleError,
  } = useArticle(slug);
  const { likeArticle } = useAdvocacy();
  const [commentCount, setCommentCount] = React.useState(0);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      educational: colors.success,
      "success-story": colors.info,
      "policy-brief": colors.warning,
      "community-resource": colors.secondary,
    };
    return colorMap[category] || colors.border;
  };

  const handleLikePress = async () => {
    if (!isAuthenticated || !article) {
      Toast.show({
        type: "error",
        text1: "Login Required",
        text2: "Please log in to like articles.",
      });
      return;
    }
    await likeArticle(article._id);
  };

  if (articleLoading) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (articleError || !article) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <Text style={{ color: colors.error, marginBottom: 20 }}>
          {articleError || "Article not found."}
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderArticleHeader = () => (
    <View>
      {article.featuredImage?.url && (
        <Image
          source={{ uri: article.featuredImage.url }}
          style={styles.featuredImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.contentContainer}>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: getCategoryColor(article.category) },
          ]}
        >
          <Text style={styles.categoryText}>
            {article.category.replace(/-/g, " ")}
          </Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {article.title}
        </Text>

        <View style={styles.metaRow}>
          <Feather name="user" size={16} color={colors.primary} />
          <Text style={[styles.authorText, { color: colors.textMuted }]}>
            {article.author.name}
            {article.author.role && ` • ${article.author.role}`}
          </Text>
          <Text style={[styles.divider, { color: colors.textMuted }]}>|</Text>
          <Feather name="clock" size={16} color={colors.primary} />
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {article.readTime ?? 0} min read
          </Text>
        </View>

        <Text style={[styles.dateText, { color: colors.textMuted }]}>
          Published on {formatDate(article.publishedAt)}
        </Text>

        <View style={styles.articleBody}>
          <RenderHtml
            contentWidth={SCREEN_WIDTH - 40}
            source={{ html: article.content }}
            baseStyle={{
              color: darkMode ? colors.text : "#333",
              fontSize: 16,
              lineHeight: 26,
            }}
          />
        </View>

        <View
          style={[styles.footerContainer, { borderTopColor: colors.border }]}
        >
          <View style={styles.footerItem}>
            <Feather name="eye" size={20} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted }}>
              {article.views ?? 0} Views
            </Text>
          </View>
          <TouchableOpacity style={styles.footerItem} onPress={handleLikePress}>
            <Feather name="heart" size={20} color={colors.like} />
            <Text style={{ color: colors.textMuted }}>
              {article.likes ?? 0} Likes
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={[]} // Empty data because comments handled inside CommentSection
        keyExtractor={(item, index) => index.toString()}
        renderItem={null}
        ListHeaderComponent={
          <>
            {renderArticleHeader()}
            <CommentSection
              articleId={article._id}
              onCommentCountChange={setCommentCount}
            />

          </>
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <BottomBar activeRoute={route.name} cartItemCount={0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  featuredImage: { width: "100%", height: 250, backgroundColor: "#F0F0F0" },
  contentContainer: { padding: 20 },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 10,
  },
  categoryText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 15 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  authorText: { fontSize: 14 },
  divider: { fontWeight: "bold" },
  metaText: { fontSize: 14 },
  dateText: { fontSize: 12, marginBottom: 20 },
  articleBody: { minHeight: 300 },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    marginTop: 20,
  },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  backButton: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "#D81E5B",
    borderRadius: 8,
  },
});

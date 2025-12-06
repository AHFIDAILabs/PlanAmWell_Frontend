// hooks/useAdvocacy.ts
import { useState, useEffect, useCallback } from 'react';
import advocacyService, { IAdvocacyArticle, IComment } from '../services/Advocacy';
import { useAuth } from './useAuth';
import Toast from 'react-native-toast-message';

// ==================== MAIN ADVOCACY HOOK ====================
export const useAdvocacy = () => {
  const [articles, setArticles] = useState<IAdvocacyArticle[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<IAdvocacyArticle[]>([]);
  const [recentArticles, setRecentArticles] = useState<IAdvocacyArticle[]>([]);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Fetch all articles with filters
  const fetchArticles = useCallback(
    async (params?: {
      category?: string;
      tag?: string;
      featured?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      try {
        setLoading(true);
        setError(null);
        const response = await advocacyService.getArticles(params);
        setArticles(response.data);
        setPagination(response.pagination);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch articles');
        console.error('Error fetching articles:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch featured articles
  const fetchFeaturedArticles = useCallback(async (limit: number = 3) => {
    try {
      setLoading(true);
      const response = await advocacyService.getFeaturedArticles(limit);
      setFeaturedArticles(response.data);
    } catch (err: any) {
      console.error('Error fetching featured articles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch recent articles
  const fetchRecentArticles = useCallback(async (limit: number = 5) => {
    try {
      const response = await advocacyService.getRecentArticles(limit);
      setRecentArticles(response.data);
    } catch (err: any) {
      console.error('Error fetching recent articles:', err);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await advocacyService.getCategories();
      setCategories(response.data);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    try {
      const response = await advocacyService.getTags();
      setTags(response.data);
    } catch (err: any) {
      console.error('Error fetching tags:', err);
    }
  }, []);

  // Search articles
  const searchArticles = useCallback(
    async (
      query: string,
      params?: {
        category?: string;
        tags?: string;
        page?: number;
        limit?: number;
      }
    ) => {
      try {
        setLoading(true);
        setError(null);
        const response = await advocacyService.searchArticles(query, params);
        setArticles(response.data);
        setPagination(response.pagination);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Search failed');
        Toast.show({
          type: 'error',
          text1: 'Search Error',
          text2: err.response?.data?.message || 'Failed to search articles',
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Like an article
  const likeArticle = useCallback(async (articleId: string) => {
    try {
      const response = await advocacyService.likeArticle(articleId);

      // Update article in all states
      const updateLikes = (article: IAdvocacyArticle) =>
        article._id === articleId ? { ...article, likes: response.data.likes } : article;

      setArticles((prev) => prev.map(updateLikes));
      setFeaturedArticles((prev) => prev.map(updateLikes));
      setRecentArticles((prev) => prev.map(updateLikes));

      Toast.show({
        type: 'success',
        text1: 'Liked!',
        text2: 'Article liked successfully',
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to like article',
      });
    }
  }, []);

  return {
    articles,
    featuredArticles,
    recentArticles,
    categories,
    tags,
    loading,
    error,
    pagination,
    fetchArticles,
    fetchFeaturedArticles,
    fetchRecentArticles,
    fetchCategories,
    fetchTags,
    searchArticles,
    likeArticle,
  };
};

// ==================== SINGLE ARTICLE HOOK ====================
export const useArticle = (slug: string) => {
  const [article, setArticle] = useState<IAdvocacyArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        setError(null);
        const response = await advocacyService.getArticleBySlug(slug);
        setArticle(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch article');
        console.error('Error fetching article:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug]);

  return { article, loading, error };
};

// ==================== COMMENTS HOOK ====================
export const useComments = (articleId: string) => {
  const [comments, setComments] = useState<IComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const { userToken } = useAuth();

  // Fetch comments
  const fetchComments = useCallback(
    async (page: number = 1) => {
      if (!articleId) return;

      try {
        setLoading(true);
        setError(null);
        const response = await advocacyService.getArticleComments(articleId, {
          page,
          limit: 20,
        });
        setComments(response.data);
        setPagination(response.pagination);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch comments');
        console.error('Error fetching comments:', err);
      } finally {
        setLoading(false);
      }
    },
    [articleId]
  );

  // Add comment
  const addComment = useCallback(
    async (content: string, parentCommentId?: string) => {
      try {
        const response = await advocacyService.addComment(
          articleId,
          content,
          parentCommentId,
          userToken || undefined
        );

        if (parentCommentId) {
          // Update parent comment's replies
          setComments((prev) =>
            prev.map((comment) =>
              comment._id === parentCommentId
                ? { ...comment, replies: [...(comment.replies || []), response.data] }
                : comment
            )
          );
        } else {
          // Add new top-level comment
          setComments((prev) => [response.data, ...prev]);
        }

        Toast.show({
          type: 'success',
          text1: 'Comment Added',
          text2: response.message,
        });

        return response.data;
      } catch (err: any) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: err.response?.data?.message || 'Failed to add comment',
        });
        throw err;
      }
    },
    [articleId, userToken]
  );

  // Edit comment
  const editComment = useCallback(
    async (commentId: string, content: string) => {
      if (!userToken) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Required',
          text2: 'Please log in to edit comments',
        });
        return;
      }

      try {
        const response = await advocacyService.editComment(commentId, content, userToken);

        // Update comment in nested structure
        const updateComment = (comments: IComment[]): IComment[] =>
          comments.map((comment) => {
            if (comment._id === commentId) {
              return response.data;
            }
            if (comment.replies && comment.replies.length > 0) {
              return { ...comment, replies: updateComment(comment.replies) };
            }
            return comment;
          });

        setComments((prev) => updateComment(prev));

        Toast.show({
          type: 'success',
          text1: 'Comment Updated',
          text2: response.message,
        });
      } catch (err: any) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: err.response?.data?.message || 'Failed to edit comment',
        });
      }
    },
    [userToken]
  );

  // Delete comment
  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!userToken) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Required',
          text2: 'Please log in to delete comments',
        });
        return;
      }

      try {
        await advocacyService.deleteComment(commentId, userToken);

        // Remove comment from nested structure
        const removeComment = (comments: IComment[]): IComment[] =>
          comments
            .filter((comment) => comment._id !== commentId)
            .map((comment) => ({
              ...comment,
              replies: comment.replies ? removeComment(comment.replies) : [],
            }));

        setComments((prev) => removeComment(prev));

        Toast.show({
          type: 'success',
          text1: 'Comment Deleted',
          text2: 'Comment removed successfully',
        });
      } catch (err: any) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: err.response?.data?.message || 'Failed to delete comment',
        });
      }
    },
    [userToken]
  );

  // Toggle comment like
  const toggleCommentLike = useCallback(
    async (commentId: string) => {
      if (!userToken) {
        Toast.show({
          type: 'error',
          text1: 'Authentication Required',
          text2: 'Please log in to like comments',
        });
        return;
      }

      try {
        const response = await advocacyService.toggleCommentLike(commentId, userToken);

        // Update likes in nested structure
        const updateLikes = (comments: IComment[]): IComment[] =>
          comments.map((comment) => {
            if (comment._id === commentId) {
              return { ...comment, likes: response.data.likes };
            }
            if (comment.replies && comment.replies.length > 0) {
              return { ...comment, replies: updateLikes(comment.replies) };
            }
            return comment;
          });

        setComments((prev) => updateLikes(prev));
      } catch (err: any) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to like comment',
        });
      }
    },
    [userToken]
  );

  // Flag comment
  const flagComment = useCallback(async (commentId: string, reason: string) => {
    try {
      await advocacyService.flagComment(commentId, reason);

      Toast.show({
        type: 'success',
        text1: 'Comment Flagged',
        text2: 'Thank you for reporting. We will review this comment.',
      });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to flag comment',
      });
    }
  }, []);

  // Auto-fetch comments on mount
  useEffect(() => {
    if (articleId) {
      fetchComments();
    }
  }, [articleId, fetchComments]);

  return {
    comments,
    loading,
    error,
    pagination,
    fetchComments,
    addComment,
    editComment,
    deleteComment,
    toggleCommentLike,
    flagComment,
  };
};
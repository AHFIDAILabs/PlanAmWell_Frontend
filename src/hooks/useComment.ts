// Hook for comments

import { useState, useEffect, useCallback } from 'react';
import advocacyService, {  IComment } from '../services/Advocacy';
import { useAuth } from './useAuth';
import Toast from 'react-native-toast-message';


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
const token = userToken ?? undefined; // normalize

  // Fetch comments
  const fetchComments = useCallback(
    async (page: number = 1) => {
      try {
        setLoading(true);
        setError(null);
        const response = await advocacyService.getArticleComments(articleId, { page, limit: 20 });
        setComments(response.data);
        setPagination(response.pagination);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch comments');
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
        const response = await advocacyService.addComment(articleId, content, parentCommentId, token);
        
        if (parentCommentId) {
          // Update parent comment's replies
          setComments((prev) =>
            prev.map((comment) =>
              comment._id === parentCommentId
                ? { ...comment, replies: [...comment.replies, response.data] }
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
        
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === commentId ? response.data : comment
          )
        );

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
        
        setComments((prev) => prev.filter((comment) => comment._id !== commentId));

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
        
        setComments((prev) =>
          prev.map((comment) =>
            comment._id === commentId
              ? { ...comment, likes: response.data.likes }
              : comment
          )
        );
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
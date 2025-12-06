import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useComments } from '../../hooks/useComment';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import CommentItem from './CommentItem';

interface CommentSectionProps {
  articleId: string;
  onCommentCountChange?: (count: number) => void; // optional callback
}

const CommentSection: React.FC<CommentSectionProps> = ({ articleId, onCommentCountChange }) => {
  const { comments, loading, pagination, addComment, fetchComments, toggleCommentLike, editComment, deleteComment, flagComment } = useComments(articleId);

  useEffect(() => {
    onCommentCountChange?.(pagination.total || 0);
  }, [pagination.total]);
 
  const { isAuthenticated, user } = useAuth();
  const { colors } = useTheme();

  const [newCommentText, setNewCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => { fetchComments(); }, [articleId]);

  const handleAddComment = async () => {
    if (!isAuthenticated) return Toast.show({ type: 'error', text1: 'Login Required' });
    if (!newCommentText.trim()) return;

    await addComment(newCommentText.trim(), replyingTo || undefined);
    setNewCommentText('');
    setReplyingTo(null);
  };

  const handleReply = (commentId: string, content: string) => {
    addComment(content, commentId);
  };

  const topLevelComments = comments.filter(c => c.depth === 0);

  return (
    <View style={[styles.mainContainer, { borderTopColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Comments ({pagination?.total || comments.length || 0})
      </Text>

      {/* New Comment Input */}
      <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
        {replyingTo && (
          <View style={styles.replyingToBanner}>
            <Text style={{ color: colors.textMuted }}>Replying to comment: {replyingTo}</Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Feather name="x-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          placeholder={isAuthenticated ? "Write your comment..." : "Log in to join the conversation"}
          placeholderTextColor={colors.textMuted}
          multiline
          value={newCommentText}
          onChangeText={setNewCommentText}
          editable={isAuthenticated}
        />
        <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleAddComment} disabled={!isAuthenticated || !newCommentText.trim()}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </View>

      {/* Comments List */}
      {loading && comments.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={topLevelComments}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              currentUserId={user?._id}
              onReply={handleReply}
              onLike={toggleCommentLike}
              onEdit={editComment}
              onDelete={deleteComment}
              onFlag={flagComment}
            />
          )}
          onEndReached={() => {
            if (!loading && pagination.page < pagination.pages) fetchComments(pagination.page + 1);
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={!loading ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Be the first to comment!</Text> : null}
        />
      )}

      {loading && comments.length > 0 && <ActivityIndicator size="small" color={colors.primary} />}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { paddingHorizontal: 20, paddingBottom: 50, borderTopWidth: 1, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15 },
  inputContainer: { padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1 },
  replyingToBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  textInput: { minHeight: 80, fontSize: 14, padding: 0, marginBottom: 10 },
  submitButton: { alignSelf: 'flex-end', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  submitButtonText: { color: '#FFF', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', paddingVertical: 50 },
});

export default CommentSection;

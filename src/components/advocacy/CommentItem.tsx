import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { IComment } from '../../services/Advocacy';

interface CommentItemProps {
  comment: IComment;
  currentUserId?: string;
  onReply: (commentId: string, content: string) => void;
  onLike: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onFlag: (commentId: string, reason: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onReply,
  onLike,
  onEdit,
  onDelete,
  onFlag,
}) => {
  const { darkMode } = useTheme();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editText, setEditText] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);

  const isOwner = currentUserId === comment.author.userId;
  const hasReplies = Array.isArray(comment.replies) && comment.replies.length > 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    onReply(comment._id, replyText.trim());
    setReplyText('');
    setIsReplying(false);
  };

  const handleEditSubmit = () => {
    if (editText.trim() && editText !== comment.content) {
      onEdit(comment._id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(comment._id) },
    ]);
  };

  const handleFlag = () => {
    Alert.alert('Flag Comment', 'Select reason', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Spam', onPress: () => onFlag(comment._id, 'Spam') },
      { text: 'Inappropriate', onPress: () => onFlag(comment._id, 'Inappropriate content') },
      { text: 'Harassment', onPress: () => onFlag(comment._id, 'Harassment or hate speech') },
    ]);
  };

  return (
    <View
      style={[
        styles.commentContainer,
        darkMode && styles.commentContainerDark,
        comment.depth > 0 && { marginLeft: 20, borderLeftWidth: 2, borderLeftColor: darkMode ? '#333' : '#E0E0E0' },
      ]}
    >
      {/* Header */}
      <View style={styles.commentHeader}>
        <View style={styles.authorRow}>
          <Text style={[styles.authorName, darkMode && styles.authorNameDark]}>{comment.author.name}</Text>
          <Text style={[styles.metaText, darkMode && styles.metaTextDark]}> • {formatDate(comment.createdAt)}</Text>
          {comment.isEdited && <Text style={[styles.metaText, darkMode && styles.metaTextDark]}> • edited</Text>}
        </View>

        <View style={styles.headerActions}>
          {isOwner ? (
            <>
              <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={styles.iconButton}>
                <Feather name="edit-2" size={14} color={darkMode ? '#B0B0B0' : '#666'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
                <Feather name="trash-2" size={14} color="#FF5252" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={handleFlag} style={styles.iconButton}>
              <Feather name="flag" size={14} color={darkMode ? '#B0B0B0' : '#666'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={[styles.input, darkMode && styles.inputDark]}
            value={editText}
            onChangeText={setEditText}
            multiline
            autoFocus
          />
          <View style={styles.editActions}>
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelButton}>
              <Text style={[styles.cancelText, darkMode && styles.cancelTextDark]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEditSubmit} style={styles.submitButton}>
              <Text style={styles.submitText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={[styles.commentContent, darkMode && styles.commentContentDark]}>{comment.content}</Text>
      )}

      {/* Footer Actions */}
      <View style={styles.commentFooter}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onLike(comment._id)}>
          <Feather name="heart" size={14} color={darkMode ? '#B0B0B0' : '#888'} />
          <Text style={[styles.actionText, darkMode && styles.actionTextDark]}>{comment.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => setIsReplying(!isReplying)}>
          <Feather name="message-circle" size={14} color={darkMode ? '#B0B0B0' : '#888'} />
          <Text style={[styles.actionText, darkMode && styles.actionTextDark]}>Reply</Text>
        </TouchableOpacity>

        {hasReplies && (
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowReplies(!showReplies)}>
            <Feather
              name={showReplies ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={darkMode ? '#B0B0B0' : '#888'}
            />
            <Text style={[styles.actionText, darkMode && styles.actionTextDark]}>
              {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Reply Input */}
      {isReplying && (
        <View style={styles.replyContainer}>
          <TextInput
            style={[styles.input, darkMode && styles.inputDark]}
            placeholder="Write a reply..."
            placeholderTextColor={darkMode ? '#666' : '#999'}
            value={replyText}
            onChangeText={setReplyText}
            multiline
            autoFocus
          />
          <View style={styles.replyActions}>
            <TouchableOpacity onPress={() => setIsReplying(false)} style={styles.cancelButton}>
              <Text style={[styles.cancelText, darkMode && styles.cancelTextDark]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleReplySubmit} style={styles.submitButton}>
              <Text style={styles.submitText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Nested Replies */}
      {hasReplies && showReplies && (
        <View style={styles.repliesContainer}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onLike={onLike}
              onEdit={onEdit}
              onDelete={onDelete}
              onFlag={onFlag}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  commentContainer: { padding: 12, backgroundColor: '#FFF', borderRadius: 8, marginBottom: 12 },
  commentContainerDark: { backgroundColor: '#1A1A1A' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  authorRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  authorName: { fontWeight: '600', fontSize: 14, color: '#1A1A1A' },
  authorNameDark: { color: '#FFF' },
  metaText: { fontSize: 12, color: '#666' },
  metaTextDark: { color: '#999' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: { padding: 4 },
  commentContent: { fontSize: 14, lineHeight: 20, color: '#333', marginBottom: 8 },
  commentContentDark: { color: '#E0E0E0' },
  commentFooter: { flexDirection: 'row', gap: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12, color: '#888' },
  actionTextDark: { color: '#B0B0B0' },
  replyContainer: { marginTop: 12 },
  editContainer: { marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 10, fontSize: 14, minHeight: 60, backgroundColor: '#FAFAFA', color: '#333' },
  inputDark: { borderColor: '#333', backgroundColor: '#0A0A0A', color: '#FFF' },
  replyActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelButton: { paddingVertical: 8, paddingHorizontal: 16 },
  cancelText: { color: '#666', fontSize: 14, fontWeight: '600' },
  cancelTextDark: { color: '#B0B0B0' },
  submitButton: { backgroundColor: '#D81E5B', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  submitText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  repliesContainer: { marginTop: 8 },
});

export default CommentItem;

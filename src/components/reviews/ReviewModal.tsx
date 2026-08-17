import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { reviewService } from "../../services/reviewService";

interface Props {
  visible: boolean;
  doctorId: string;
  doctorName: string;
  onClose: () => void;
  onSubmitted: (newAvgRating: number) => void;
}

export default function ReviewModal({ visible, doctorId, doctorName, onClose, onSubmitted }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setRating(0);
    setComment("");
    onClose();
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Toast.show({ type: "error", text1: "Please select a star rating" });
      return;
    }
    setSubmitting(true);
    try {
      const result = await reviewService.submit(doctorId, rating, comment);
      Toast.show({ type: "success", text1: "Review submitted!", text2: "Thank you for your feedback." });
      onSubmitted(result.newAvgRating);
      handleClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to submit review";
      Toast.show({ type: "error", text1: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.drag} />

          <View style={styles.header}>
            <Text style={styles.title}>Rate Dr. {doctorName}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Star picker */}
          <Text style={styles.label}>Your Rating</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                <Feather
                  name="star"
                  size={36}
                  color={star <= rating ? "#F59E0B" : "#D1D5DB"}
                  style={styles.star}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Comment */}
          <Text style={styles.label}>Your Comment (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Share your experience with this doctor..."
            placeholderTextColor="#9CA3AF"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>

          <TouchableOpacity
            style={[styles.submitBtn, (rating === 0 || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={rating === 0 || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.submitText}>Submit Review</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  drag: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111" },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  stars: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  star: { marginHorizontal: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#111",
    minHeight: 100,
    backgroundColor: "#F9FAFB",
  },
  charCount: { fontSize: 12, color: "#9CA3AF", textAlign: "right", marginTop: 4, marginBottom: 20 },
  submitBtn: {
    backgroundColor: "#D81E5B",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnDisabled: { backgroundColor: "#F9A8C4" },
  submitText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});

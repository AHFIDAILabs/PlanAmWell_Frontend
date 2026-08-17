import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, RouteProp, useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import Header from "../../components/home/header";
import BottomBar from "../../components/common/BottomBar";
import ReviewModal from "../../components/reviews/ReviewModal";
import { AppStackParamList } from "../../types/App";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getDoctorImageUri } from "../../services/Doctor";
import { reviewService } from "../../services/reviewService";
import socketService from "../../services/socketService";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";
import { IReview } from "../../types/backendType";

type DoctorScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, "DoctorScreen">;
type DoctorRouteProps = RouteProp<AppStackParamList, "DoctorScreen">;

const STAR_COLOR = "#F59E0B";
const PINK = "#D81E5B";

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather key={s} name="star" size={size} color={s <= Math.round(rating) ? STAR_COLOR : "#D1D5DB"} />
      ))}
    </View>
  );
}

export const DoctorScreen: React.FC = () => {
  const route = useRoute<DoctorRouteProps>();
  const navigation = useNavigation<DoctorScreenNavigationProp>();
  const doctor = route.params?.doctor;
  const { isAnonymous } = useAuth();
  const { lowDataMode } = useTheme();

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [liveRating, setLiveRating] = useState<number>(doctor?.ratings ?? 0);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const doctorPhone = (doctor?.phone || doctor?.contactNumber || "").replace(/\D/g, "");

  const loadReviews = useCallback(async () => {
    if (!doctor?._id) return;
    setReviewsLoading(true);
    try {
      const { reviews: fetched } = await reviewService.getDoctorReviews(doctor._id);
      setReviews(fetched);
    } catch (_) {
    } finally {
      setReviewsLoading(false);
    }
  }, [doctor?._id]);

  useEffect(() => {
    loadReviews();

    if (!isAnonymous && doctor?._id) {
      reviewService
        .checkCanReview(doctor._id)
        .then(({ canReview: can }) => setCanReview(can))
        .catch(() => {});
    }

    // Socket.IO: live rating updates when a new review is submitted
    const handleNewReview = (payload: { doctorId: string; review: IReview; newAvgRating: number }) => {
      if (payload.doctorId !== doctor?._id) return;
      setLiveRating(payload.newAvgRating);
      setReviews((prev) => [payload.review, ...prev]);
    };

    socketService.onNotification("doctor-new-review", handleNewReview);

    return () => {
      socketService.offNotification("doctor-new-review", handleNewReview);
    };
  }, [doctor?._id, isAnonymous, loadReviews]);

  const handleWhatsApp = () => {
    if (!doctorPhone) return;
    const msg = encodeURIComponent(
      `Hello Dr. ${doctor.lastName}, I found your profile on PlanAmWell and would like to book an appointment.`
    );
    Linking.openURL(`https://wa.me/${doctorPhone}?text=${msg}`).catch(() => {});
  };

  const handleBookPress = async () => {
    if (isAnonymous) {
      setShowRegisterModal(true);
      return;
    }
    navigation.navigate("BookAppointmentScreen", { doctor });
  };

  const handleRegister = () => {
    setShowRegisterModal(false);
    navigation.navigate("AuthStack", { screen: "Register" });
  };

  const handleReviewSubmitted = (newAvgRating: number) => {
    setLiveRating(newAvgRating);
    setCanReview(false);
    loadReviews();
  };

  const doctorImageUri = getDoctorImageUri(doctor);
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  return (
    <SafeAreaView style={StyleSheet.absoluteFill}>
      <Header />

      <ScrollView contentContainerStyle={styles.container}>
        <LinearGradient colors={["#D81E5B20", "#ffffff00"]} style={styles.headerBg} />

        {lowDataMode ? (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitials}>
              {doctor.firstName?.[0]}{doctor.lastName?.[0]}
            </Text>
          </View>
        ) : (
          <Image source={{ uri: doctorImageUri }} style={styles.avatar} />
        )}

        <Text style={styles.name}>{doctor.firstName} {doctor.lastName}</Text>
        <Text style={styles.specialty}>{doctor.specialization}</Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{doctor.yearsOfExperience || 0}+</Text>
            <Text style={styles.statLabel}>Years</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>1.2k</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{liveRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {lowDataMode && (
          <View style={styles.lowDataBadge}>
            <Text style={styles.lowDataBadgeText}>⚡ Low Data Mode — images hidden</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Bio</Text>
        <Text style={styles.about}>{doctor.bio || "No bio available."}</Text>

        {/* ── Reviews Section ─────────────────────────────── */}
        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>Patient Reviews</Text>
          {reviews.length > 0 && (
            <View style={styles.avgRow}>
              <StarRow rating={liveRating} size={16} />
              <Text style={styles.avgText}>{liveRating.toFixed(1)} ({reviews.length})</Text>
            </View>
          )}
        </View>

        {reviewsLoading ? (
          <ActivityIndicator size="small" color={PINK} style={{ marginVertical: 12 }} />
        ) : reviews.length === 0 ? (
          <Text style={styles.noReviews}>No reviews yet. Be the first!</Text>
        ) : (
          <>
            {displayedReviews.map((rev) => (
              <View key={rev._id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewInitials}>
                    <Text style={styles.reviewInitialsText}>{(rev.name || "P")[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{rev.name || "Patient"}</Text>
                    <StarRow rating={rev.rating} size={13} />
                  </View>
                  <Text style={styles.reviewDate}>
                    {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ""}
                  </Text>
                </View>
                {!!rev.comment && <Text style={styles.reviewComment}>{rev.comment}</Text>}
              </View>
            ))}
            {reviews.length > 3 && (
              <TouchableOpacity onPress={() => setShowAllReviews((v) => !v)} style={styles.showMoreBtn}>
                <Text style={styles.showMoreText}>
                  {showAllReviews ? "Show Less" : `Show All ${reviews.length} Reviews`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── Actions ─────────────────────────────── */}
        <TouchableOpacity style={styles.button} onPress={handleBookPress} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Book Appointment</Text>
        </TouchableOpacity>

        {!isAnonymous && canReview && (
          <TouchableOpacity style={styles.reviewBtn} onPress={() => setShowReviewModal(true)} activeOpacity={0.8}>
            <Feather name="star" size={16} color={PINK} style={{ marginRight: 6 }} />
            <Text style={styles.reviewBtnText}>Write a Review</Text>
          </TouchableOpacity>
        )}

        {!!doctorPhone && (
          <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp} activeOpacity={0.8}>
            <Text style={styles.whatsappBtnText}>💬  Contact via WhatsApp</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <BottomBar activeRoute="AllDoctorScreen" cartItemCount={0} />

      {/* ── Registration Modal ─────────────────────────────── */}
      <Modal visible={showRegisterModal} transparent animationType="fade" onRequestClose={() => setShowRegisterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Registration Required</Text>
            <Text style={styles.modalMessage}>You need to register to book an appointment.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: PINK }]} onPress={handleRegister}>
                <Text style={styles.modalButtonText}>Register Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: "#aaa" }]} onPress={() => setShowRegisterModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Review Modal ─────────────────────────────── */}
      <ReviewModal
        visible={showReviewModal}
        doctorId={doctor._id}
        doctorName={`${doctor.firstName} ${doctor.lastName}`}
        onClose={() => setShowReviewModal(false)}
        onSubmitted={handleReviewSubmitted}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: "center" },
  headerBg: { position: "absolute", top: 0, width: "100%", height: 250 },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 80,
    marginTop: 40,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "#D81E5B55",
  },
  avatarPlaceholder: {
    backgroundColor: "#FFE5EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 44, fontWeight: "700", color: PINK },
  name: { fontSize: 26, fontWeight: "700" },
  specialty: { fontSize: 16, color: "#555", marginBottom: 20 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
    marginTop: 10,
  },
  stat: { alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700", color: PINK },
  statLabel: { fontSize: 12, color: "#777" },

  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 25, alignSelf: "flex-start" },
  about: { fontSize: 15, color: "#555", lineHeight: 22, marginTop: 8, alignSelf: "flex-start" },

  lowDataBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  lowDataBadgeText: { fontSize: 11, color: "#F57C00", fontWeight: "600" },

  // Reviews
  reviewsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 4,
  },
  avgRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 26 },
  avgText: { fontSize: 13, color: "#555", fontWeight: "600" },
  noReviews: { fontSize: 14, color: "#999", marginVertical: 12, alignSelf: "flex-start" },
  reviewCard: {
    width: "100%",
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reviewInitials: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFE5EB",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewInitialsText: { fontSize: 14, fontWeight: "700", color: PINK },
  reviewName: { fontSize: 14, fontWeight: "600", color: "#222", marginBottom: 3 },
  reviewDate: { fontSize: 12, color: "#AAA" },
  reviewComment: { fontSize: 13, color: "#555", lineHeight: 19 },
  showMoreBtn: { marginTop: 8, alignSelf: "flex-start" },
  showMoreText: { fontSize: 14, color: PINK, fontWeight: "600" },

  // Buttons
  button: {
    backgroundColor: PINK,
    paddingVertical: 16,
    borderRadius: 16,
    width: "100%",
    marginTop: 30,
    alignItems: "center",
    shadowColor: PINK,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: PINK,
    borderRadius: 16,
    width: "100%",
    paddingVertical: 14,
    marginTop: 12,
  },
  reviewBtnText: { color: PINK, fontSize: 15, fontWeight: "600" },

  whatsappBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#25D366",
    borderRadius: 16,
    width: "100%",
    paddingVertical: 14,
    marginTop: 12,
  },
  whatsappBtnText: { color: "#25D366", fontSize: 15, fontWeight: "600" },

  // Registration modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  modalMessage: { fontSize: 15, color: "#555", textAlign: "center", marginBottom: 20 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: "center",
  },
  modalButtonText: { color: "#fff", fontWeight: "600" },
});

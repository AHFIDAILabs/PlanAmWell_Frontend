import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useDoctors } from "../../hooks/useDoctor";
import BottomBar from "../../components/common/BottomBar";

// Real, server-computed next open slot (backend/src/services/doctorAvailability.ts)
// — replaces a previous hardcoded "Mon, Oct 25, 9:00 AM" shown for every
// doctor regardless of reality.
function formatNextAvailable(iso?: string | null): string {
  if (!iso) return "No upcoming slots";
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return `${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}, ${time}`;
}

export default function AllDoctorsScreen({ navigation }: any) {
  const { doctors, loading, error } = useDoctors();
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  // ---- Filtered Doctors ----
  const filtered = useMemo(() => {
    let list = doctors;

    // Text search
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (doc) =>
          `${doc.firstName} ${doc.lastName}`.toLowerCase().includes(s) ||
          doc.specialization?.toLowerCase().includes(s)
      );
    }

    // Specialty filter
    if (selectedSpecialty) {
      list = list.filter((doc) => doc.specialization === selectedSpecialty);
    }

    return list;
  }, [search, doctors, selectedSpecialty]);

  // --- Get unique specialties for filter options ---
  const specialties = useMemo(() => {
    const set = new Set(doctors.map((doc) => doc.specialization));
    return Array.from(set);
  }, [doctors]);

  const renderDoctorCard = ({ item }: any) => {
    const imageUri =
      typeof item.profileImage === "string" ? item.profileImage : item.doctorImage?.imageUrl;

    const avatarSource = imageUri
      ? { uri: imageUri }
      : { uri: "https://placehold.co/150x150?text=No+Image" };

   const handleBookPress = () => {
  navigation.navigate("BookAppointmentScreen", {
    doctor: {
      ...item,
      _id: item._id || item.id // Ensure we catch both naming conventions
    } 
  });
};

    return (
      <TouchableOpacity
        style={styles.doctorCard}
        onPress={() => navigation.navigate("DoctorScreen", { doctor: item })}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <Image source={avatarSource} style={styles.doctorImage} />
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName} numberOfLines={1}>
              Dr. {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.specialty} numberOfLines={1}>
              {item.specialization}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFA500" />
              <Text style={styles.ratingText}>{item.ratings?.toFixed(1) || "N/A"}</Text>
              <Text style={styles.reviewCount}>({item.reviewCount ?? 0} reviews)</Text>
            </View>
            <Text style={styles.availability}>
              Next available: {formatNextAvailable(item.nextAvailable)}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.bookButton} onPress={handleBookPress}>
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <LinearGradient
        colors={["#E8F4FD", "#ffffff"]}
        style={styles.headerBg}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find a Doctor</Text>
        <Text style={styles.subtitle}>Search doctors, specialties, and more</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            placeholder="Search doctors or specialties..."
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <FlatList
          data={specialties}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => {
            const active = selectedSpecialty === item;
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedSpecialty(active ? null : item)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
          ListHeaderComponent={
            <TouchableOpacity
              style={[styles.chip, !selectedSpecialty && styles.chipActive]}
              onPress={() => setSelectedSpecialty(null)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, !selectedSpecialty && styles.chipTextActive]}>All</Text>
            </TouchableOpacity>
          }
        />
      </View>

      <View style={styles.contentContainer}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#D81E5B" />
          </View>
        )}

        {!loading && (
          <FlatList
            data={filtered}
            contentContainerStyle={styles.list}
            keyExtractor={(item) => item._id}
            renderItem={renderDoctorCard}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#ccc" />
                <Text style={styles.noResultsText}>
                  {error ? "Couldn't load doctors" : "No doctors match your search"}
                </Text>
                <Text style={styles.noResultsSubtext}>
                  {error ?? "Try adjusting your search criteria"}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      <BottomBar activeRoute="AllDoctorScreen" cartItemCount={0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  headerBg: { position: "absolute", top: 0, width: "100%", height: 280 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: "700", color: "#1A1A1A" },
  subtitle: { fontSize: 14, color: "#555", marginBottom: 16 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: "#1A1A1A" },
  chipsRow: { gap: 8, marginTop: 14 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#D81E5B", borderColor: "#D81E5B" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#555" },
  chipTextActive: { color: "#fff" },
  contentContainer: { flex: 1, paddingHorizontal: 20 },
  list: { paddingTop: 8, paddingBottom: 100 },
  doctorCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: "#F0F0F0" },
  cardContent: { flexDirection: "row", marginBottom: 12 },
  doctorImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: "#f5f5f5" },
  doctorInfo: { flex: 1, marginLeft: 12, justifyContent: "center" },
  doctorName: { fontSize: 16, fontWeight: "600", color: "#1A1A1A", marginBottom: 4 },
  specialty: { fontSize: 14, color: "#555", marginBottom: 6 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  ratingText: { fontSize: 14, fontWeight: "600", color: "#1A1A1A", marginLeft: 4 },
  reviewCount: { fontSize: 13, color: "#777", marginLeft: 4 },
  availability: { fontSize: 13, color: "#555" },
  bookButton: { backgroundColor: "#D81E5B", borderRadius: 10, paddingVertical: 14, alignItems: "center", minHeight: 48, justifyContent: "center" },
  bookButtonText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  noResultsText: { fontSize: 18, fontWeight: "600", color: "#666", marginTop: 16, textAlign: "center" },
  noResultsSubtext: { fontSize: 14, color: "#999", marginTop: 8, textAlign: "center" },
});
